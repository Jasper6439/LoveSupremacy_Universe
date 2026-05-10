"""
AI 调用统一模块
整合 bot.py 和 chat_engine.py 中重复的 AI API 调用逻辑，
提供统一的模型列表、fallback 机制和异步 HTTP 调用。
"""
import os
import json
import logging
from typing import Dict, List, Optional, Any

import httpx

logger = logging.getLogger(__name__)

# ── AI API 配置 ──────────────────────────────────────────────
AI_API_BASE = os.environ.get("AI_API_BASE", "https://openrouter.ai/api/v1")
AI_API_KEY = os.environ.get("AI_API_KEY", "")
AI_MODEL = os.environ.get("AI_MODEL", "minimax/minimax-m2.5:free")

# ── 统一的模型列表（合并两处，去重） ──────────────────────────
FALLBACK_MODELS: List[str] = [
    "minimax/minimax-m2.5:free",
    "google/gemma-4-31b-it:free",
    "tencent/hy3-preview:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "aion-labs/aion-rp-llama-3.1-8b:free",
    "openrouter/free",
]

# ── 默认参数 ─────────────────────────────────────────────────
DEFAULT_TEMPERATURE = 0.85
DEFAULT_MAX_TOKENS = 300
DEFAULT_TIMEOUT = 60.0
MAX_HISTORY_MESSAGES = 20


def _load_api_config() -> tuple:
    """从环境变量和配置文件中读取 API 配置。

    Returns:
        (api_key, api_base) 元组
    """
    api_key = AI_API_KEY
    api_base = AI_API_BASE

    # 动态读取最新配置（兼容 DATA_DIR 下 config.json）
    try:
        config_path = os.path.join(
            os.environ.get('DATA_DIR', '/opt/NxSiran/data'), 'config.json'
        )
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                cfg = json.load(f)
            if cfg.get('ai_api_key'):
                api_key = cfg['ai_api_key']
            if cfg.get('ai_api_base'):
                api_base = cfg['ai_api_base']
    except Exception:
        pass

    return api_key, api_base


async def call_ai(
    system_prompt: str,
    user_message: str,
    chat_history: Optional[List[Dict]] = None,
    model: Optional[str] = None,
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    timeout: float = DEFAULT_TIMEOUT,
    response_format: Optional[Dict[str, Any]] = None,
    tools: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """统一的 AI API 调用函数，支持模型 fallback。

    Args:
        system_prompt: 系统提示词
        user_message: 用户消息
        chat_history: 对话历史列表（每项为 {"role": ..., "content": ...}）
        model: 指定使用的模型，为 None 时按 FALLBACK_MODELS 顺序尝试
        temperature: 生成温度
        max_tokens: 最大生成 token 数
        timeout: HTTP 请求超时秒数
        response_format: 可选的响应格式（如 {"type": "json_object"}）
        tools: 可选的工具列表（用于 function calling）

    Returns:
        AI 回复文本

    Raises:
        ValueError: API Key 未配置
        RuntimeError: 所有模型均调用失败
    """
    # 构建 messages 列表
    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]

    if chat_history:
        messages.extend(chat_history[-MAX_HISTORY_MESSAGES:])

    messages.append({"role": "user", "content": user_message})

    # 确定要尝试的模型列表
    if model:
        models_to_try = [model]
    else:
        models_to_try = [AI_MODEL] + [m for m in FALLBACK_MODELS if m != AI_MODEL]

    api_key, api_base = _load_api_config()

    if not api_key:
        raise ValueError("AI_API_KEY not set")

    last_error: Optional[str] = None

    for current_model in models_to_try:
        try:
            result = await _make_api_request(
                api_base=api_base,
                api_key=api_key,
                model=current_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
                response_format=response_format,
                tools=tools,
            )
            if result:
                if current_model != models_to_try[0]:
                    logger.info(f"Fallback model {current_model} succeeded")
                return result

        except httpx.TimeoutException:
            logger.warning(f"Model {current_model} timed out, trying next")
            last_error = "timeout"
            continue
        except httpx.HTTPStatusError as e:
            logger.warning(f"Model {current_model} returned HTTP {e.response.status_code}, trying next")
            last_error = f"HTTP {e.response.status_code}"
            continue
        except Exception as e:
            logger.warning(f"Model {current_model} failed: {e}, trying next")
            last_error = str(e)
            continue

    logger.error(f"All AI models failed. Last error: {last_error}")
    raise RuntimeError(f"All AI models failed. Last error: {last_error}")


async def _make_api_request(
    api_base: str,
    api_key: str,
    model: str,
    messages: List[Dict],
    temperature: float,
    max_tokens: int,
    timeout: float,
    response_format: Optional[Dict] = None,
    tools: Optional[List[Dict]] = None,
) -> Optional[str]:
    """发送单次 API 请求到 OpenRouter 兼容接口。

    Returns:
        AI 回复文本，失败时返回 None
    """
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    if response_format:
        payload["response_format"] = response_format
    if tools:
        payload["tools"] = tools

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{api_base}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()

        data = response.json()

        if "choices" not in data or not data["choices"]:
            logger.warning(f"Model {model} returned no choices")
            return None

        content = data["choices"][0]["message"]["content"]
        if not content or not content.strip():
            logger.warning(f"Model {model} returned empty content")
            return None

        return content.strip()
