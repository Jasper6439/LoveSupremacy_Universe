"""
页面服务模块
包含健康检查、主页、Mini App、游戏页面的路由处理函数。
v1.6.0: 主页指向 web-v2 (React SPA)
"""

import os

from aiohttp import web


async def health_check(request):
    from config import BOT_VERSION, APP_NAME
    return web.Response(text=f"🟢 {APP_NAME}在线 v{BOT_VERSION}")


async def serve_index(request):
    """提供 web-v2 主页 (React SPA)"""
    try:
        workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        index_path = os.path.join(workspace_root, 'web-v2', 'dist', 'index.html')
        with open(index_path, 'r', encoding='utf-8') as f:
            html = f.read()
        return web.Response(text=html, content_type='text/html')
    except FileNotFoundError:
        return web.Response(text="Web界面文件未找到 (web-v2/dist/index.html)", status=404)


async def serve_miniapp(request):
    """Mini App 已融合到 web-v2，重定向到首页"""
    raise web.HTTPFound('/')


async def serve_game(request):
    """游戏已融合到 web-v2，重定向到首页 /game"""
    raise web.HTTPFound('/game')
