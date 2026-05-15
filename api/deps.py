"""
api/deps.py - FastAPI 依赖注入 (v1.7)
======================================
提供认证、数据库会话等公共依赖。
"""

from fastapi import Depends, Header, HTTPException
from system.auth import validate_session_token_from_token
from system.config import load_config


async def get_current_user(authorization: str = Header(None)) -> int:
    """统一认证依赖。

    依次尝试 session token、api token、配置文件 chat_id 认证。
    返回认证成功的 user_id。

    Args:
        authorization: Authorization 请求头，格式为 "Bearer <token>"

    Returns:
        认证成功的用户 ID

    Raises:
        HTTPException: 认证失败时抛出 401
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供认证令牌")
    token = authorization[7:]

    # 尝试 session token
    user_id = validate_session_token_from_token(token)
    if user_id:
        return user_id

    # 尝试 api token
    from system.auth import API_TOKENS
    if token in API_TOKENS:
        return API_TOKENS[token]["user_id"]

    # Fallback 到配置文件中的 chat_id
    cfg = load_config()
    chat_id = cfg.get("your_chat_id", 0) or cfg.get("chat_id", 0)
    if chat_id and str(token) == str(chat_id):
        from database import get_db
        db = get_db()
        try:
            return db.get_or_create_user(int(chat_id))
        except Exception:
            return int(chat_id)

    raise HTTPException(status_code=401, detail="认证失败")


async def get_optional_user(authorization: str = Header(None)):
    """可选认证（未登录返回 None）。

    Args:
        authorization: Authorization 请求头

    Returns:
        用户 ID 或 None
    """
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
