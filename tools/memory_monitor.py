#!/usr/bin/env python3
"""
tools/memory_monitor.py - e2-micro 内存熔断监控

功能：
- 每分钟检测系统内存使用率
- > 85%: 自动清理临时文件、非活跃缓存、LRU 缓存
- > 95%: 记录致命日志、发送 Telegram 告警、执行服务自愈重启
"""

import os
import sys
import gc
import psutil
import logging
import traceback
from datetime import datetime
from pathlib import Path

# 配置日志
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [MEM-MONITOR] %(levelname)s: %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "memory_monitor.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 阈值配置
MEMORY_WARNING_THRESHOLD = 85  # 百分比
MEMORY_CRITICAL_THRESHOLD = 95  # 百分比
BOT_SERVICE = "nxsiran-bot.service"
ADMIN_CHAT_ID = os.environ.get("ADMIN_TELEGRAM_CHAT_ID", "")


def get_memory_usage() -> dict:
    """获取内存使用信息"""
    mem = psutil.virtual_memory()
    return {
        "total": mem.total / (1024 ** 3),  # GB
        "available": mem.available / (1024 ** 3),  # GB
        "used": mem.used / (1024 ** 3),  # GB
        "percent": mem.percent,
    }


def cleanup_temp_files():
    """清理临时文件"""
    temp_paths = [
        Path("/tmp/nxsiran-*"),
        Path(__file__).parent.parent / "data" / "temp",
        Path("/root/.cache/python"),
    ]
    cleaned = 0
    for pattern in temp_paths:
        if "*" in str(pattern):
            for f in pattern.parent.glob(pattern.name):
                try:
                    if f.is_file():
                        f.unlink()
                        cleaned += 1
                except Exception:
                    pass
        else:
            if pattern.exists():
                for f in pattern.rglob("*"):
                    if f.is_file() and f.stat().st_mtime < time.time() - 3600:
                        try:
                            f.unlink()
                            cleaned += 1
                        except Exception:
                            pass
    logger.info(f"清理临时文件: {cleaned} 个")
    return cleaned


def cleanup_caches():
    """清理 Python 缓存和 LRU 缓存"""
    cleaned = 0
    
    # 强制垃圾回收
    gc.collect()
    cleaned += gc.collect()
    
    # 清理 __pycache__
    for pycache in Path(__file__).parent.parent.rglob("__pycache__"):
        try:
            import shutil
            shutil.rmtree(pycache)
            cleaned += 1
        except Exception:
            pass
    
    logger.info(f"清理缓存: {cleaned} 项")
    return cleaned


async def send_telegram_alert(message: str):
    """发送 Telegram 告警"""
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not bot_token or not ADMIN_CHAT_ID:
        logger.warning("Telegram 告警配置不完整，跳过")
        return
    
    try:
        import aiohttp
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        data = {
            "chat_id": ADMIN_CHAT_ID,
            "text": f"🚨 内存告警\n\n{message}",
            "parse_mode": "HTML"
        }
        async with aiohttp.ClientSession() as session:
            await session.post(url, json=data, timeout=aiohttp.ClientTimeout(total=10))
        logger.info("Telegram 告警已发送")
    except Exception as e:
        logger.error(f"Telegram 告警发送失败: {e}")


def restart_service(service_name: str) -> bool:
    """重启 systemd 服务"""
    try:
        import subprocess
        result = subprocess.run(
            ["systemctl", "restart", service_name],
            capture_output=True,
            text=True,
            timeout=60
        )
        if result.returncode == 0:
            logger.info(f"服务 {service_name} 重启成功")
            return True
        else:
            logger.error(f"服务重启失败: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"重启服务异常: {e}")
        return False


async def run_memory_check():
    """执行内存检查"""
    try:
        mem_info = get_memory_usage()
        percent = mem_info["percent"]
        
        logger.info(
            f"内存使用: {mem_info['used']:.2f}GB / {mem_info['total']:.2f}GB "
            f"({percent:.1f}%)"
        )
        
        if percent > MEMORY_CRITICAL_THRESHOLD:
            # 临界状态：记录致命日志 + 告警 + 重启
            logger.critical(
                f"内存临界！({percent:.1f}%) 执行紧急清理和自愈重启"
            )
            await send_telegram_alert(
                f"⚠️ <b>内存临界: {percent:.1f}%</b>\n"
                f"已使用: {mem_info['used']:.2f}GB\n"
                f"可用: {mem_info['available']:.2f}GB\n"
                f"正在执行服务自愈重启..."
            )
            
            # 执行紧急清理
            cleanup_temp_files()
            cleanup_caches()
            
            # 重启 bot 服务
            restart_service(BOT_SERVICE)
            
        elif percent > MEMORY_WARNING_THRESHOLD:
            # 警告状态：清理缓存
            logger.warning(f"内存警告 ({percent:.1f}%) 执行常规清理")
            cleanup_temp_files()
            cleanup_caches()
            
            await send_telegram_alert(
                f"⚡ <b>内存警告: {percent:.1f}%</b>\n"
                f"已执行自动清理"
            )
        else:
            logger.debug(f"内存正常: {percent:.1f}%")
            
    except Exception as e:
        logger.error(f"内存检查异常: {e}")
        logger.error(traceback.format_exc())


def main():
    """主入口"""
    import argparse
    parser = argparse.ArgumentParser(description="内存熔断监控")
    parser.add_argument("--once", action="store_true", help="单次检查后退出")
    args = parser.parse_args()
    
    if args.once:
        # 单次检查
        import asyncio
        asyncio.run(run_memory_check())
    else:
        # 定时检查（每分钟）
        import asyncio
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        
        scheduler = AsyncIOScheduler()
        scheduler.add_job(run_memory_check, "interval", minutes=1)
        scheduler.start()
        
        logger.info("内存监控已启动（每分钟检查）")
        logger.info(f"警告阈值: {MEMORY_WARNING_THRESHOLD}%")
        logger.info(f"临界阈值: {MEMORY_CRITICAL_THRESHOLD}%")
        
        try:
            asyncio.get_event_loop().run_forever()
        except (KeyboardInterrupt, SystemExit):
            logger.info("内存监控已停止")


if __name__ == "__main__":
    main()
