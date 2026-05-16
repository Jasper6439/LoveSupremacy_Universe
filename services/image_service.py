"""
图像生成服务模块 - 意图驱动的多模态生图
=====================================
当用户发送带有视觉意图的消息时（如"想看看你在干嘛"、"发张照片"），
自动理解语境并生成符合场景的图片。

三级路由架构:
1. OpenRouter 免费模型 (flux-1-schnell:free)
2. 商汤 SenseNova U1 Fast (兜底)
3. SiliconFlow (备选)

用法:
    from services.image_service import generate_image_from_context
    
    image_path = await generate_image_from_context(chat_history, user_id)
"""

import os
import logging
import base64
import asyncio
import re
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime

import aiohttp

from system.config import (
    DATA_DIR, 
    AI_API_BASE, 
    AI_API_KEY,
)

logger = logging.getLogger(__name__)

# ============================================================
# 配置区域
# ============================================================

# 图像缓存目录
IMAGE_CACHE_DIR = os.path.join(DATA_DIR, "generated_images")
os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)

# 三级路由配置
IMAGE_MODELS = {
    "primary": {
        "provider": "openrouter",
        "model": "black-forest-labs/flux-1-schnell:free",
        "api_base": "https://openrouter.ai/api/v1",
        "api_key": AI_API_KEY,  # 使用主 API Key
    },
    "fallback": {
        "provider": "sensenova",
        "model": "SenseNova U1 Fast",
        "api_base": "https://api.siliconflow.cn/v1",  # 商汤 API
        "api_key": os.environ.get("SENSENOVA_API_KEY", ""),
    },
    "backup": {
        "provider": "siliconflow",
        "model": "black-forest-labs/FLUX.1-schnell",
        "api_base": "https://api.siliconflow.cn/v1",
        "api_key": os.environ.get("SILICONFLOW_API_KEY", ""),
    }
}

# 意图识别关键词
VISUAL_INTENT_KEYWORDS = [
    r"想看.*你在.*干嘛",
    r"发张.*照片",
    r"发.*自拍",
    r"让我看看.*你",
    r"看看.*样子",
    r"想看.*照片",
    r"给我.*图片",
    r"发个.*照",
    r"看看.*在干嘛",
    r"你在哪",
    r"你在干什么",
    r"想看.*表情",
    r"发.*自拍",
]

# 场景-提示词映射
SCENE_PROMPTS = {
    "daily_life": "A cute anime girl in casual clothes, doing daily activities at home, warm lighting, cozy atmosphere, high quality, detailed",
    "cooking": "A cute anime girl in an apron, cooking in a kitchen, delicious food on the counter, warm kitchen lighting, detailed",
    "farming": "A cute anime girl in a sun hat, working in a beautiful farm field with crops and flowers, sunny day, pastoral scenery",
    "relaxing": "A cute anime girl relaxing on a sofa, reading a book or using phone, cozy living room, soft lighting",
    "outdoor": "A cute anime girl walking in a beautiful park or garden, cherry blossoms, spring atmosphere, detailed background",
    "selfie": "A cute anime girl taking a selfie, phone in hand, making a sweet expression, soft lighting, close-up",
    "default": "A cute anime girl with a warm smile, beautiful detailed eyes, soft lighting, high quality anime style illustration",
}

# 请求超时
IMAGE_TIMEOUT = 60


class ImageService:
    """
    意图驱动的图像生成服务
    
    功能:
    1. 检测用户消息中的视觉意图
    2. 根据对话上下文生成合适的 Prompt
    3. 调用生图模型生成图片
    4. 支持三级路由降级
    """
    
    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """获取或创建 HTTP 会话"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=IMAGE_TIMEOUT)
            )
        return self._session
    
    def detect_visual_intent(self, message: str) -> Tuple[bool, str]:
        """
        检测消息中是否包含视觉意图
        
        Args:
            message: 用户消息
        
        Returns:
            (是否包含视觉意图, 匹配的场景类型)
        """
        message = message.lower().strip()
        
        for pattern in VISUAL_INTENT_KEYWORDS:
            if re.search(pattern, message):
                # 根据关键词判断场景
                if any(kw in message for kw in ["做饭", "煮", "cook"]):
                    return True, "cooking"
                elif any(kw in message for kw in ["农场", "种", "farm"]):
                    return True, "farming"
                elif any(kw in message for kw in ["自拍", "selfie"]):
                    return True, "selfie"
                elif any(kw in message for kw in ["休息", "躺", "relax"]):
                    return True, "relaxing"
                elif any(kw in message for kw in ["外面", "公园", "outdoor"]):
                    return True, "outdoor"
                else:
                    return True, "daily_life"
        
        return False, ""
    
    def generate_prompt_from_context(
        self, 
        chat_history: List[Dict[str, Any]],
        scene: str = "default"
    ) -> str:
        """
        根据对话上下文生成图像提示词
        
        Args:
            chat_history: 对话历史
            scene: 场景类型
        
        Returns:
            生成的提示词
        """
        # 基础提示词
        base_prompt = SCENE_PROMPTS.get(scene, SCENE_PROMPTS["default"])
        
        # 尝试从上下文提取额外信息
        context_hints = []
        
        for msg in chat_history[-5:]:  # 最近 5 条消息
            content = msg.get("content", "").lower()
            
            # 检测情感状态
            if any(kw in content for kw in ["开心", "高兴", "happy", "喜欢"]):
                context_hints.append("happy expression, smiling")
            elif any(kw in content for kw in ["难过", "伤心", "sad", "哭"]):
                context_hints.append("slightly sad expression")
            
            # 检测活动
            if any(kw in content for kw in ["做饭", "煮"]):
                context_hints.append("cooking")
            elif any(kw in content for kw in ["看书", "读书"]):
                context_hints.append("reading a book")
        
        # 组合提示词
        if context_hints:
            return f"{base_prompt}, {', '.join(context_hints[-2:])}"
        
        return base_prompt
    
    async def generate_image(
        self,
        prompt: str,
        model_tier: str = "primary"
    ) -> Optional[str]:
        """
        调用生图模型生成图片
        
        Args:
            prompt: 图像提示词
            model_tier: 模型层级 (primary, fallback, backup)
        
        Returns:
            图片文件路径，失败返回 None
        """
        config = IMAGE_MODELS.get(model_tier)
        if not config:
            logger.error(f"[Image] 未知的模型层级: {model_tier}")
            return None
        
        api_key = config["api_key"]
        if not api_key:
            logger.warning(f"[Image] {config['provider']} API Key 未配置")
            # 尝试降级
            if model_tier == "primary":
                return await self.generate_image(prompt, "fallback")
            elif model_tier == "fallback":
                return await self.generate_image(prompt, "backup")
            return None
        
        try:
            session = await self._get_session()
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            
            # OpenRouter / SiliconFlow API 格式
            payload = {
                "model": config["model"],
                "prompt": prompt,
                "width": 512,
                "height": 512,
                "steps": 4,  # flux-schnell 只需 4 步
                "n": 1,
            }
            
            logger.info(f"[Image] 调用 {config['provider']}: {config['model']}")
            
            async with session.post(
                f"{config['api_base']}/images/generations",
                headers=headers,
                json=payload
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # 解析响应
                    if "data" in data and len(data["data"]) > 0:
                        image_data = data["data"][0]
                        
                        # 可能是 base64 或 URL
                        if "b64_json" in image_data:
                            image_bytes = base64.b64decode(image_data["b64_json"])
                        elif "url" in image_data:
                            # 下载图片
                            async with session.get(image_data["url"]) as img_resp:
                                image_bytes = await img_resp.read()
                        else:
                            logger.error(f"[Image] 未知的响应格式: {image_data.keys()}")
                            return None
                        
                        # 保存图片
                        output_path = self._get_cache_path(config["provider"])
                        with open(output_path, "wb") as f:
                            f.write(image_bytes)
                        
                        logger.info(f"[Image] 生成成功: {output_path}")
                        return output_path
                    else:
                        logger.error(f"[Image] 响应无图片数据: {data}")
                        return None
                        
                elif resp.status == 429:
                    # 限流，尝试降级
                    logger.warning(f"[Image] {config['provider']} 限流，尝试降级")
                    if model_tier == "primary":
                        return await self.generate_image(prompt, "fallback")
                    elif model_tier == "fallback":
                        return await self.generate_image(prompt, "backup")
                    return None
                    
                else:
                    error_text = await resp.text()
                    logger.error(f"[Image] API 错误 {resp.status}: {error_text}")
                    return None
                    
        except aiohttp.ClientError as e:
            logger.error(f"[Image] 连接失败: {e}")
            # 尝试降级
            if model_tier == "primary":
                return await self.generate_image(prompt, "fallback")
            return None
            
        except Exception as e:
            logger.error(f"[Image] 生成异常: {e}")
            return None
    
    def _get_cache_path(self, provider: str) -> str:
        """生成缓存文件路径"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"img_{provider}_{timestamp}.png"
        return os.path.join(IMAGE_CACHE_DIR, filename)
    
    async def close(self):
        """关闭 HTTP 会话"""
        if self._session and not self._session.closed:
            await self._session.close()


# ============================================================
# 便捷函数
# ============================================================

_image_service: Optional[ImageService] = None


def get_image_service() -> ImageService:
    """获取全局图像服务实例"""
    global _image_service
    if _image_service is None:
        _image_service = ImageService()
    return _image_service


async def generate_image_from_context(
    chat_history: List[Dict[str, Any]],
    user_message: str = ""
) -> Optional[str]:
    """
    根据对话上下文生成图片（便捷函数）
    
    Args:
        chat_history: 对话历史
        user_message: 用户最新消息
    
    Returns:
        图片文件路径
    """
    service = get_image_service()
    
    # 检测视觉意图
    has_intent, scene = service.detect_visual_intent(user_message)
    
    if not has_intent:
        return None
    
    # 生成提示词
    prompt = service.generate_prompt_from_context(chat_history, scene)
    
    logger.info(f"[Image] 检测到视觉意图，场景: {scene}")
    logger.info(f"[Image] 生成提示词: {prompt}")
    
    # 生成图片
    return await service.generate_image(prompt)


async def check_and_generate_image(
    message: str,
    chat_history: List[Dict[str, Any]]
) -> Tuple[bool, Optional[str]]:
    """
    检查消息是否需要生成图片，并生成
    
    Args:
        message: 用户消息
        chat_history: 对话历史
    
    Returns:
        (是否生成, 图片路径)
    """
    service = get_image_service()
    
    has_intent, scene = service.detect_visual_intent(message)
    
    if not has_intent:
        return False, None
    
    prompt = service.generate_prompt_from_context(chat_history, scene)
    image_path = await service.generate_image(prompt)
    
    return True, image_path


# ============================================================
# FastAPI 集成
# ============================================================

async def send_image_to_telegram(
    bot,
    chat_id: int,
    image_path: str,
    caption: str = "📸"
) -> bool:
    """
    发送图片到 Telegram
    
    Args:
        bot: Telegram Bot 实例
        chat_id: 聊天 ID
        image_path: 图片路径
        caption: 图片说明
    
    Returns:
        是否发送成功
    """
    if not os.path.exists(image_path):
        logger.error(f"[Image] 图片不存在: {image_path}")
        return False
    
    try:
        await bot.send_chat_action(chat_id=chat_id, action="upload_photo")
        
        with open(image_path, "rb") as f:
            await bot.send_photo(
                chat_id=chat_id,
                photo=f,
                caption=caption
            )
        
        logger.info(f"[Image] 图片发送成功: chat_id={chat_id}")
        return True
        
    except Exception as e:
        logger.error(f"[Image] 发送图片失败: {e}")
        return False


# ============================================================
# 测试
# ============================================================

async def test_image_service():
    """测试图像生成服务"""
    service = ImageService()
    
    # 测试意图检测
    test_messages = [
        "想看看你在干嘛",
        "发张照片给我",
        "你在干什么呀",
        "想看你的自拍",
    ]
    
    for msg in test_messages:
        has_intent, scene = service.detect_visual_intent(msg)
        print(f"'{msg}' -> 意图: {has_intent}, 场景: {scene}")
    
    # 测试生成
    prompt = SCENE_PROMPTS["selfie"]
    print(f"\n测试生成图片: {prompt}")
    
    result = await service.generate_image(prompt)
    
    if result:
        print(f"✅ 生成成功: {result}")
        print(f"   文件大小: {os.path.getsize(result)} bytes")
    else:
        print("❌ 生成失败")
    
    await service.close()


if __name__ == "__main__":
    asyncio.run(test_image_service())
