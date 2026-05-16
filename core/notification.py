"""
通知桥接模块
============
统一将 Web 端游戏事件推送到 Telegram。

提供底层消息发送接口和高级游戏事件通知接口，
被 game_state.notify_state_change 等模块调用。
通知发送失败时只记录 warning 日志，不抛出异常（通知不是关键路径）。
"""

import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)


# ============================================================
# tg_app 实例管理
# ============================================================

# 运行时保存的 tg_app 实例引用（由 set_tg_app 设置）
_tg_app_instance = None


def set_tg_app(app):
    """设置全局 tg_app 实例引用。

    在 main.py 的 post_init 回调中调用，
    将 tg_app 实例保存到 notification 模块中。

    Args:
        app: telegram.ext.Application 实例
    """
    global _tg_app_instance
    _tg_app_instance = app
    logger.info("[通知] tg_app 实例已设置")


# ============================================================
# 底层消息发送
# ============================================================


async def send_telegram_notification(user_id: int, message: str, parse_mode: str = "HTML") -> bool:
    """发送 Telegram 通知消息。

    通过 main.py 中创建的 tg_app 实例发送消息。
    tg_app 在 main() 中创建后，通过 set_tg_app() 保存到本模块。

    Args:
        user_id: 目标用户的 Telegram chat_id
        message: 要发送的消息文本
        parse_mode: 消息解析模式，默认 "HTML"

    Returns:
        bool: 发送是否成功
    """
    try:
        app = _tg_app_instance
        if app is None:
            logger.warning("[通知] tg_app 实例不可用，无法发送通知")
            return False

        await app.bot.send_message(
            chat_id=user_id,
            text=message,
            parse_mode=parse_mode,
        )
        logger.info(f"[通知] 已发送通知给用户 {user_id}")
        return True
    except Exception as e:
        logger.warning(f"[通知] 发送 Telegram 通知失败: {e}")
        return False


# ============================================================
# 高级游戏事件通知
# ============================================================

# 事件类型对应的通知模板
_EVENT_TEMPLATES = {
    "crop_ready": (
        "\U0001F33E <b>作物成熟</b>\n"
        "学长，农场里的作物已经成熟了，快去收获吧！"
    ),
    "heart_event": (
        "\u2764\uFE0F <b>心级事件</b>\n"
        "和如云的关系发生了变化……"
    ),
    "cooking_complete": (
        "\U0001F373 <b>烹饪完成</b>\n"
        "学长，料理做好了！快来尝尝吧。"
    ),
    "level_up": (
        "\U0001F31F <b>升级</b>\n"
        "恭喜学长升级了！如云……稍微有点开心。"
    ),
}


async def notify_game_event(user_id: int, event_type: str, event_data: Optional[dict] = None) -> bool:
    """发送游戏事件通知。

    根据事件类型生成友好的中文通知消息，并发送到 Telegram。

    Args:
        user_id: 目标用户的 Telegram chat_id
        event_type: 事件类型，支持:
            - "crop_ready": 作物成熟
            - "heart_event": 心级事件
            - "cooking_complete": 烹饪完成
            - "level_up": 升级
        event_data: 事件附加数据（可选），可用于生成更详细的通知消息

    Returns:
        bool: 发送是否成功
    """
    event_data = event_data or {}

    if event_type in _EVENT_TEMPLATES:
        message = _EVENT_TEMPLATES[event_type]
    else:
        logger.warning(f"[通知] 未知事件类型: {event_type}")
        message = f"\u26A0\uFE0F <b>游戏事件</b>\n{event_type}"

    # 如果有附加数据，追加到消息中
    if event_data:
        detail_parts = []
        if "detail" in event_data:
            detail_parts.append(str(event_data["detail"]))
        if "crop_name" in event_data:
            detail_parts.append(f"作物: {event_data['crop_name']}")
        if "new_level" in event_data:
            detail_parts.append(f"新等级: Lv.{event_data['new_level']}")
        if "hearts" in event_data:
            detail_parts.append(f"心级: {event_data['hearts']}")
        if detail_parts:
            message += "\n\n" + "\n".join(detail_parts)

    return await send_telegram_notification(user_id, message)


# ============================================================
# Web -> Telegram 状态变更桥接
# ============================================================

# 需要通知的重要变更 key 关键词
_IMPORTANT_CHANGE_KEYS = {
    "crop_ready",            # 作物成熟
    "heart",                 # 心级事件
    "hearts",                # 心级数值变化
    "relationship",          # 关系变化
    "relationshipStatus",    # 关系状态变化
    "level",                 # 等级变化
    "cooking",               # 烹饪相关
}


def bridge_web_to_telegram(user_id: int, changed_keys: list):
    """桥接 Web 端游戏状态变更到 Telegram 通知。

    被 game_state.notify_state_change 调用。
    根据变更的 keys 判断是否需要发送 Telegram 通知（不是所有变更都通知）。

    只通知重要事件：作物成熟、心级事件、关系变化。

    Args:
        user_id: 用户 ID
        changed_keys: 发生变更的状态 key 列表
    """
    if not changed_keys:
        return

    # 判断是否有重要变更
    important_events = []
    for key in changed_keys:
        # 检查 key 是否包含重要关键词
        for important_key in _IMPORTANT_CHANGE_KEYS:
            if important_key in key:
                important_events.append((key, important_key))
                break

    if not important_events:
        return

    # 根据重要事件类型调度通知
    for key, event_keyword in important_events:
        try:
            if event_keyword == "crop_ready":
                asyncio.ensure_future(
                    notify_game_event(user_id, "crop_ready", {"detail": key})
                )
            elif event_keyword in ("heart", "hearts"):
                asyncio.ensure_future(
                    notify_game_event(user_id, "heart_event", {"detail": key})
                )
            elif event_keyword in ("relationship", "relationshipStatus"):
                asyncio.ensure_future(
                    notify_game_event(user_id, "heart_event", {"detail": key})
                )
            elif event_keyword == "level":
                asyncio.ensure_future(
                    notify_game_event(user_id, "level_up", {"detail": key})
                )
            elif event_keyword == "cooking":
                asyncio.ensure_future(
                    notify_game_event(user_id, "cooking_complete", {"detail": key})
                )
        except Exception as e:
            logger.warning(f"[通知] 桥接通知调度失败 ({key}): {e}")
