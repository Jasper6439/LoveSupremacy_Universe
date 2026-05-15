"""
api/routes_media.py - 多媒体生成 API + 上传处理 API
=====================================================
从 game_api/media_routes.py 和 game_api/upload_routes.py 迁移至 FastAPI APIRouter 格式。

包含 9 条路由：

多媒体生成（原 media_routes.py）：
- GET  /api/media/selfie       生成 AI 自拍
- POST /api/media/sticker      生成表情包
- POST /api/media/scene        生成场景图
- POST /api/media/tts          文本转语音

上传处理（原 upload_routes.py）：
- POST /api/upload/voice           上传角色声音
- POST /api/upload/voice/clone     使用 Fish Speech 克隆声音
- POST /api/upload/chatlog         上传聊天记录生成 soul.md
- POST /api/upload/video           上传角色视频学习
- GET  /api/upload/status          获取上传功能状态
"""

import logging
import os
import random
import shutil
import tempfile
import urllib.parse
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from api.deps import get_current_user
from system.prompts import SELFIE_PROMPTS, STICKER_PROMPTS, SCENE_PROMPTS

logger = logging.getLogger(__name__)

router = APIRouter(tags=["media"])


# ============================================================
# 辅助函数
# ============================================================

def _generate_image_url(prompt: str, width: int = 768, height: int = 1024) -> str:
    """生成 Pollinations.ai 图片 URL"""
    encoded = urllib.parse.quote(prompt)
    seed = random.randint(1, 999999)
    return (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width={width}&height={height}&seed={seed}&nologo=true&safe=true"
    )


# ============================================================
# Pydantic 请求体模型
# ============================================================

class GenerateStickerRequest(BaseModel):
    """生成表情包请求体"""
    mood: str = "默认"


class GenerateSceneRequest(BaseModel):
    """生成场景图请求体"""
    scene: str = "天台"


class TTSRequest(BaseModel):
    """文本转语音请求体"""
    text: str = ""


class CloneVoiceRequest(BaseModel):
    """声音克隆请求体"""
    character_id: str = "chayewoon"
    sample_id: Optional[str] = None
    api_key: Optional[str] = None


# ============================================================
# 1. 多媒体生成（原 media_routes.py）
# ============================================================

@router.get("/api/media/selfie")
async def api_generate_selfie(
    user_id: int = Depends(get_current_user),
):
    """生成 AI 自拍 API"""
    try:
        prompt = random.choice(SELFIE_PROMPTS)
        url = _generate_image_url(prompt, 768, 1024)
        return {
            "success": True,
            "url": url,
            "type": "selfie",
            "width": 768,
            "height": 1024,
        }
    except Exception as e:
        logger.error(f"[Game API] 生成自拍失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/media/sticker")
async def api_generate_sticker(
    body: GenerateStickerRequest,
    user_id: int = Depends(get_current_user),
):
    """生成表情包 API"""
    try:
        mood = body.mood
        prompts = STICKER_PROMPTS.get(mood, STICKER_PROMPTS.get("默认", []))
        if not prompts:
            prompts = STICKER_PROMPTS["默认"]

        prompt = random.choice(prompts)
        url = _generate_image_url(prompt, 512, 512)
        return {
            "success": True,
            "url": url,
            "type": "sticker",
            "mood": mood,
            "width": 512,
            "height": 512,
        }
    except Exception as e:
        logger.error(f"[Game API] 生成表情包失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/media/scene")
async def api_generate_scene(
    body: GenerateSceneRequest,
    user_id: int = Depends(get_current_user),
):
    """生成场景图 API"""
    try:
        scene = body.scene
        prompts = SCENE_PROMPTS.get(scene, SCENE_PROMPTS.get("天台", []))
        if not prompts:
            prompts = SCENE_PROMPTS["天台"]

        prompt = random.choice(prompts)
        url = _generate_image_url(prompt, 1024, 768)
        return {
            "success": True,
            "url": url,
            "type": "scene",
            "scene": scene,
            "width": 1024,
            "height": 768,
        }
    except Exception as e:
        logger.error(f"[Game API] 生成场景图失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/media/tts")
async def api_tts(
    body: TTSRequest,
    user_id: int = Depends(get_current_user),
):
    """文本转语音 API"""
    try:
        text = body.text

        if not text or len(text) > 300:
            raise HTTPException(status_code=400, detail="文本为空或超过300字符")

        # 使用 tts_engine 生成语音
        try:
            from characters.tts_engine import TTSEngine
            tts = TTSEngine()
            audio_path = await tts.synthesize(text)

            if audio_path:
                # 返回音频文件路径（相对于 static）
                audio_filename = os.path.basename(audio_path)
                return {
                    "success": True,
                    "audio_url": f"/static/tts/{audio_filename}",
                    "duration": len(text) * 0.15,  # 估算时长
                }
            # synthesize 返回 None，走 edge_tts fallback
            raise ImportError("TTSEngine synthesize failed")

        except ImportError:
            # tts_engine 不可用或失败，直接使用 Edge TTS
            import edge_tts

            communicate = edge_tts.Communicate(text, "zh-CN-XiaoyiNeural")
            with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
                tmp_path = tmp.name

            await communicate.save(tmp_path)

            # 移动到 static/tts 目录
            tts_dir = os.path.join(
                os.path.dirname(os.path.dirname(__file__)), "static", "tts"
            )
            os.makedirs(tts_dir, exist_ok=True)

            audio_filename = f"tts_{user_id}_{int(datetime.now().timestamp())}.ogg"
            final_path = os.path.join(tts_dir, audio_filename)
            shutil.move(tmp_path, final_path)

            return {
                "success": True,
                "audio_url": f"/static/tts/{audio_filename}",
                "duration": len(text) * 0.15,
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Game API] TTS 失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 2. 声音上传（原 upload_routes.py）
# ============================================================

@router.post("/api/upload/voice")
async def api_upload_voice(
    voice_file: UploadFile = File(...),
    character_id: str = Form("chayewoon"),
    label: str = Form("用户上传"),
    description: str = Form(""),
    user_id: int = Depends(get_current_user),
):
    """上传角色声音样本

    POST /api/upload/voice
    Form: voice_file, character_id, label, description
    """
    try:
        if not voice_file or not voice_file.filename:
            raise HTTPException(status_code=400, detail="未提供声音文件")

        # 保存临时文件
        ext = (
            voice_file.filename.split(".")[-1]
            if "." in voice_file.filename
            else "mp3"
        )
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
            content = await voice_file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # 保存到角色声音库
        from characters.voice_manager import get_voice_manager
        vm = get_voice_manager(character_id)
        result = vm.save_voice_sample(tmp_path, label=label, description=description)

        # 清理临时文件
        os.unlink(tmp_path)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Upload] 声音上传失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/upload/voice/clone")
async def api_clone_voice(
    body: CloneVoiceRequest,
    user_id: int = Depends(get_current_user),
):
    """使用 Fish Speech 克隆声音

    POST /api/upload/voice/clone
    Body: { "character_id": "chayewoon", "sample_id": "sample_1", "api_key": "xxx" }
    """
    try:
        character_id = body.character_id
        sample_id = body.sample_id
        api_key = body.api_key

        if not sample_id or not api_key:
            raise HTTPException(status_code=400, detail="缺少 sample_id 或 api_key")

        from characters.voice_manager import get_voice_manager
        vm = get_voice_manager(character_id)

        # 获取样本路径
        samples = vm.list_samples()
        sample_path = None
        for s in samples:
            if s["id"] == sample_id:
                sample_path = s.get("path")
                break

        if not sample_path or not os.path.exists(sample_path):
            raise HTTPException(status_code=404, detail="样本不存在")

        result = await vm.clone_voice_fish(sample_path, api_key)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Upload] 声音克隆失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 3. 聊天记录上传（原 upload_routes.py）
# ============================================================

@router.post("/api/upload/chatlog")
async def api_upload_chatlog(
    chatlog_file: UploadFile = File(...),
    chat_partner: str = Form(""),
    user_id: int = Depends(get_current_user),
):
    """上传聊天记录生成 soul.md

    POST /api/upload/chatlog
    Form: chatlog_file, chat_partner
    """
    try:
        if not chatlog_file or not chatlog_file.filename:
            raise HTTPException(status_code=400, detail="未提供聊天记录文件")

        # 读取文件内容
        content = await chatlog_file.read()

        try:
            text_content = content.decode("utf-8")
        except UnicodeDecodeError:
            text_content = content.decode("gbk", errors="ignore")

        # 解析聊天记录
        from packages.analysis.chatlog import parse_wechat_chatlog
        parsed = parse_wechat_chatlog(text_content)

        if not parsed or not parsed.get("messages"):
            raise HTTPException(status_code=400, detail="无法解析聊天记录")

        # 生成 soul.md
        from characters.soul_manager import generate_soul_from_chatlog
        result = await generate_soul_from_chatlog(parsed, chat_partner or "好友")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Upload] 聊天记录上传失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 4. 视频上传（原 upload_routes.py）
# ============================================================

@router.post("/api/upload/video")
async def api_upload_video(
    video_file: UploadFile = File(...),
    character_id: str = Form("chayewoon"),
    content_type: str = Form("剧集"),
    user_id: int = Depends(get_current_user),
):
    """上传角色视频进行学习

    POST /api/upload/video
    Form: video_file, character_id, content_type
    """
    try:
        if not video_file or not video_file.filename:
            raise HTTPException(status_code=400, detail="未提供视频文件")

        # 保存视频文件
        from system.config import VIDEO_DIR
        os.makedirs(VIDEO_DIR, exist_ok=True)

        ext = (
            video_file.filename.split(".")[-1]
            if "." in video_file.filename
            else "mp4"
        )
        video_path = os.path.join(
            VIDEO_DIR, f"upload_{character_id}_{int(os.times().system)}.{ext}"
        )

        content = await video_file.read()
        with open(video_path, "wb") as f:
            f.write(content)

        # 处理视频
        from packages.importers.video_enhanced import import_video_for_learning
        result = await import_video_for_learning(video_path, character_id, content_type)

        # 清理视频文件（节省空间）
        if os.path.exists(video_path):
            os.remove(video_path)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Upload] 视频上传失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 5. 上传状态查询（原 upload_routes.py）
# ============================================================

@router.get("/api/upload/status")
async def api_upload_status(
    character_id: str = "chayewoon",
    user_id: int = Depends(get_current_user),
):
    """获取上传功能状态

    GET /api/upload/status?character_id=chayewoon
    """
    try:
        from characters.voice_manager import get_voice_manager
        from characters.soul_manager import get_soul_manager

        vm = get_voice_manager(character_id)
        sm = get_soul_manager()

        voice_status = vm.get_status()
        soul_exists = os.path.exists(sm.soul_path)

        return {
            "success": True,
            "character_id": character_id,
            "voice": voice_status,
            "soul": {
                "exists": soul_exists,
                "path": sm.soul_path if soul_exists else None,
            },
        }
    except Exception as e:
        logger.error(f"[Upload] 获取状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
