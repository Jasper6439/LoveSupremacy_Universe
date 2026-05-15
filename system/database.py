"""
system/database.py - 异步数据库包装层 (v1.7)
=============================================
使用 run_in_threadpool 包装同步数据库调用，
避免阻塞 FastAPI 的事件循环。
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# 线程池，用于执行同步数据库操作
_db_thread_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="db-")


async def run_in_threadpool(func, *args, **kwargs):
    """在线程池中执行同步函数，避免阻塞事件循环。

    Args:
        func: 要执行的同步函数
        *args: 位置参数
        **kwargs: 关键字参数

    Returns:
        函数的返回值
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_db_thread_pool, lambda: func(*args, **kwargs))


class AsyncGameDatabase:
    """异步数据库包装类。

    将同步的 GameDatabase 方法包装为异步调用。
    使用方式::

        db = AsyncGameDatabase()
        farm = await db.get_or_create_farm(user_id)
    """

    def __init__(self):
        from database import get_db
        self._sync_db = get_db()

    def __getattr__(self, name):
        """代理所有属性访问到同步数据库实例。

        如果访问的是方法，返回异步包装版本；
        如果是属性，直接返回。
        """
        attr = getattr(self._sync_db, name)
        if callable(attr):
            async def async_wrapper(*args, **kwargs):
                return await run_in_threadpool(attr, *args, **kwargs)
            return async_wrapper
        return attr
