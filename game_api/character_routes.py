# 角色互动 API

import logging
from datetime import datetime
from aiohttp import web
from database import get_db
from config import get_default_tz
from characters import get_current_character
from game_api.auth import authenticate_request

logger = logging.getLogger(__name__)


async def api_get_character_location(request):
    """获取角色当前位置"""
    try:
        user_id, err = await authenticate_request(request)
        if err:
            return err


        # 获取当前角色
        character = get_current_character()
        character_id = character.config.id if character else 'chayewoon'

        db = get_db()

        # 获取位置
        location = db.get_character_location(character_id)

        # 获取关系
        relationship = db.get_relationship(user_id, character_id) if user_id else None

        return web.json_response({
            'success': True,
            'character_id': character_id,
            'character_name': character.config.name if character else '车如云',
            'location': location,
            'relationship': relationship
        })

    except Exception as e:
        logger.error(f"[Game API] 获取角色位置失败: {e}")
        return web.json_response({'success': False, 'error': str(e)})


async def api_get_relationship(request):
    """获取玩家与角色的关系"""
    try:
        user_id, err = await authenticate_request(request)
        if err:
            return err


        if not user_id:
            return web.json_response({'success': False, 'error': '未登录'})

        # 获取当前角色
        character = get_current_character()
        character_id = character.config.id if character else 'chayewoon'

        db = get_db()

        # 获取关系
        relationship = db.get_relationship(user_id, character_id)

        # 获取可触发事件
        available_events = db.get_available_events(user_id, character_id)

        return web.json_response({
            'success': True,
            'relationship': relationship,
            'available_events': available_events
        })

    except Exception as e:
        logger.error(f"[Game API] 获取关系失败: {e}")
        return web.json_response({'success': False, 'error': str(e)})


async def api_game_chat(request):
    """游戏内与角色对话 (v0.2 - 使用 ChatEngine)"""
    try:
        user_id, err = await authenticate_request(request)
        if err:
            return err


        data = await request.json()
        message = data.get('message', '')
        character_id = data.get('character_id', 'chayewoon')

        if not message:
            return web.json_response({'success': False, 'error': '消息不能为空'})

        # 使用 ChatEngine
        from chat_engine import chat_with_character
        from database import get_db

        db = get_db()
        location = db.get_character_location(character_id)
        location_text = location['location'] if location else ''

        # 获取当前情感值
        emotion_values = db.get_emotion_values(user_id, character_id)

        result = await chat_with_character(
            character_id=character_id,
            user_id=user_id,
            user_message=message,
            context={
                'platform': 'web',
                'location': location_text,
                'emotion_values': emotion_values,
            }
        )

        # 应用觉醒情感奖励
        if result.get('awakening_triggered') and result['awakening_triggered'].get('emotion_bonus'):
            bonus = result['awakening_triggered']['emotion_bonus']
            for key, value in bonus.items():
                result['emotion_changes'][key] = result['emotion_changes'].get(key, 0) + value

        return web.json_response({
            'success': True,
            'response': result['response'],
            'character_name': result['character_name'],
            'character_id': result['character_id'],
            'emotion_changes': result['emotion_changes'],
            'awakening_triggered': result['awakening_triggered'],
            'memory_saved': result['memory_saved'],
        })

    except Exception as e:
        logger.error(f"[Game API] 游戏对话失败: {e}")
        return web.json_response({'success': False, 'error': str(e)})


async def api_chat_history(request):
    """获取对话历史 (v0.2)"""
    try:
        user_id, err = await authenticate_request(request)
        if err:
            return err
        from database import get_db

        character_id = request.query.get('character_id', 'chayewoon')
        limit = int(request.query.get('limit', 50))

        db = get_db()
        history = db.get_chat_history(user_id, character_id, limit)

        return web.json_response({'success': True, 'history': history})
    except Exception as e:
        return web.json_response({'success': False, 'error': str(e)})


async def api_awakening_events(request):
    """获取觉醒事件列表 (v0.2)"""
    try:
        character_id = request.query.get('character_id', 'chayewoon')

        from awakening_detector import AwakeningDetector
        detector = AwakeningDetector()
        events = detector.get_all_events(character_id)

        return web.json_response({'success': True, 'events': events})
    except Exception as e:
        return web.json_response({'success': False, 'error': str(e)})


async def api_gift_character(request):
    """给角色送礼物"""
    try:
        user_id, err = await authenticate_request(request)
        if err:
            return err


        data = await request.json()
        item_type = data.get('item_type', 'crop')
        item_id = data.get('item_id', '')

        # 获取当前角色
        character = get_current_character()
        character_id = character.config.id if character else 'chayewoon'

        db = get_db()

        # 检查背包
        if not db.remove_item(user_id, item_type, item_id):
            return web.json_response({
                'success': False,
                'error': '背包里没有这个物品'
            })

        # 获取物品信息
        item_info = db.get_crop_type(item_id) if item_type == 'crop' else None
        item_name = item_info['name'] if item_info else item_id

        # 判断喜好（简化版，实际应该从角色配置读取）
        # 车如云喜欢：红豆相关、甜食
        # 不喜欢：苦的、辣的
        reaction = 'neutral'
        hearts_change = 1

        if item_id in ['strawberry', 'watermelon']:
            reaction = 'like'
            hearts_change = 2
        elif 'tomato' in item_id:
            reaction = 'neutral'
            hearts_change = 1
        else:
            reaction = 'neutral'
            hearts_change = 1

        # 更新心级
        new_hearts = db.update_hearts(user_id, character_id, hearts_change)

        # 记录礼物
        now = datetime.now(get_default_tz()).isoformat()
        with db.get_connection() as conn:
            conn.execute(
                """INSERT INTO gift_history (user_id, character_id, item_type, item_id, reaction, hearts_change, gifted_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (user_id, character_id, item_type, item_id, reaction, hearts_change, now)
            )

        # 生成角色反应
        reaction_prompts = {
            'love': f"学长送了我最喜欢的{item_name}，用一句话害羞地回应，不超过15个字",
            'like': f"学长送了我{item_name}，挺喜欢的，用一句话简短回应，不超过15个字",
            'neutral': f"学长送了我{item_name}，用一句话简短回应，不超过15个字",
            'dislike': f"学长送了我{item_name}，不太喜欢，用一句话简短回应，不超过15个字",
        }

        from ai_client import call_ai
        response = await call_ai(reaction_prompts.get(reaction, reaction_prompts['neutral']))

        # 记录事件
        db.log_game_event(user_id, 'gift', {
            'item_type': item_type,
            'item_id': item_id,
            'reaction': reaction,
            'hearts_change': hearts_change
        }, 'web')

        return web.json_response({
            'success': True,
            'reaction': reaction,
            'hearts_change': hearts_change,
            'new_hearts': new_hearts,
            'response': response
        })

    except Exception as e:
        logger.error(f"[Game API] 送礼失败: {e}")
        return web.json_response({'success': False, 'error': str(e)})


async def api_sync_actions(request):
    """增量同步操作"""
    try:
        user_id, err = await authenticate_request(request)
        if err:
            return err


        data = await request.json()
        actions = data.get('actions', [])

        db = get_db()
        processed = 0

        for action in actions:
            try:
                action_type = action.get('type')
                if action_type == 'plant':
                    farm = db.get_farm(user_id)
                    if farm:
                        db.plant_crop(farm['id'], action['x'], action['y'], action['cropType'])
                elif action_type == 'harvest':
                    farm = db.get_farm(user_id)
                    if farm:
                        crop_type = db.harvest_crop(farm['id'], action['x'], action['y'])
                        if crop_type:
                            db.add_item(user_id, 'crop', crop_type, 1)
                elif action_type == 'water':
                    farm = db.get_farm(user_id)
                    if farm:
                        db.water_crop(farm['id'], action['x'], action['y'])
                elif action_type == 'buy_seed':
                    # Already processed client-side
                    pass
                elif action_type == 'sell':
                    # Already processed client-side
                    pass
                elif action_type == 'move':
                    db.save_player_position(user_id, action['x'], action['y'], action.get('direction', 'down'))
                processed += 1
            except Exception as e:
                logger.warning(f"[Game API] 同步操作失败: {action_type} - {e}")

        return web.json_response({'success': True, 'processed': processed})

    except Exception as e:
        logger.error(f"[Game API] 同步失败: {e}")
        return web.json_response({'success': False, 'error': str(e)})
