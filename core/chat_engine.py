"""
core/chat_engine.py - 统一聊天引擎 (v1.7)
==========================================
Web 端和 Telegram 端共用此引擎。
确保两端的记忆、性格、情绪完全一致。
"""

import logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)


class ChatEngine:
    """统一聊天引擎。

    Web API 和 Telegram Bot 共用此类进行对话。
    确保两端的记忆、性格、情绪完全一致。

    Usage::

        engine = ChatEngine(character_id="chayewoon", user_id=12345)
        response = await engine.chat("你好")
        async for event in engine.chat_stream("你好"):
            print(event)
    """

    def __init__(self, character_id: str = "chayewoon", user_id: int = 0):
        """初始化聊天引擎。

        Args:
            character_id: 角色 ID，默认为 chayewoon
            user_id: 用户 ID
        """
        self.character_id = character_id
        self.user_id = user_id

    async def chat(self, message: str) -> str:
        """非流式对话。

        复用 characters/ai_core.py 的 call_ai。

        Args:
            message: 用户消息

        Returns:
            AI 回复文本
        """
        from characters.ai_core import call_ai
        response = await call_ai(message)
        return response

    async def chat_stream(self, message: str) -> AsyncGenerator[dict, None]:
        """流式对话（SSE 事件生成器）。

        复用 characters/ai_client.py 的 stream_chat_completion。

        Args:
            message: 用户消息

        Yields:
            SSE 事件字典，格式为 {"type": "token"|"done"|"error", "content": ...}
        """
        from characters.ai_client import stream_chat_completion

        try:
            full_content = await stream_chat_completion(
                system_prompt="",
                user_message=message,
                model=None,
            )
            if full_content:
                yield {"type": "token", "content": full_content}
            yield {"type": "done"}
        except Exception as e:
            logger.error(f"[ChatEngine] 流式对话错误: {e}")
            yield {"type": "error", "content": str(e)}
