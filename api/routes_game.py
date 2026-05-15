# 游戏 API 路由（FastAPI 版本）
# ============================
# 从 aiohttp 迁移至 FastAPI APIRouter 格式。
# 合并自:
#   - game_api/farm_routes.py   (农场操作)
#   - game_api/cooking_routes.py (烹饪 + 每日签到)
#   - game_api/heart_routes.py   (心级事件)

import json
import logging
import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.deps import get_current_user
from database import get_db
from game_api.game_state import notify_state_change
from system.config import get_default_tz
from characters import get_current_character

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/game", tags=["game"])


# ============================================================
# Pydantic 请求模型
# ============================================================

class PlantCropRequest(BaseModel):
    """种植作物请求体"""
    x: int = 0
    y: int = 0
    crop_type: str = "tomato"


class HarvestCropRequest(BaseModel):
    """收获作物请求体"""
    x: int = 0
    y: int = 0


class SellCropRequest(BaseModel):
    """出售作物请求体"""
    crop_type: str = ""
    quantity: int = 1


class BuySeedRequest(BaseModel):
    """购买种子请求体"""
    crop_type: str = "tomato"
    quantity: int = 1


class WaterCropRequest(BaseModel):
    """浇水请求体"""
    x: int = 0
    y: int = 0


class MovePlayerRequest(BaseModel):
    """记录玩家位置请求体"""
    x: int = 0
    y: int = 0
    direction: str = "down"


class CookRequest(BaseModel):
    """烹饪料理请求体"""
    recipe_id: str = ""


class TriggerHeartEventRequest(BaseModel):
    """触发心级事件请求体"""
    event_id: str = ""


# ============================================================
# 辅助函数
# ============================================================

def _calculate_harvest_rewards(db, user_id, crop_type, crop_info):
    """计算收获时的概率奖励（15%返还种子，5%双倍收获）"""
    rewards = []
    if not crop_info:
        return rewards
    # 15% 概率返还1颗种子
    if random.random() < 0.15:
        db.add_item(user_id, 'seed', crop_type, 1)
        rewards.append({'type': 'seed_return', 'crop': crop_type, 'message': f'获得 1 颗{crop_info["name"]}种子!'})
    # 5% 概率双倍收获
    if random.random() < 0.05:
        db.add_item(user_id, 'crop', crop_type, 1)
        rewards.append({'type': 'double_harvest', 'crop': crop_type, 'message': '🎉 双倍收获!'})
    return rewards


# ============================================================
# 农场路由 (farm_routes.py)
# ============================================================

@router.get("/farm")
async def api_get_farm(user_id: int = Depends(get_current_user)):
    """获取农场数据"""
    try:
        db = get_db()

        # 获取农场数据
        farm = db.get_farm(user_id)
        if not farm:
            # 确保用户存在后自动创建农场
            db.get_or_create_user(user_id, f"user_{user_id}")
            farm = db.get_or_create_farm(user_id)

        # 更新作物生长状态
        db.update_crop_growth(farm['id'])

        # 获取作物（生长更新后）
        crops = db.get_crops(farm['id'])

        # 获取背包
        inventory = db.get_inventory(user_id)

        # 获取作物类型
        crop_types = db.get_crop_types()

        return {
            'success': True,
            'farm': farm,
            'crops': crops,
            'inventory': inventory,
            'crop_types': crop_types
        }

    except Exception as e:
        logger.error(f"[Game API] 获取农场失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/plant")
async def api_plant_crop(
    body: PlantCropRequest,
    user_id: int = Depends(get_current_user),
):
    """种植作物"""
    try:
        db = get_db()

        # 获取农场（自动创建）
        farm = db.get_or_create_farm(user_id)
        if not farm:
            raise HTTPException(status_code=400, detail='农场创建失败')

        # 检查背包是否有种子
        if not db.remove_item(user_id, 'seed', body.crop_type):
            raise HTTPException(status_code=400, detail='背包中没有该种子')

        # 种植
        success = db.plant_crop(farm['id'], body.x, body.y, body.crop_type)

        if success:
            # 记录事件
            db.log_game_event(user_id, 'plant', {
                'x': body.x, 'y': body.y, 'crop_type': body.crop_type
            }, 'web')

            notify_state_change(user_id, ['crops', 'inventory'])

            return {
                'success': True,
                'message': f'种下了 {body.crop_type}'
            }
        else:
            raise HTTPException(status_code=400, detail='这个位置已经有作物了')

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Game API] 种植失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/harvest")
async def api_harvest_crop(
    body: HarvestCropRequest,
    user_id: int = Depends(get_current_user),
):
    """收获作物"""
    try:
        db = get_db()

        # 获取农场
        farm = db.get_farm(user_id)
        if not farm:
            raise HTTPException(status_code=400, detail='没有农场')

        # 收获
        crop_type = db.harvest_crop(farm['id'], body.x, body.y)

        if crop_type:
            # 添加到背包
            db.add_item(user_id, 'crop', crop_type, 1)

            # 获取作物信息
            crop_info = db.get_crop_type(crop_type)

            # 概率奖励
            rewards = _calculate_harvest_rewards(db, user_id, crop_type, crop_info)

            # 记录事件
            db.log_game_event(user_id, 'harvest', {
                'x': body.x, 'y': body.y, 'crop_type': crop_type
            }, 'web')

            notify_state_change(user_id, ['crops', 'inventory'])

            return {
                'success': True,
                'crop_type': crop_type,
                'crop_name': crop_info['name'] if crop_info else crop_type,
                'emoji': crop_info['emoji'] if crop_info else '🌱',
                'rewards': rewards
            }
        else:
            raise HTTPException(status_code=400, detail='这里没有可收获的作物')

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Game API] 收获失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk-harvest")
async def api_bulk_harvest(user_id: int = Depends(get_current_user)):
    """一键收获所有成熟作物"""
    try:
        db = get_db()

        farm = db.get_farm(user_id)
        if not farm:
            raise HTTPException(status_code=400, detail='没有农场')

        # 先更新生长状态
        db.update_crop_growth(farm['id'])

        # 获取所有作物
        crops = db.get_crops(farm['id'])
        harvested = []
        rewards = []

        for crop in crops:
            if crop.get('is_harvestable'):
                result = db.harvest_crop(farm['id'], crop['tile_x'], crop['tile_y'])
                if result:
                    db.add_item(user_id, 'crop', result, 1)
                    crop_info = db.get_crop_type(result)
                    harvested.append({
                        'type': result,
                        'emoji': crop_info['emoji'] if crop_info else '🌾',
                        'name': crop_info['name'] if crop_info else result
                    })

                    # 概率奖励
                    rewards.extend(_calculate_harvest_rewards(db, user_id, result, crop_info))

        if harvested:
            db.log_game_event(user_id, 'harvest', {'crops': [h['type'] for h in harvested]}, 'web')
            notify_state_change(user_id, ['crops', 'inventory'])

        return {
            'success': True,
            'harvested': harvested,
            'count': len(harvested),
            'rewards': rewards
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Game API] 批量收获失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sell")
async def api_sell_crop(
    body: SellCropRequest,
    user_id: int = Depends(get_current_user),
):
    """出售作物"""
    try:
        db = get_db()

        # 检查背包
        if not db.remove_item(user_id, 'crop', body.crop_type, body.quantity):
            raise HTTPException(status_code=400, detail='背包里没有这个作物')

        # 获取售价
        crop_info = db.get_crop_type(body.crop_type)
        price = crop_info['sell_price'] if crop_info else 10
        total = price * body.quantity

        # 更新金钱
        farm = db.get_farm(user_id)
        db.update_farm(user_id, money=farm['money'] + total)

        # 记录事件
        db.log_game_event(user_id, 'sell', {
            'crop_type': body.crop_type,
            'quantity': body.quantity,
            'total': total
        }, 'web')

        notify_state_change(user_id, ['farm', 'inventory'])

        return {
            'success': True,
            'earned': total,
            'message': f'卖出 {body.quantity} 个，获得 {total} 金币'
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Game API] 出售失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/buy-seed")
async def api_buy_seed(
    body: BuySeedRequest,
    user_id: int = Depends(get_current_user),
):
    """购买种子"""
    try:
        db = get_db()

        # 获取种子价格
        crop_info = db.get_crop_type(body.crop_type)
        if not crop_info:
            raise HTTPException(status_code=400, detail='未知的作物类型')

        price = crop_info['seed_price'] * body.quantity

        # 检查金钱
        farm = db.get_farm(user_id)
        if not farm or farm['money'] < price:
            raise HTTPException(status_code=400, detail=f'金币不足（需要 {price}）')

        # 扣钱
        db.update_farm(user_id, money=farm['money'] - price)

        # 添加种子
        db.add_item(user_id, 'seed', body.crop_type, body.quantity)

        # 记录事件
        db.log_game_event(user_id, 'buy_seed', {
            'crop_type': body.crop_type,
            'quantity': body.quantity,
            'cost': price
        }, 'web')

        notify_state_change(user_id, ['farm', 'inventory'])

        return {
            'success': True,
            'cost': price,
            'message': f'购买 {body.quantity} 个 {crop_info["name"]} 种子'
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Game API] 购买失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/water")
async def api_water_crop(
    body: WaterCropRequest,
    user_id: int = Depends(get_current_user),
):
    """浇水"""
    try:
        db = get_db()
        farm = db.get_farm(user_id)
        if not farm:
            raise HTTPException(status_code=400, detail='没有农场')

        success = db.water_crop(farm['id'], body.x, body.y)

        if success:
            db.log_game_event(user_id, 'water', {'x': body.x, 'y': body.y}, 'web')
            notify_state_change(user_id, ['crops'])
            return {'success': True, 'message': '浇水完成'}
        else:
            raise HTTPException(status_code=400, detail='这里没有作物')

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Game API] 浇水失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/move")
async def api_move_player(
    body: MovePlayerRequest,
    user_id: int = Depends(get_current_user),
):
    """记录玩家位置"""
    try:
        db = get_db()
        db.save_player_position(user_id, body.x, body.y, body.direction)
        return {'success': True}

    except Exception as e:
        logger.error(f"[Game API] 移动失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# 烹饪 + 每日签到路由 (cooking_routes.py)
# ============================================================

@router.get("/recipes")
async def api_get_recipes(user_id: int = Depends(get_current_user)):
    """获取所有料理配方"""
    try:
        db = get_db()
        recipes = db.get_recipes()
        inventory = db.get_inventory(user_id)

        # 标记每个配方是否可以烹饪
        for recipe in recipes:
            can, msg = db.can_cook(user_id, recipe['id'])
            recipe['can_cook'] = can
            recipe['cook_message'] = msg

        return {
            'success': True,
            'recipes': recipes,
            'inventory': inventory
        }

    except Exception as e:
        logger.error(f"[Game API] 获取配方失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cook")
async def api_cook(
    body: CookRequest,
    user_id: int = Depends(get_current_user),
):
    """烹饪料理"""
    try:
        db = get_db()
        recipe = db.cook(user_id, body.recipe_id)

        if recipe:
            db.log_game_event(user_id, 'cook', {
                'recipe_id': body.recipe_id,
                'recipe_name': recipe['name']
            }, 'miniapp')

            return {
                'success': True,
                'recipe': recipe,
                'message': f"烹饪成功！{recipe['emoji']} {recipe['name']}"
            }
        else:
            can, msg = db.can_cook(user_id, body.recipe_id)
            raise HTTPException(status_code=400, detail=msg or '材料不足')

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Game API] 烹饪失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/daily/claim")
async def api_daily_reward(user_id: int = Depends(get_current_user)):
    """领取每日登录奖励"""
    try:
        db = get_db()
        # 确保用户存在
        db.get_or_create_user(user_id, f"web_{user_id}")
        result = db.claim_daily_reward(user_id)

        return result

    except Exception as e:
        logger.error(f"[Game API] 每日签到失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/daily/check")
async def api_check_daily(user_id: int = Depends(get_current_user)):
    """检查今日是否已签到"""
    try:
        db = get_db()
        # 确保用户存在
        db.get_or_create_user(user_id, f"web_{user_id}")
        reward = db.get_daily_reward(user_id)

        return {
            'success': True,
            'claimed': reward['claimed'] == 1 if reward else False
        }

    except Exception as e:
        logger.error(f"[Game API] 检查签到失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# 心级事件路由 (heart_routes.py)
# ============================================================

@router.get("/events/heart")
async def api_check_heart_events(user_id: int = Depends(get_current_user)):
    """检查可触发的心级事件"""
    try:
        character = get_current_character()
        character_id = character.config.id if character else 'chayewoon'

        db = get_db()

        # 获取角色当前位置
        location = db.get_character_location(character_id)
        current_hour = datetime.now(get_default_tz()).hour if location else 99

        # 获取可触发事件
        available = db.get_available_events(user_id, character_id)

        # 检查是否有符合当前场景的事件
        triggerable = []
        for event in available:
            # 检查位置
            if event.get('trigger_location') and location:
                if event['trigger_location'] != location['location']:
                    continue

            # 检查时间
            if event.get('trigger_time_start') is not None:
                if current_hour < event['trigger_time_start'] or current_hour >= event.get('trigger_time_end', 24):
                    continue

            triggerable.append(event)

        return {
            'success': True,
            'events': triggerable,
            'current_location': location['location'] if location else None,
            'current_hour': current_hour
        }

    except Exception as e:
        logger.error(f"[Game API] 检查事件失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/events/trigger")
async def api_trigger_heart_event(
    body: TriggerHeartEventRequest,
    user_id: int = Depends(get_current_user),
):
    """触发心级事件"""
    try:
        if not body.event_id:
            raise HTTPException(status_code=400, detail='缺少事件ID')

        db = get_db()

        # 触发事件
        event = db.trigger_event(user_id, body.event_id)

        if not event:
            raise HTTPException(status_code=400, detail='事件不存在或已触发')

        # 解析对话
        dialogue = []
        try:
            dialogue = json.loads(event.get('dialogue', '[]'))
        except Exception:
            pass

        # 解析奖励
        rewards = {}
        try:
            rewards = json.loads(event.get('rewards', '{}'))
        except Exception:
            pass

        # 获取新的关系状态
        relationship = db.get_relationship(user_id, event['character_id'])

        # 记录游戏事件
        db.log_game_event(user_id, 'heart_event', {
            'event_id': body.event_id,
            'title': event.get('title', ''),
            'rewards': rewards
        }, 'miniapp')

        return {
            'success': True,
            'event': {
                'id': event['id'],
                'title': event.get('title', ''),
                'description': event.get('description', ''),
                'dialogue': dialogue,
                'rewards': rewards
            },
            'relationship': relationship
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Game API] 触发事件失败: {e}")
        raise HTTPException(status_code=400, detail=str(e))
