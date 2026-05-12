# 烹饪 + 每日签到 API

import logging
from aiohttp import web
from database import get_db
from game_api.auth import authenticate_request

logger = logging.getLogger(__name__)


async def api_get_recipes(request):
    """获取所有料理配方"""
    try:
        user_id, err = await authenticate_request(request)
        if err:
            return err

        db = get_db()
        recipes = db.get_recipes()
        inventory = db.get_inventory(user_id)

        # 标记每个配方是否可以烹饪
        for recipe in recipes:
            can, msg = db.can_cook(user_id, recipe['id'])
            recipe['can_cook'] = can
            recipe['cook_message'] = msg

        return web.json_response({
            'success': True,
            'recipes': recipes,
            'inventory': inventory
        })

    except Exception as e:
        logger.error(f"[Game API] 获取配方失败: {e}")
        return web.json_response({'success': False, 'error': str(e)})


async def api_cook(request):
    """烹饪料理"""
    try:
        user_id, err = await authenticate_request(request)
        if err:
            return err

        data = await request.json()
        recipe_id = data.get('recipe_id', '')

        db = get_db()
        recipe = db.cook(user_id, recipe_id)

        if recipe:
            db.log_game_event(user_id, 'cook', {
                'recipe_id': recipe_id,
                'recipe_name': recipe['name']
            }, 'miniapp')

            return web.json_response({
                'success': True,
                'recipe': recipe,
                'message': f"烹饪成功！{recipe['emoji']} {recipe['name']}"
            })
        else:
            can, msg = db.can_cook(user_id, recipe_id)
            return web.json_response({
                'success': False,
                'error': msg or '材料不足'
            })

    except Exception as e:
        logger.error(f"[Game API] 烹饪失败: {e}")
        return web.json_response({'success': False, 'error': str(e)})


async def api_daily_reward(request):
    """领取每日登录奖励"""
    try:
        user_id, err = await authenticate_request(request)
        if err:
            return err

        db = get_db()
        # 确保用户存在
        db.get_or_create_user(user_id, f"web_{user_id}")
        result = db.claim_daily_reward(user_id)

        return web.json_response(result)

    except Exception as e:
        logger.error(f"[Game API] 每日签到失败: {e}")
        return web.json_response({'success': False, 'error': str(e)})


async def api_check_daily(request):
    """检查今日是否已签到"""
    try:
        user_id, err = await authenticate_request(request)
        if err:
            return err

        db = get_db()
        # 确保用户存在
        db.get_or_create_user(user_id, f"web_{user_id}")
        reward = db.get_daily_reward(user_id)

        return web.json_response({
            'success': True,
            'claimed': reward['claimed'] == 1 if reward else False
        })

    except Exception as e:
        logger.error(f"[Game API] 检查签到失败: {e}")
        return web.json_response({'success': False, 'error': str(e)})
