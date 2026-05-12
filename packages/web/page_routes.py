"""
页面服务模块
包含健康检查、主页、Mini App、游戏页面的路由处理函数。
"""

import os

from aiohttp import web


async def health_check(request):
    from config import BOT_VERSION, APP_NAME
    return web.Response(text=f"🟢 {APP_NAME}在线 v{BOT_VERSION}")


async def serve_index(request):
    """提供Web界面HTML"""
    try:
        from config import BOT_VERSION, APP_NAME, APP_NAME_EN
        # Use workspace root for template paths
        workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        template_path = os.path.join(workspace_root, 'templates', 'index.html')
        with open(template_path, 'r', encoding='utf-8') as f:
            html = f.read()
        # 注入动态版本号和项目名称
        html = html.replace('__APP_VERSION__', BOT_VERSION)
        html = html.replace('__APP_NAME__', APP_NAME)
        html = html.replace('__APP_NAME_EN__', APP_NAME_EN)
        return web.Response(text=html, content_type='text/html')
    except FileNotFoundError:
        return web.Response(text="Web界面文件未找到", status=404)


async def serve_miniapp(request):
    """Mini App 已融合到主页，重定向到首页"""
    raise web.HTTPFound('/')


async def serve_game(request):
    """游戏已融合到主页，重定向到首页游戏页面"""
    raise web.HTTPFound('/')
