"""
AI 竞争模块 - v1.4.12.13
多个 AI 模型竞争生成最佳回复，通过 Qdrant 缓存相似问题的回复。
"""

import json
import logging
import os
import time
import asyncio
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# 竞争模型列表（免费模型）
COMPETE_MODELS = [
    "deepseek/deepseek-chat-v3-0324:free",
    "minimax/minimax-m2.5:free",
    "nousresearch/hermes-4-405b:free",
]

# 权重持久化文件
WEIGHTS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "ai_weights.json")

# 评委模型（独立于竞争模型，避免既当选手又当裁判）
JUDGE_MODEL = "google/gemma-4-31b-it:free"
JUDGE_PROMPT = """你是一个评委，需要从三个AI角色的回复中选出最好的一个。

角色设定：车如云，一个傲娇但内心温柔的韩国女生。说话极简短，用"..."开头，可能带括号动作描写，不直接表达正面情感，用平语。

用户说："{user_message}"

候选回复：
A: {reply_a}
B: {reply_b}
C: {reply_c}

评判标准：
1. 是否符合车如云的人设（傲娇、简短、平语）
2. 回复是否自然、不生硬
3. 是否有角色特色（...开头、括号动作）

请只回复一个字母（A/B/C），不要任何其他内容。"""

# 缓存配置
CACHE_SIMILARITY_THRESHOLD = 0.92  # 语义相似度阈值，超过则直接使用缓存


def _load_weights() -> Dict[str, float]:
    """加载模型权重"""
    try:
        if os.path.exists(WEIGHTS_FILE):
            with open(WEIGHTS_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"[AI竞争] 加载权重失败: {e}")
    # 默认权重
    return {model: 1.0 for model in COMPETE_MODELS}


def _save_weights(weights: Dict[str, float]):
    """保存模型权重"""
    try:
        os.makedirs(os.path.dirname(WEIGHTS_FILE), exist_ok=True)
        with open(WEIGHTS_FILE, 'w') as f:
            json.dump(weights, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"[AI竞争] 保存权重失败: {e}")


def update_model_weight(model: str, delta: float = 0.1):
    """更新模型权重（获胜加分，失败减分，最低0.1）"""
    weights = _load_weights()
    weights[model] = max(0.1, weights.get(model, 1.0) + delta)
    _save_weights(weights)
    logger.info(f"[AI竞争] 权重更新: {model} -> {weights[model]:.2f}")


def get_model_weights() -> Dict[str, float]:
    """获取当前模型权重"""
    return _load_weights()


async def _call_single_model(model: str, system_prompt: str, user_message: str,
                              chat_history: Optional[List[Dict]] = None) -> Optional[str]:
    """调用单个模型"""
    try:
        from ai_client import call_ai
        response = await call_ai(
            system_prompt=system_prompt,
            user_message=user_message,
            chat_history=chat_history,
            model=model,
            temperature=0.85,
            max_tokens=300,
            timeout=45.0,
        )
        return response
    except Exception as e:
        logger.warning(f"[AI竞争] 模型 {model} 失败: {e}")
        return None


async def _search_cache(user_message: str) -> Optional[str]:
    """在 Qdrant 中搜索相似问题的缓存回复"""
    try:
        from qdrant_memory import QdrantMemoryManager
        mgr = QdrantMemoryManager(collection_prefix="ai_cache")
        results = await mgr.search_memories(user_message, n_results=1)
        if results and results[0].get("distance", 1.0) < (1.0 - CACHE_SIMILARITY_THRESHOLD):
            cached = results[0].get("content", "")
            if cached:
                logger.info(f"[AI竞争] 缓存命中: 相似度 {1.0 - results[0]['distance']:.3f}")
                return cached
    except Exception as e:
        logger.debug(f"[AI竞争] 缓存搜索失败: {e}")
    return None


async def _save_to_cache(user_message: str, best_reply: str, winning_model: str):
    """保存最佳回复到缓存"""
    try:
        from qdrant_memory import QdrantMemoryManager
        mgr = QdrantMemoryManager(collection_prefix="ai_cache")
        await mgr.add_memory(
            content=best_reply,
            metadata={
                "user_message_preview": user_message[:100],
                "model": winning_model,
                "type": "ai_competition_cache",
            }
        )
        logger.info(f"[AI竞争] 回复已缓存")
    except Exception as e:
        logger.debug(f"[AI竞争] 缓存保存失败: {e}")


async def _judge_replies(user_message: str, replies: Dict[str, str],
                         system_prompt: str) -> Tuple[str, str]:
    """让 AI 评比回复，返回 (winning_model, best_reply)"""
    # 构建评比请求
    judge_request = JUDGE_PROMPT.format(
        user_message=user_message[:200],
        reply_a=replies.get(COMPETE_MODELS[0], "（无回复）"),
        reply_b=replies.get(COMPETE_MODELS[1], "（无回复）"),
        reply_c=replies.get(COMPETE_MODELS[2], "（无回复）"),
    )

    try:
        from ai_client import call_ai
        judge_result = await call_ai(
            system_prompt="你是一个客观的评委，只回复一个字母。",
            user_message=judge_request,
            model=JUDGE_MODEL,  # 用独立模型做评委
            temperature=0.3,
            max_tokens=10,
            timeout=30.0,
        )

        # 解析评委结果
        result = judge_result.strip().upper()
        model_map = {'A': COMPETE_MODELS[0], 'B': COMPETE_MODELS[1], 'C': COMPETE_MODELS[2]}

        if result in model_map:
            winning_model = model_map[result]
            best_reply = replies[winning_model]
            logger.info(f"[AI竞争] 评委选择: {result} ({winning_model})")
            return winning_model, best_reply
        else:
            # 解析失败，按权重随机选
            logger.warning(f"[AI竞争] 评委结果无法解析: {result}")
    except Exception as e:
        logger.warning(f"[AI竞争] 评比失败: {e}")

    # fallback: 按权重随机选择
    weights = _load_weights()
    valid_replies = {m: r for m, r in replies.items() if r}
    if not valid_replies:
        return COMPETE_MODELS[0], ""

    weighted = []
    for model, reply in valid_replies.items():
        w = weights.get(model, 1.0)
        weighted.extend([model] * max(1, int(w * 10)))

    winning_model = random.choice(weighted) if weighted else list(valid_replies.keys())[0]
    return winning_model, valid_replies[winning_model]


async def compete_reply(system_prompt: str, user_message: str,
                        chat_history: Optional[List[Dict]] = None) -> str:
    """
    AI 竞争入口：多个模型并行生成，评比后返回最佳回复。
    优先使用 Qdrant 缓存。
    """
    # 1. 先查缓存
    cached = await _search_cache(user_message)
    if cached:
        return cached

    # 2. 并行调用所有竞争模型
    tasks = {
        model: _call_single_model(model, system_prompt, user_message, chat_history)
        for model in COMPETE_MODELS
    }
    results = await asyncio.gather(*tasks.values(), return_exceptions=True)

    replies = {}
    for model, result in zip(tasks.keys(), results):
        if isinstance(result, Exception):
            logger.warning(f"[AI竞争] {model} 异常: {result}")
        elif result and len(result.strip()) > 0:
            # 过滤提示词泄露
            leak_kw = ['respond as', 'following the style', 'We need to respond', 'calling user']
            if not any(kw in result for kw in leak_kw):
                replies[model] = result.strip()
            else:
                logger.warning(f"[AI竞争] {model} 提示词泄露，已排除")

    if not replies:
        logger.error("[AI竞争] 所有模型都失败了")
        return ""

    # 3. 如果只有一个模型成功，直接用
    if len(replies) == 1:
        winning_model = list(replies.keys())[0]
        best_reply = replies[winning_model]
    else:
        # 4. 多个成功，进行评比
        winning_model, best_reply = await _judge_replies(user_message, replies, system_prompt)

    # 5. 更新权重：获胜 +0.1，失败 -0.05
    update_model_weight(winning_model, 0.1)
    for model in replies:
        if model != winning_model:
            update_model_weight(model, -0.05)

    # 6. 缓存最佳回复
    await _save_to_cache(user_message, best_reply, winning_model)

    logger.info(f"[AI竞争] 获胜: {winning_model} | 回复: {best_reply[:50]}...")
    return best_reply
