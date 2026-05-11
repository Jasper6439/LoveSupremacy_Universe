"""
auth.py - 车如云 Telegram Bot 认证模块
从 bot.py Phase 1 (P0) 拆分提取
包含：用户认证函数、API Token 函数
"""

import hashlib
import time
import json
import logging
import os

from config import USERS_FILE, load_config


# ============================================================
# 用户会话存储（可变字典）
# ============================================================

USER_SESSIONS = {}  # {token: {"user_id": chat_id, "username": xxx, "created": timestamp}}

# API 认证令牌存储（可变字典）
API_TOKENS = {}  # {token: {"user_id": xxx, "created": timestamp}}


# ============================================================
# 用户认证函数
# ============================================================

def load_users():
    """加载用户注册信息"""
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logging.error(f"[用户系统] 加载用户数据失败: {e}")
    return {}

def save_users(users):
    """保存用户注册信息"""
    try:
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logging.error(f"[用户系统] 保存用户数据失败: {e}")

def hash_password(password):
    """密码哈希（使用 SHA256 + salt）"""
    salt = "cheyewoon_salt_2025"  # 简单 salt，生产环境建议更复杂
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def register_user(username, password, chat_id):
    """
    注册新用户
    返回: (success: bool, message: str)
    """
    from config import get_default_tz
    from datetime import datetime

    users = load_users()

    # 检查用户名是否已存在
    if username in users:
        return False, "用户名已存在"

    # 检查 chat_id 是否已被注册
    for u in users.values():
        if u.get("chat_id") == str(chat_id):
            return False, "该 Telegram 账号已注册"

    # 创建用户
    users[username] = {
        "password_hash": hash_password(password),
        "chat_id": str(chat_id),
        "created_at": datetime.now(get_default_tz()).isoformat(),
        "last_login": None
    }

    save_users(users)
    logging.info(f"[用户系统] 新用户注册: {username}, chat_id: {chat_id}")
    return True, "注册成功"

def validate_user(username, password):
    """
    验证用户登录
    返回: (success: bool, chat_id: str or None)
    """
    from config import get_default_tz
    from datetime import datetime

    users = load_users()

    if username not in users:
        return False, None

    user = users[username]
    if user["password_hash"] != hash_password(password):
        return False, None

    # 更新最后登录时间
    users[username]["last_login"] = datetime.now(get_default_tz()).isoformat()
    save_users(users)

    return True, user.get("chat_id")

def generate_session_token(username, chat_id):
    """生成用户会话令牌"""
    token = hashlib.sha256(f"{username}:{chat_id}:{time.time()}:{os.urandom(16)}".encode()).hexdigest()[:32]
    USER_SESSIONS[token] = {
        "username": username,
        "user_id": int(chat_id) if chat_id else 0,
        "created": time.time()
    }
    return token

def validate_session_token(request):
    """验证会话令牌，返回 user_id 或 None"""
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        token = auth[7:]
        if token in USER_SESSIONS:
            return USER_SESSIONS[token]["user_id"]
    return None

def is_admin_user(request):
    """检查当前用户是否是管理员"""
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        token = auth[7:]
        if token in USER_SESSIONS:
            username = USER_SESSIONS[token].get("username", "")
            config = load_config()
            return username == config.get("admin_username", "Ulysses")
    return False

def get_username_by_token(token):
    """通过 token 获取用户名"""
    if token in USER_SESSIONS:
        return USER_SESSIONS[token].get("username")
    return None


# ============================================================
# API Token 函数
# ============================================================

def generate_api_token(user_id):
    """生成 API 认证令牌"""
    token = hashlib.sha256(f"{user_id}:{time.time()}:{os.urandom(16)}".encode()).hexdigest()[:32]
    API_TOKENS[token] = {"user_id": user_id, "created": time.time()}
    return token

def validate_api_token(request):
    """验证 API 令牌，返回 user_id 或 None"""
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        token = auth[7:]
        if token in API_TOKENS:
            return API_TOKENS[token]["user_id"]
    return None
