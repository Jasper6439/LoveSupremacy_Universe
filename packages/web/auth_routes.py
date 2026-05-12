"""
用户认证 API 模块
包含注册、登录、用户资料、找回密码、验证重置码、重置密码等 API 端点。
"""

import logging

from aiohttp import web

from config import *
from auth import *


async def api_register(request):
    """用户注册API - v1.4.5: 邮箱注册，角色独立绑定Chat ID"""
    try:
        data = await request.json()
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '')

        # 验证必填字段
        if not email or not username or not password:
            return web.json_response({'success': False, 'error': '邮箱、用户名和密码不能为空'})

        # 验证邮箱格式
        if '@' not in email or '.' not in email.split('@')[-1]:
            return web.json_response({'success': False, 'error': '邮箱格式不正确'})

        # 验证密码长度
        if len(password) < 6:
            return web.json_response({'success': False, 'error': '密码长度至少6位'})

        # 检查邮箱是否已注册
        from auth import load_users, save_users, hash_password
        user_data = load_users()
        users = user_data.get("users", {})
        for u in users.values():
            if u.get('email', '').lower() == email:
                return web.json_response({'success': False, 'error': '该邮箱已注册'})

        # 检查用户名是否已被使用
        for u in users.values():
            if u.get('username', '').lower() == username.lower():
                return web.json_response({'success': False, 'error': '用户名已被使用'})

        # 创建用户
        from config import get_default_tz
        from datetime import datetime
        import uuid

        user_id = str(uuid.uuid4())[:8]
        config = load_config()
        role = "admin" if username == config.get("admin_username", "Ulysses") else "user"

        users[user_id] = {
            "email": email,
            "username": username,
            "password_hash": hash_password(password),
            "display_name": username.capitalize(),
            "role": role,
            "created_at": datetime.now(get_default_tz()).isoformat(),
            "last_login": None,
            "login_count": 0,
            "preferences": {"language": "zh-CN", "theme": "auto"},
            "character_bindings": {},
            "reset_code": None,
            "reset_code_expires": None
        }
        user_data["users"] = users
        save_users(user_data)

        logging.info(f"[API注册] 新用户: {username} ({email}, role: {role})")

        # 注册成功后自动登录
        token = generate_session_token(username, user_id)
        return web.json_response({
            'success': True,
            'message': '注册成功',
            'token': token,
            'user_id': user_id,
            'username': username,
            'is_admin': role == "admin"
        })

    except Exception as e:
        logging.error(f"[API注册] 错误: {e}")
        return web.json_response({'success': False, 'error': str(e)})


async def api_login(request):
    """Mini App登录API - v1.4.5: 支持自动登录"""
    try:
        data = await request.json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        auto_login = data.get('auto_login', False)  # 是否记住登录
        auto_token = data.get('auto_token', '')  # 自动登录令牌

        from auth import load_users, save_users, _verify_password, generate_auto_login_token

        # 如果有自动登录令牌，优先使用
        if auto_token:
            from auth import validate_auto_login_token
            user_id = validate_auto_login_token(auto_token)
            if user_id:
                user_data_loaded = load_users()
                users = user_data_loaded.get("users", {})
                user = users.get(str(user_id))
                if user:
                    token = generate_session_token(user['username'], user_id)
                    return web.json_response({
                        'success': True,
                        'token': token,
                        'user_id': user_id,
                        'username': user['username'],
                        'is_admin': user.get('role') == 'admin',
                        'display_name': user.get('display_name', user['username']),
                        'auto_token': auto_token
                    })
            return web.json_response({'success': False, 'error': '自动登录已过期，请重新登录'})

        if not username or not password:
            return web.json_response({'success': False, 'error': '用户名和密码不能为空'})

        # 验证用户（支持用户名或邮箱登录）
        user_data_loaded = load_users()
        users = user_data_loaded.get("users", {})
        user_id = None
        user_data = None

        # 先尝试用邮箱查找
        for uid, u in users.items():
            if u.get('email', '').lower() == username.lower():
                user_id = uid
                user_data = u
                break

        # 再尝试用用户名查找
        if not user_data:
            for uid, u in users.items():
                if u.get('username', '').lower() == username.lower():
                    user_id = uid
                    user_data = u
                    break

        if not user_data:
            return web.json_response({'success': False, 'error': '用户名或密码错误'})

        # 验证密码
        if not _verify_password(password, user_data['password_hash']):
            return web.json_response({'success': False, 'error': '用户名或密码错误'})

        # 检查是否为管理员（根据配置文件中的 admin_username）
        config = load_config()
        if user_data['username'] == config.get('admin_username', 'Jasper'):
            user_data['role'] = 'admin'

        # 更新登录信息
        from datetime import datetime
        from config import get_default_tz
        user_data['last_login'] = datetime.now(get_default_tz()).isoformat()
        user_data['login_count'] = user_data.get('login_count', 0) + 1
        users[user_id] = user_data
        user_data_loaded["users"] = users
        save_users(user_data_loaded)

        # 生成会话令牌
        token = generate_session_token(user_data['username'], user_id)

        # 生成自动登录令牌
        return_auto_token = None
        if auto_login:
            return_auto_token = generate_auto_login_token(user_id)

        return web.json_response({
            'success': True,
            'token': token,
            'user_id': user_id,
            'username': user_data['username'],
            'is_admin': user_data.get('role') == 'admin',
            'display_name': user_data.get('display_name', user_data['username']),
            'auto_token': return_auto_token
        })

    except Exception as e:
        logging.error(f"[API登录] 错误: {e}")
        return web.json_response({'success': False, 'error': str(e)})


async def api_user_profile(request):
    """获取当前用户信息 - 用于验证 token"""
    try:
        user_id = validate_session_token(request)
        if not user_id:
            return web.json_response({'success': False, 'error': '未登录'}, status=401)

        # 从请求头获取 token
        auth = request.headers.get('Authorization', '')
        token = auth[7:] if auth.startswith('Bearer ') else ''

        # 获取用户详细信息
        from auth import load_users
        user_data = load_users()
        users = user_data.get("users", {})
        user = users.get(str(user_id), {})

        return web.json_response({
            'success': True,
            'user_id': user_id,
            'username': user.get('username', ''),
            'email': user.get('email', ''),
            'is_admin': user.get('role') == 'admin',
            'display_name': user.get('display_name', user.get('username', '')),
            'character_bindings': user.get('character_bindings', {})
        })
    except Exception as e:
        logging.error(f"[API用户资料] 错误: {e}")
        return web.json_response({'success': False, 'error': str(e)}, status=500)


async def api_forgot_password(request):
    """找回密码 - 发送验证码"""
    try:
        data = await request.json()
        email_or_username = data.get('email_or_username', '').strip()

        if not email_or_username:
            return web.json_response({'success': False, 'error': '请输入邮箱或用户名'})

        from auth import generate_reset_code
        success, code, message = generate_reset_code(email_or_username)

        if success:
            # 这里应该发送邮件，但暂时直接返回验证码（测试用）
            # 生产环境应该调用邮件服务
            logging.info(f"[找回密码] 验证码: {code}")
            return web.json_response({
                'success': True,
                'message': '验证码已生成（测试模式：请在日志中查看）',
                'code': code  # 测试时返回，生产环境应删除
            })
        else:
            return web.json_response({'success': False, 'error': message})

    except Exception as e:
        logging.error(f"[找回密码] 错误: {e}")
        return web.json_response({'success': False, 'error': str(e)})


async def api_verify_reset_code(request):
    """验证重置码"""
    try:
        data = await request.json()
        email_or_username = data.get('email_or_username', '').strip()
        code = data.get('code', '').strip()

        if not email_or_username or not code:
            return web.json_response({'success': False, 'error': '请输入邮箱/用户名和验证码'})

        from auth import verify_reset_code
        success, user_id, message = verify_reset_code(email_or_username, code)

        if success:
            return web.json_response({
                'success': True,
                'user_id': user_id,
                'message': message
            })
        else:
            return web.json_response({'success': False, 'error': message})

    except Exception as e:
        logging.error(f"[验证重置码] 错误: {e}")
        return web.json_response({'success': False, 'error': str(e)})


async def api_reset_password(request):
    """重置密码"""
    try:
        data = await request.json()
        user_id = data.get('user_id', '')
        new_password = data.get('new_password', '')

        if not user_id or not new_password:
            return web.json_response({'success': False, 'error': '参数不完整'})

        if len(new_password) < 6:
            return web.json_response({'success': False, 'error': '密码长度至少6位'})

        from auth import reset_password
        success, message = reset_password(user_id, new_password)

        if success:
            return web.json_response({'success': True, 'message': message})
        else:
            return web.json_response({'success': False, 'error': message})

    except Exception as e:
        logging.error(f"[重置密码] 错误: {e}")
        return web.json_response({'success': False, 'error': str(e)})
