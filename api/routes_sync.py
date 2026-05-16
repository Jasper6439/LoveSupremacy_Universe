"""
api/routes_sync.py - 同步 + 全量状态 API + SSE 实时推送
======================================================
从 api/routes_game.py 迁移至独立模块。

包含 11 条路由：
- GET  /api/game/events          获取未同步的游戏事件
- POST /api/game/events/sync     标记事件已同步
- GET  /api/game/state           一次性获取全部游戏状态
- GET  /api/game/emotions        获取情感值
- GET  /api/game/awakening/check 检查觉醒条件
- POST /api/game/awakening/trigger 触发觉醒
- POST /api/game/world/layer     切换世界层级
- GET  /api/game/world/state     获取世界状态
- GET  /api/game/state/sse       SSE 实时推送（StreamingResponse）
- GET  /api/game/state/diff      增量状态差异
- GET  /api/game/state/version   获取当前状态版本号
"""

import asyncio
import json
import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.deps import get_current_user
from database import get_db
from characters import get_current_character
from api.game_state import (
    serialize_game_state, get_state_version, notify_state_change,
    compute_state_diff, get_snapshot, subscribe_state_changes,
    unsubscribe_state_changes,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/game", tags=["sync"])


# ============================================================
# Pydantic 请求体模型
# ============================================================

class MarkSyncedRequest(BaseModel):
    """标记事件已同步请求体"""
    event_ids: list = []


class TriggerAwakeningRequest(BaseModel):
    """触发觉醒请求体"""
    event_name: str = "default_awakening"
    character_id: Optional[str] = None


class SwitchWorldLayerRequest(BaseModel):
    """切换世界层级请求体（兼容 target_layer 和 layer 字段）"""
    target_layer: Optional[str] = None
    layer: Optional[str] = None


# ============================================================
# 1. 游戏事件同步
# ============================================================

@router.get("/events")
async def api_get_game_events(
    since: Optional[str] = Query(None),
    user_id: int = Depends(get_current_user),
):
    """获取未同步的游戏事件"""
    try:
        db = get_db()
        events = db.get_unsynced_events(user_id, since)
        return {"success": True, "events": events}
    except Exception as e:
        logger.error(f"[Game API] 获取事件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/events/sync")
async def api_mark_synced(
    body: MarkSyncedRequest,
    user_id: int = Depends(get_current_user),
):
    """标记事件已同步"""
    try:
        db = get_db()
        db.mark_events_synced(body.event_ids)
        return {"success": True}
    except Exception as e:
        logger.error(f"[Game API] 标记同步失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 2. 全量游戏状态
# ============================================================

@router.get("/state")
async def api_get_full_game_state(
    user_id: int = Depends(get_current_user),
):
    """一次性获取全部游戏状态（v1.6.3: 使用 game_state 模块，附带版本号）"""
    try:
        state = serialize_game_state(user_id)
        version = get_state_version(user_id)
        return {"success": True, "version": version, **state}
    except Exception as e:
        logger.error(f"[Game API] 获取全量状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 3. 情感值
# ============================================================

@router.get("/emotions")
async def api_get_emotion_values(
    character_id: Optional[str] = Query(None),
    user_id: int = Depends(get_current_user),
):
    """获取情感值 API"""
    try:
        if not character_id:
            character = get_current_character()
            character_id = character.config.id if character else "chayewoon"

        db = get_db()
        emotions = db.get_emotion_values(user_id, character_id)
        return {"success": True, "character_id": character_id, "emotions": emotions}
    except Exception as e:
        logger.error(f"[Game API] 获取情感值失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 4. 觉醒系统
# ============================================================

@router.get("/awakening/check")
async def api_check_awakening(
    character_id: Optional[str] = Query(None),
    user_id: int = Depends(get_current_user),
):
    """检查觉醒条件 API"""
    try:
        if not character_id:
            character = get_current_character()
            character_id = character.config.id if character else "chayewoon"

        db = get_db()
        check_result = db.check_awakening_conditions(user_id, character_id)
        return {
            "success": True,
            "character_id": character_id,
            "can_awaken": check_result["can_awaken"],
            "conditions": check_result["conditions"],
            "current_values": check_result["current_values"],
            "current_hearts": check_result["current_hearts"],
        }
    except Exception as e:
        logger.error(f"[Game API] 检查觉醒条件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/awakening/trigger")
async def api_trigger_awakening(
    body: TriggerAwakeningRequest,
    user_id: int = Depends(get_current_user),
):
    """触发觉醒 API"""
    try:
        character_id = body.character_id
        if not character_id:
            character = get_current_character()
            character_id = character.config.id if character else "chayewoon"

        db = get_db()
        result = db.trigger_awakening(user_id, character_id, body.event_name)

        if result:
            return {
                "success": True,
                "event": result,
                "message": f"{character.config.name if character else '角色'} 已觉醒！",
            }
        else:
            return {"success": False, "error": "觉醒条件未满足"}
    except Exception as e:
        logger.error(f"[Game API] 触发觉醒失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 5. 世界层级
# ============================================================

@router.post("/world/layer")
async def api_switch_world_layer(
    body: SwitchWorldLayerRequest,
    user_id: int = Depends(get_current_user),
):
    """切换世界层级 API（向后兼容，同时支持 layer 和 target_layer 字段）"""
    try:
        # 兼容前端发 target_layer 或 layer
        layer = body.target_layer or body.layer or "normal"

        db = get_db()
        result = db.switch_world_layer(user_id, layer)

        if result["success"]:
            return {
                "success": True,
                "previous_layer": result["previous_layer"],
                "current_layer": result["current_layer"],
                "layer_name": result["layer_name"],
                "message": f'已切换至 {result["layer_name"]}',
            }
        else:
            return {"success": False, "error": result.get("error", "切换失败")}
    except Exception as e:
        logger.error(f"[Game API] 切换世界层级失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/world/state")
async def api_get_world_state(
    user_id: int = Depends(get_current_user),
):
    """获取世界状态 API"""
    try:
        db = get_db()
        world_state = db.get_world_layer_state(user_id)
        return {"success": True, "world_state": world_state}
    except Exception as e:
        logger.error(f"[Game API] 获取世界状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 6. SSE 实时推送 + 增量同步 (v1.6.3)
# ============================================================

@router.get("/state/sse")
async def api_game_state_sse(
    user_id: int = Depends(get_current_user),
):
    """SSE 端点 — 实时推送游戏状态变更通知

    前端连接后，服务器在有状态变更时推送版本号。
    前端收到通知后调用 /api/game/state/diff 获取增量差异。

    SSE 协议：
    - Content-Type: text/event-stream
    - 每条消息格式: data: {json}\\n\\n
    - 心跳: 每 30 秒发送 ping
    """

    async def event_generator():
        """SSE 事件生成器"""
        queue = await subscribe_state_changes(user_id)
        try:
            # 立即发送当前版本号（让前端知道从哪个版本开始）
            current_version = get_state_version(user_id)
            init_msg = json.dumps(
                {"type": "init", "version": current_version, "timestamp": time.time()},
                ensure_ascii=False,
            )
            yield f"data: {init_msg}\n\n"

            # 持续监听
            while True:
                try:
                    # 等待状态变更消息，30秒超时用于心跳
                    msg = await asyncio.wait_for(queue.get(), timeout=30)
                    yield f"data: {msg}\n\n"
                except asyncio.TimeoutError:
                    # 发送心跳
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            logger.debug(f"[SSE] 用户 {user_id} 连接断开")
        finally:
            unsubscribe_state_changes(user_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/state/diff")
async def api_game_state_diff(
    version: int = Query(0),
    user_id: int = Depends(get_current_user),
):
    """增量状态差异 API

    前端传入本地版本号，返回该版本之后的所有变更。
    如果版本号过期或不存在，返回 needsFullSync=true 提示前端全量拉取。
    """
    try:
        client_version = version
        current_version = get_state_version(user_id)

        # 版本号一致，无变更
        if client_version == current_version:
            return {
                "success": True,
                "version": current_version,
                "hasChanges": False,
                "diff": {},
            }

        # 版本号落后太多（超过10个版本），建议全量同步
        if current_version - client_version > 10:
            return {
                "success": True,
                "version": current_version,
                "hasChanges": True,
                "needsFullSync": True,
            }

        # 尝试从快照计算差异
        old_snapshot = get_snapshot(user_id)
        new_state = serialize_game_state(user_id)

        if old_snapshot:
            diff = compute_state_diff(old_snapshot, new_state)
        else:
            # 无快照，返回全量
            return {
                "success": True,
                "version": current_version,
                "hasChanges": True,
                "needsFullSync": True,
            }

        return {
            "success": True,
            "version": current_version,
            "hasChanges": True,
            "diff": diff,
        }
    except Exception as e:
        logger.error(f"[Game API] 增量同步失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/state/version")
async def api_game_state_version(
    user_id: int = Depends(get_current_user),
):
    """获取当前状态版本号（轻量级，用于前端轮询判断是否需要同步）"""
    try:
        return {"success": True, "version": get_state_version(user_id)}
    except Exception as e:
        logger.error(f"[Game API] 获取版本号失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
