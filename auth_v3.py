"""
auth_v3.py - 恋爱至上主义区域 认证模块 v3
基于邮箱注册，角色独立绑定 Telegram Chat ID
"""

import hashlib
import time
import json
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta

from config import USERS_FILE, load_config, get_default_tz

# ============================================================
# 用户数据结构 v3
# ============================================================
# {
#   "_version": 3,
#   "users": {
#     "uuid": {
#       "email": "user@example.com",
#       "username": "昵称",
#       "password_hash": "...",
#       "role": "user",
#       "email_verified": true,
#       "created_at": "...",
#       "last_login": "...",
#       "login_count": 0,
#       "character_bindings": {
#         "chayewoon": { "chat_id": "5315601134", "bound_at": "..." }
#       },
#       "reset_code": null,
#       "reset_code_expires": null
#     }
#   },
#   "email_index": { "user@example.com": "uuid" }
# }

USER_DATA_VERSION = 3

# 会话存储（持久化到文件）
SESSIONS_FILE = os.path.join(os.path.dirname(USERS_FILE), "sessions_v3.json")
AUTO_LOGIN_TOKENS = {}  # {token: {"user_id": uuid, "expires": timestamp}}


def _load_sessions_v3():
    """加载持久化会话"""
    global AUTO_LOGIN_TOKENS
    try:
        if os.path.exists(SESSIONS_FILE):
            with open(SESSIONS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                now = time.time()
                AUTO_LOGIN_TOKENS = {
                    k: v for k, v in data.items()
                    if v.get("expires", 0) > now
                }
    except Exception as e:
        logging.warning(f"[会话v3] 加载失败: {e}")
        AUTO_LOGIN_TOKENS = {}


def _save_sessions_v3():
    """保存会话到文件"""
    try:
        os.makedirs(os.path.dirname(SESSIONS_FILE), exist_ok=True)
        with open(SESSIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(AUTO_LOGIN_TOKENS, f, ensure_ascii=False)
    except Exception as e:
        logging.warning(f"[会话v3] 保存失败: {e}")


# 启动时加载会话
_load_sessions_v3()


# ============================================================
# 数据迁移和读写
# ============================================================

def _migrate_users_v3(data):
    """将旧版用户数据迁移到 v3 格式（邮箱为主键）"""
    if not data or (isinstance(data, dict) and data.get("_version") == USER_DATA_VERSION):
        return data

    migrated = {"_version": USER_DATA_VERSION, "users": {}, "email_index": {}}

    if isinstance(data, dict):
        old_users = data.get("users", data)
        for key, value in old_users.items():
            if key.startswith("_"):
                continue
            if not isinstance(value, dict):
                continue

            # 生成新用户 ID
            user_id = str(uuid.uuid4())[:8]

            # 从旧数据提取信息
            old_username = value.get("username", key)
            old_chat_id = key if key.isdigit() else None

            # 生成模拟邮箱（基于用户名）
            email = f"{old_username.lower()}@legacy.local"

            # 处理重复邮箱
            counter = 1
            base_email = email
            while email in migrated["email_index"]:
                email = f"{old_username.lower()}{counter}@legacy.local"
                counter += 1

            migrated["email_index"][email] = user_id

            # 迁移角色绑定（如果有 chat_id）
            character_bindings = {}
            if old_chat_id:
                character_bindings["chayewoon"] = {
                    "chat_id": old_chat_id,
                    "bound_at": value.get("created_at", datetime.now(get_default_tz()).isoformat())
                }

            migrated["users"][user_id] = {
                "email": email,
                "username": old_username,
                "password_hash": value.get("password_hash", ""),
                "display_name": value.get("display_name", old_username.capitalize()),
                "role": value.get("role", "user"),
                "email_verified": False,  # 旧用户需要重新验证邮箱
                "created_at": value.get("created_at", datetime.now(get_default_tz()).isoformat()),
                "last_login": value.get("last_login"),
                "login_count": value.get("login_count", 0),
                "preferences": value.get("preferences", {"language": "zh-CN", "theme": "auto"}),
                "character_bindings": character_bindings,
                "reset_code": None,
                "reset_code_expires": None
            }

    logging.info(f"[用户系统v3] 数据迁移完成，共 {len(migrated['users'])} 个用户")
    save_users_v3(migrated)
    return migrated


def load_users_v3():
    """加载用户数据（自动迁移）"""
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return _migrate_users_v3(data)
        except Exception as e:
            logging.error(f"[用户系统v3] 加载失败: {e}")
    return {"_version": USER_DATA_VERSION, "users": {}, "email_index": {}}


def save_users_v3(data):
    """保存用户数据"""
    try:
        os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logging.error(f"[用户系统v3] 保存失败: {e}")


# ============================================================
# 密码处理
# ============================================================

def hash_password(password):
    """密码哈希（SHA256 + salt）"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{password}:{salt}".encode()).hexdigest()
    return f"{salt}${hashed}"


def _verify_password(password, stored_hash):
    """验证密码"""
    try:
        salt, hashed = stored_hash.split("$", 1)
        return hashlib.sha256(f"{password}:{salt}".encode()).hexdigest() == hashed
    except (ValueError, AttributeError):
        return False


# ============================================================
# 用户注册（邮箱+密码）
# ============================================================

def register_user_v3(email, username, password):
    """
    注册新用户（邮箱为主键）
    返回: (success: bool, message: str, user_id: str or None)
    """
    if not email or not username or not password:
        return False, "邮箱、用户名和密码不能为空", None

    if len(password) < 6:
        return False, "密码长度至少 6 位", None

    if len(username) < 2 or len(username) > 20:
        return False, "用户名长度 2-20 个字符", None

    # 简单邮箱格式验证
    if "@" not in email or "." not in email.split("@")[-1]:
        return False, "邮箱格式不正确", None

    email = email.lower().strip()
    data = load_users_v3()

    # 检查邮箱是否已注册
    if email in data.get("email_index", {}):
        return False, "该邮箱已注册，请直接登录", None

    # 检查用户名是否已被使用
    for u in data.get("users", {}).values():
        if u.get("username", "").lower() == username.lower():
            return False, "用户名已被使用", None

    # 检查是否为管理员
    config = load_config()
    role = "admin" if username == config.get("admin_username", "Ulysses") else "user"

    # 创建用户
    user_id = str(uuid.uuid4())[:8]
    now = datetime.now(get_default_tz()).isoformat()

    if "users" not in data:
        data["users"] = {}
    if "email_index" not in data:
        data["email_index"] = {}

    data["users"][user_id] = {
        "email": email,
        "username": username,
        "password_hash": hash_password(password),
        "display_name": username.capitalize(),
        "role": role,
        "email_verified": False,
        "created_at": now,
        "last_login": None,
        "login_count": 0,
        "preferences": {"language": "zh-CN", "theme": "auto"},
        "character_bindings": {},
        "reset_code": None,
        "reset_code_expires": None
    }
    data["email_index"][email] = user_id

    save_users_v3(data)
    logging.info(f"[用户系统v3] 新用户注册: {username} ({email}, role: {role})")
    return True, "注册成功", user_id


# ============================================================
# 用户登录
# ============================================================

def validate_user_v3(email_or_username, password):
    """
    验证用户登录（支持邮箱或用户名）
    返回: (success: bool, user_data: dict or None)
    """
    data = load_users_v3()
    users = data.get("users", {})
    email_index = data.get("email_index", {})

    user_id = None
    user_data = None

    # 先尝试用邮箱查找
    email_key = email_or_username.lower().strip()
    if email_key in email_index:
        user_id = email_index[email_key]
        user_data = users.get(user_id)

    # 再尝试用用户名查找
    if not user_data:
        for uid, u in users.items():
            if u.get("username", "").lower() == email_or_username.lower():
                user_id = uid
                user_data = u
                break

    if not user_data:
        return False, None

    # 验证密码
    if not _verify_password(password, user_data["password_hash"]):
        return False, None

    # 更新登录信息
    now = datetime.now(get_default_tz()).isoformat()
    user_data["last_login"] = now
    user_data["login_count"] = user_data.get("login_count", 0) + 1
    users[user_id] = user_data
    save_users_v3(data)

    # 返回用户信息（包含 user_id）
    result = user_data.copy()
    result["user_id"] = user_id
    return True, result


# ============================================================
# 会话和自动登录 Token
# ============================================================

def generate_session_token_v3(user_id, auto_login=False):
    """
    生成会话令牌
    auto_login=True: 生成长期有效的自动登录 token（30天）
    """
    token = secrets.token_hex(32)

    if auto_login:
        # 自动登录 token 30天有效期
        expires = time.time() + 30 * 24 * 3600
        AUTO_LOGIN_TOKENS[token] = {
            "user_id": user_id,
            "expires": expires
        }
        _save_sessions_v3()

    return token


def validate_auto_login_token(token):
    """验证自动登录 token"""
    if token not in AUTO_LOGIN_TOKENS:
        return None

    session = AUTO_LOGIN_TOKENS[token]
    if session.get("expires", 0) < time.time():
        # 过期删除
        del AUTO_LOGIN_TOKENS[token]
        _save_sessions_v3()
        return None

    return session.get("user_id")


def revoke_auto_login_token(token):
    """撤销自动登录 token（登出时）"""
    if token in AUTO_LOGIN_TOKENS:
        del AUTO_LOGIN_TOKENS[token]
        _save_sessions_v3()


# ============================================================
# 角色绑定 Chat ID
# ============================================================

def bind_character_chat_id(user_id, character_id, chat_id):
    """
    绑定角色的 Telegram Chat ID
    返回: (success: bool, message: str)
    """
    if not chat_id:
        return False, "Chat ID 不能为空"

    try:
        chat_id_str = str(int(chat_id))
    except ValueError:
        return False, "Chat ID 必须是数字"

    data = load_users_v3()
    user = data.get("users", {}).get(user_id)
    if not user:
        return False, "用户不存在"

    if "character_bindings" not in user:
        user["character_bindings"] = {}

    now = datetime.now(get_default_tz()).isoformat()
    user["character_bindings"][character_id] = {
        "chat_id": chat_id_str,
        "bound_at": now
    }

    data["users"][user_id] = user
    save_users_v3(data)
    logging.info(f"[用户系统v3] 角色绑定: {user_id} -> {character_id} ({chat_id_str})")
    return True, "绑定成功"


def get_character_chat_id(user_id, character_id):
    """获取用户绑定的角色 Chat ID"""
    data = load_users_v3()
    user = data.get("users", {}).get(user_id)
    if not user:
        return None

    bindings = user.get("character_bindings", {})
    binding = bindings.get(character_id, {})
    return binding.get("chat_id")


def get_user_character_bindings(user_id):
    """获取用户的所有角色绑定"""
    data = load_users_v3()
    user = data.get("users", {}).get(user_id)
    if not user:
        return {}
    return user.get("character_bindings", {})


# ============================================================
# 找回密码
# ============================================================

def generate_reset_code(email):
    """
    生成密码重置验证码
    返回: (success: bool, code: str or None, message: str)
    """
    email = email.lower().strip()
    data = load_users_v3()
    email_index = data.get("email_index", {})

    if email not in email_index:
        return False, None, "该邮箱未注册"

    user_id = email_index[email]
    user = data["users"][user_id]

    # 生成6位数字验证码
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    expires = (datetime.now(get_default_tz()) + timedelta(minutes=10)).isoformat()

    user["reset_code"] = code
    user["reset_code_expires"] = expires
    data["users"][user_id] = user
    save_users_v3(data)

    logging.info(f"[用户系统v3] 生成重置码: {email}")
    return True, code, "验证码已生成"


def verify_reset_code(email, code):
    """
    验证重置码
    返回: (success: bool, user_id: str or None, message: str)
    """
    email = email.lower().strip()
    data = load_users_v3()
    email_index = data.get("email_index", {})

    if email not in email_index:
        return False, None, "该邮箱未注册"

    user_id = email_index[email]
    user = data["users"][user_id]

    stored_code = user.get("reset_code")
    expires = user.get("reset_code_expires")

    if not stored_code or not expires:
        return False, None, "请先获取验证码"

    if datetime.now(get_default_tz()) > datetime.fromisoformat(expires):
        return False, None, "验证码已过期，请重新获取"

    if code != stored_code:
        return False, None, "验证码错误"

    return True, user_id, "验证成功"


def reset_password(user_id, new_password):
    """重置密码"""
    if len(new_password) < 6:
        return False, "密码长度至少 6 位"

    data = load_users_v3()
    user = data["users"].get(user_id)
    if not user:
        return False, "用户不存在"

    user["password_hash"] = hash_password(new_password)
    user["reset_code"] = None
    user["reset_code_expires"] = None
    data["users"][user_id] = user
    save_users_v3(data)

    logging.info(f"[用户系统v3] 密码重置: {user_id}")
    return True, "密码重置成功"


# ============================================================
# 用户信息查询
# ============================================================

def get_user_by_id(user_id):
    """通过 ID 获取用户"""
    data = load_users_v3()
    return data.get("users", {}).get(user_id)


def get_user_by_email(email):
    """通过邮箱获取用户"""
    email = email.lower().strip()
    data = load_users_v3()
    email_index = data.get("email_index", {})
    user_id = email_index.get(email)
    if user_id:
        return data["users"].get(user_id)
    return None


def is_admin_user_v3(user_id):
    """检查用户是否为管理员"""
    user = get_user_by_id(user_id)
    return user and user.get("role") == "admin"
