"""
LoveSupremacy 服务层
提供 LLM 路由、TTS、图像生成、角色进化等核心服务
"""

from services.tts_service import TTSService, text_to_speech
from services.image_service import ImageGenerationService, get_image_service
from services.evolution_service import EvolutionService, analyze_and_evolve
from services.llm_service import LLMRouterService, get_llm_service, llm_chat

__all__ = [
    'TTSService', 'text_to_speech',
    'ImageGenerationService', 'get_image_service',
    'EvolutionService', 'analyze_and_evolve',
    'LLMRouterService', 'get_llm_service', 'llm_chat',
]
