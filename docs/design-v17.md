# 🎮 NxSiran Universe v1.7 - 架构设计文档

> **版本**: 2.0 (FastAPI + React + Phaser Hybrid)  
> **日期**: 2026-05-15  
> **状态**: 待审阅  
> **前置阅读**: AGENTS.md, design.md, PROJECT_CONTEXT.md, docs/GAME_SYSTEM_OVERVIEW.md

---

## 0. 设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 后端框架 | **FastAPI** (替换 aiohttp) | 原生 async/await、自动 OpenAPI 文档、依赖注入、SSE 支持更好 |
| Telegram 框架 | **保留 python-telegram-bot** | 已有大量 handler 逻辑，无需改动 |
| 数据库 | **SQLite + aiosqlite** | 渐进式异步化，短期 run_in_threadpool 兼容 |
| 游戏引擎 | **Phaser 4** (保留) | 已有 2.5D 等轴测基础框架 |
| 前端 | **React + Vite** (保留) | 已有完整 UI 组件 |
| webhook_server | **保留 aiohttp** | 独立 DevOps 服务，不涉及业务逻辑 |

---

## 1. 架构总览

### 1.1 "单一大脑，多重面孔"

```
┌─────────────────────────────────────────────────────────┐
│                    e2-micro VM (1GB RAM)                  │
│                                                         │
│  ┌──────────────┐    ┌──────────────────────────────┐   │
│  │  Telegram Bot │    │     FastAPI (uvicorn)        │   │
│  │  (polling)    │    │     Port: 8080               │   │
│  │              │    │                              │   │
│  │  handlers/   │───>│  /api/chat      (统一聊天)   │   │
│  │  commands/   │    │  /api/game/*    (游戏逻辑)   │   │
│  │              │    │  /api/user/*    (用户认证)   │   │
│  └──────────────┘    │  /api/characters/* (角色)     │   │
│         │            │  /sse/*        (实时推送)     │   │
│         │            │                              │   │
│         │            │  Static: web-v2/dist/         │   │
│         │            └──────────┬───────────────────┘   │
│         │                       │                       │
│         │            ┌──────────▼───────────────────┐   │
│         │            │   SQLite (aiosqlite)          │   │
│         │            │   database/data/game.db       │   │
│         │            └──────────────────────────────┘   │
│         │                                               │
│  ┌──────▼────────┐    ┌──────────────────────────────┐   │
│  │ webhook_server│    │   Memory Monitor             │   │
│  │ (aiohttp)     │    │   tools/memory_monitor.py    │   │
│  │ Port: 8082    │    │   >85% 清理 / >95% 重启      │   │
│  └───────────────┘    └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │
         │ async API calls
         ▼
┌─────────────────────┐
│   Cloud Layer        │
│   OpenRouter (LLM)   │
│   Gemini 2.5 (图像)  │
│   Edge TTS (语音)    │
└─────────────────────┘
```

### 1.2 共享事件循环

**关键设计**: python-telegram-bot 和 FastAPI 共享同一个 asyncio 事件循环。

```python
# main.py (新入口)
import asyncio
from fastapi import FastAPI
import uvicorn
from telegram import Update
from telegram.ext import ApplicationBuilder

async def main():
    # 1. 创建 FastAPI app
    app = FastAPI()
    register_routes(app)
    
    # 2. 创建 Telegram Application
    tg_app = ApplicationBuilder().token(TOKEN).build()
    register_handlers(tg_app)
    
    # 3. 共享事件循环: uvicorn 在子线程中运行 FastAPI
    #    python-telegram-bot 在主线程中运行 polling
    config = uvicorn.Config(app, host="0.0.0.0", port=8080, log_level="info")
    server = uvicorn.Server(config)
    
    await asyncio.gather(
        server.serve(),
        tg_app.initialize(),
        tg_app.start(),
        tg_app.updater.start_polling(),
    )
```

---

## 2. 目录结构 (v1.7)

```
NxSiran_Bot/
├── main.py                     # FastAPI + Telegram 共享入口 (新)
├── bot.py                      # 旧入口 (保留作回滚)
│
├── api/                        # FastAPI 路由层 (新，从 game_api/ + packages/web/ 合并)
│   ├── __init__.py             # 路由注册
│   ├── deps.py                 # 依赖注入 (认证、数据库、用户)
│   ├── routes_chat.py          # 统一聊天中枢 (SSE 流式)
│   ├── routes_game.py          # 游戏逻辑 (农场/地图/烹饪)
│   ├── routes_character.py     # 角色互动/送礼/进化
│   ├── routes_user.py          # 用户认证/注册/配置
│   ├── routes_media.py         # 多媒体 (自拍/贴纸/TTS)
│   ├── routes_sync.py          # SSE 状态同步
│   └── routes_static.py        # 静态文件 + SPA fallback
│
├── core/                       # 核心业务逻辑层 (从 characters/ 精简)
│   ├── ai_engine.py            # OpenRouter/Gemini 调用 (从 ai_client.py)
│   ├── rag_engine.py           # BM25 + LightRAG 混合检索
│   ├── state_manager.py        # 游戏状态序列化 + 版本号
│   ├── chat_engine.py          # Web/Telegram 统一对话引擎
│   └── emotion.py              # 情绪识别
│
├── system/                     # 系统级模块 (保留)
│   ├── config.py               # 全局配置
│   ├── auth.py                 # 认证逻辑
│   ├── database.py             # aiosqlite 连接管理 (新)
│   ├── scheduler.py            # 定时任务
│   └── webhook_server.py       # DevOps 服务 (保留 aiohttp)
│
├── database/                   # 数据库层 (保留 Mixin 模式)
│   ├── base.py                 # 连接管理 (改为 aiosqlite)
│   ├── farm.py                 # FarmMixin
│   ├── maps.py                 # MapMixin
│   ├── relationship.py         # RelationshipMixin
│   ├── cooking.py              # CookingMixin
│   ├── events.py               # EventsMixin
│   ├── inventory.py            # InventoryMixin
│   ├── chat.py                 # ChatMixin
│   └── player.py               # PlayerMixin
│
├── packages/                   # Telegram Bot 子包 (保留)
│   ├── handlers/               # Update 处理
│   ├── commands/               # Bot 命令
│   └── bridge/                 # VM 桥接
│
├── characters/                 # 角色数据 (保留)
│   ├── chayewoon/              # 车如云
│   └── ...
│
├── web-v2/                     # 前端 (保留，微调 API 调用)
│   ├── src/
│   └── dist/                   # 构建产物 (由 FastAPI 托管)
│
├── tools/                      # 运维脚本 (保留)
│   ├── memory_monitor.py
│   └── optimize_memory.sh
│
├── data/                       # 运行时数据
│   └── game.db                 # SQLite 数据库
│
├── docs/                       # 文档
│   ├── GAME_SYSTEM_OVERVIEW.md
│   └── design-v17.md           # 本文档
│
├── AGENTS.md                   # 项目宪法
├── design.md                   # 技术蓝图 (更新)
├── PROJECT_CONTEXT.md          # 业务背景 (更新)
└── memory.md                   # Agent 记忆
```

### 2.1 与现有目录的映射关系

| 现有路径 | v1.7 路径 | 变更类型 |
|----------|-----------|----------|
| `bot.py` | `main.py` | 重写入口 |
| `game_api/__init__.py` | `api/__init__.py` | 合并路由注册 |
| `game_api/farm_routes.py` | `api/routes_game.py` | 合并游戏路由 |
| `game_api/character_routes.py` | `api/routes_character.py` | 合并角色路由 |
| `game_api/sync_routes.py` | `api/routes_sync.py` | 合并同步路由 |
| `game_api/media_routes.py` | `api/routes_media.py` | 合并媒体路由 |
| `packages/web/routes.py` | `api/routes_user.py` + `api/routes_static.py` | 拆分 |
| `game_api/auth.py` | `api/deps.py` | 改为 Depends 注入 |
| `characters/ai_client.py` | `core/ai_engine.py` | 移动+精简 |
| `characters/retrieval_engine.py` | `core/rag_engine.py` | 移动 |
| `characters/chat_engine.py` | `core/chat_engine.py` | 移动 |
| `game_api/game_state.py` | `core/state_manager.py` | 移动 |
| `database/base.py` | `system/database.py` + `database/base.py` | 拆分连接管理 |

---

## 3. 统一聊天中枢 (Unified Chat Hub)

### 3.1 设计目标

无论用户在 Telegram 还是 Web 端发起对话，AI 的记忆、性格、情绪必须完全一致。

### 3.2 API 设计

```
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "你好，小樱！",
  "character_id": "chayewoon",      // 可选，默认角色
  "stream": true                     // 是否流式响应
}
```

**流式响应 (SSE)**:
```
Content-Type: text/event-stream

data: {"type": "thinking", "content": ""}

data: {"type": "token", "content": "你"}

data: {"type": "token", "content": "好"}

data: {"type": "token", "content": "呀"}

data: {"type": "emotion", "value": "happy"}

data: {"type": "done", "content": "", "usage": {"tokens": 156}}
```

**非流式响应**:
```json
{
  "response": "你好呀！有什么想跟我聊的吗？🌸",
  "emotion": "happy",
  "character_id": "chayewoon",
  "usage": {"tokens": 156}
}
```

### 3.3 核心流程

```
用户消息
  │
  ▼
[core/chat_engine.py]
  ├── 1. 情绪检测 (emotion.py)
  ├── 2. RAG 检索 (rag_engine.py)
  │     ├── BM25 关键词匹配 (<10ms)
  │     └── LightRAG 语义检索 (未命中时)
  ├── 3. 组装 Prompt (系统提示 + 角色设定 + 记忆 + 检索结果)
  ├── 4. 上下文截断 (MAX_CONTEXT_TOKENS=1024)
  ├── 5. 调用 AI (ai_engine.py)
  │     ├── stream=True → OpenRouter SSE
  │     └── stream=False → OpenRouter REST
  ├── 6. 流式/非流式返回
  └── 7. 保存聊天记录 + 更新记忆
```

### 3.4 Telegram 集成

Telegram handler 通过**直接 Python 调用** `core/chat_engine.py`，不经过 HTTP：

```python
# packages/handlers/text_message.py
from core.chat_engine import ChatEngine

async def handle_message(update, context):
    engine = ChatEngine(character_id="chayewoon")
    response = await engine.chat(update.message.text)
    await update.message.reply_text(response)
```

---

## 4. FastAPI 路由层设计

### 4.1 依赖注入 (api/deps.py)

```python
from fastapi import Depends, Header, HTTPException
from system.database import get_db
from database import GameDatabase

async def get_current_user(
    authorization: str = Header(None)
) -> int:
    """统一认证依赖，返回 user_id"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401)
    token = authorization[7:]
    # 复用现有认证逻辑
    user_id = validate_token(token)
    if not user_id:
        raise HTTPException(status_code=401)
    return user_id

async def get_db_session() -> AsyncGenerator[GameDatabase, None]:
    """数据库会话依赖"""
    db = get_db()
    try:
        yield db
    finally:
        pass  # 连接由线程本地管理
```

### 4.2 路由注册 (api/__init__.py)

```python
from fastapi import FastAPI
from api.routes_chat import router as chat_router
from api.routes_game import router as game_router
from api.routes_character import router as character_router
from api.routes_user import router as user_router
from api.routes_media import router as media_router
from api.routes_sync import router as sync_router
from api.routes_static import router as static_router

def create_app() -> FastAPI:
    app = FastAPI(
        title="NxSiran Universe",
        version="1.7.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )
    
    # CORS
    app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
    
    # 路由
    app.include_router(chat_router, prefix="/api")
    app.include_router(game_router, prefix="/api/game")
    app.include_router(character_router, prefix="/api")
    app.include_router(user_router, prefix="/api")
    app.include_router(media_router, prefix="/api")
    app.include_router(sync_router, prefix="/api")
    app.include_router(static_router)
    
    return app
```

### 4.3 SSE 流式推送

```python
# api/routes_chat.py
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from core.chat_engine import ChatEngine

router = APIRouter()

@router.post("/chat")
async def chat(
    request: ChatRequest,
    user_id: int = Depends(get_current_user)
):
    if request.stream:
        return StreamingResponse(
            stream_chat(request, user_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            }
        )
    else:
        engine = ChatEngine(character_id=request.character_id)
        result = await engine.chat(request.message)
        return result

async def stream_chat(request, user_id):
    engine = ChatEngine(character_id=request.character_id)
    async for event in engine.chat_stream(request.message):
        yield f"data: {event.json()}\n\n"
```

---

## 5. 数据库层迁移

### 5.1 渐进式异步化

**阶段一 (v1.7)**: 使用 `run_in_threadpool` 包装同步调用

```python
# system/database.py
import sqlite3
from concurrent.futures import ThreadPoolExecutor
import asyncio

_thread_pool = ThreadPoolExecutor(max_workers=4)

class AsyncGameDatabase:
    def __init__(self, db_path: str):
        self._sync_db = GameDatabase(db_path)  # 复用现有同步 DB
    
    async def get_farm(self, user_id: int):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            self._sync_db.get_or_create_farm,
            user_id
        )
```

**阶段二 (v1.8)**: 迁移到 aiosqlite

```python
import aiosqlite

class AsyncGameDatabase:
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    async def get_connection(self):
        conn = await aiosqlite.connect(self.db_path)
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA journal_mode=WAL")
        return conn
```

### 5.2 现有 Mixin 兼容

**关键原则**: v1.7 不修改 `database/` 目录下的任何 Mixin 代码。通过 `AsyncGameDatabase` 包装层提供 async 接口，内部委托给同步 `GameDatabase`。

---

## 6. 前端适配

### 6.1 API 调用变更

**最小变更**: 前端 fetch 调用路径完全不变（`/api/chat`, `/api/game/farm` 等），因为 FastAPI 路由保持与 aiohttp 相同的 URL 结构。

**新增 SSE 流式消费**:

```typescript
// web-v2/src/features/chat/ChatPage.tsx
async function streamChat(message: string): Promise<void> {
  const token = localStorage.getItem('auth_token');
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message, stream: true }),
  });
  
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = decoder.decode(value);
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'token') {
          appendMessage(event.content);  // 逐字追加
        } else if (event.type === 'emotion') {
          updateCharacterEmotion(event.value);  // 切换立绘表情
        }
      }
    }
  }
}
```

### 6.2 游戏状态 SSE 对接

当前 web-v2 的 GamePage 使用 Zustand 本地状态。v1.7 需要对接后端 SSE：

```typescript
// 订阅游戏状态变更
const eventSource = new EventSource('/api/game/state/sse', {
  headers: { 'Authorization': `Bearer ${token}` }
});

eventSource.onmessage = (event) => {
  const { version } = JSON.parse(event.data);
  // 版本号变化时拉取增量差异
  fetch(`/api/game/state/diff?version=${lastVersion}`)
    .then(res => res.json())
    .then(diff => applyDiff(diff));
};
```

---

## 7. Telegram 通知推送

### 7.1 Web → Telegram 事件桥接

当 Web 端发生重要事件时，通过 python-telegram-bot 的 `bot.send_message()` 主动推送：

```python
# core/notification.py
from telegram import Bot

async def notify_user(user_id: int, message: str, parse_mode="HTML"):
    """向 Telegram 用户发送通知"""
    bot = Bot(token=TELEGRAM_TOKEN)
    chat_id = get_telegram_chat_id(user_id)  # 从数据库查询绑定关系
    if chat_id:
        await bot.send_message(
            chat_id=chat_id,
            text=message,
            parse_mode=parse_mode
        )

# 使用示例：作物成熟时通知
async def on_crop_harvestable(user_id: int, crop_name: str, emoji: str):
    await notify_user(
        user_id,
        f"🌾 <b>作物成熟!</b>\n\n"
        f"你的{emoji} {crop_name}已经成熟了，快来收获吧！"
    )
```

### 7.2 Telegram 快捷指令

| 指令 | 功能 | 实现 |
|------|------|------|
| `/status` | 查看好感度、背包 | 调用 `core/state_manager.py` |
| `/gift [角色]` | 快速送礼 | 调用 `database/relationship.py` |
| `/farm` | 查看农场状态 | 调用 `database/farm.py` |
| `/chat [内容]` | 快速聊天 | 调用 `core/chat_engine.py` |

---

## 8. 内存生存守则

### 8.1 计算卸载 (不变)

- ❌ 严禁本地 LLM → OpenRouter API
- ❌ 严禁本地生图 → Gemini 2.5 API
- ❌ 严禁本地向量库 → BM25 本地检索

### 8.2 内存熔断 (已实现)

- `tools/memory_monitor.py` 每分钟检测
- RSS > 85%: 自动清理缓存
- RSS > 95%: 告警 + 自愈重启

### 8.3 FastAPI 内存优化

| 措施 | 说明 |
|------|------|
| `run_in_threadpool` | 同步 DB 操作不阻塞事件循环 |
| 连接池限制 | SQLite WAL 模式，max_workers=4 |
| SSE 心跳 | 30 秒心跳，超时自动断开 |
| 响应流式 | AI 回复逐 token 推送，不在内存中拼接完整响应 |
| 静态文件 | 由 uvicorn 直接服务，不经过 Python |

---

## 9. 开发执行路线图

### 阶段一：后端核心 (FastAPI + 统一聊天)

**目标**: FastAPI 替换 aiohttp，打通统一聊天中枢

| 任务 | 优先级 | 预估工时 |
|------|--------|----------|
| 创建 `main.py` 入口 (FastAPI + TG 共享事件循环) | P0 | 2h |
| 创建 `api/deps.py` 依赖注入 | P0 | 1h |
| 迁移 `packages/web/routes.py` → `api/routes_user.py` | P0 | 3h |
| 迁移 `packages/web/chat_routes.py` → `api/routes_chat.py` | P0 | 2h |
| 实现 SSE 流式聊天 | P0 | 3h |
| 迁移静态文件服务 | P1 | 1h |
| 创建 `system/database.py` (AsyncGameDatabase) | P1 | 2h |
| 语法验证 + 测试 | P0 | 1h |

### 阶段二：游戏 API 迁移

**目标**: 所有 game_api 路由迁移到 FastAPI

| 任务 | 优先级 | 预估工时 |
|------|--------|----------|
| 迁移 `game_api/farm_routes.py` → `api/routes_game.py` | P0 | 2h |
| 迁移 `game_api/character_routes.py` → `api/routes_character.py` | P0 | 2h |
| 迁移 `game_api/sync_routes.py` → `api/routes_sync.py` | P0 | 2h |
| 迁移 `game_api/media_routes.py` → `api/routes_media.py` | P1 | 1h |
| 迁移 `game_api/cooking_routes.py` → `api/routes_game.py` | P1 | 1h |
| 迁移 `game_api/map_routes.py` → `api/routes_game.py` | P1 | 1h |
| 迁移 `game_api/heart_routes.py` → `api/routes_character.py` | P1 | 1h |
| 迁移 `game_api/learning_routes.py` → `api/routes_character.py` | P2 | 1h |
| 迁移 `game_api/upload_routes.py` → `api/routes_media.py` | P2 | 1h |

### 阶段三：前端 SSE 对接

**目标**: Web 端消费 SSE 流式推送

| 任务 | 优先级 | 预估工时 |
|------|--------|----------|
| ChatPage 接入 SSE 流式聊天 | P0 | 3h |
| GamePage 对接游戏状态 SSE | P1 | 2h |
| 角色立绘表情切换 | P2 | 2h |

### 阶段四：Telegram 通知 + 优化

**目标**: Web 事件推送到 Telegram，压力测试

| 任务 | 优先级 | 预估工时 |
|------|--------|----------|
| 实现 `core/notification.py` | P1 | 2h |
| 作物成熟/心级事件通知 | P1 | 1h |
| Telegram 快捷指令 | P2 | 2h |
| 压力测试 + 内存监控 | P0 | 2h |

---

## 10. 回滚策略

```bash
# 创建回滚标签
git tag rollback-pre-v17

# 回滚命令
git checkout rollback-pre-v17
git checkout -b rollback-v17
# 或直接 reset
git reset --hard rollback-pre-v17
```

**回滚要点**:
- `bot.py` 保留不删除，随时可切回旧入口
- `main.py` 是新入口，通过 systemd service 配置切换
- 数据库 Schema 不变，无需数据迁移

---

## 11. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 共享事件循环不稳定 | 高 | 使用 asyncio.gather() 确保协程安全 |
| 同步 DB 阻塞事件循环 | 中 | run_in_threadpool + max_workers=4 |
| SSE 连接泄漏 | 中 | 30秒心跳 + 每用户最多3连接 |
| 前端 API 路径不兼容 | 低 | 保持 URL 完全一致 |
| 内存增加 (FastAPI > aiohttp) | 低 | FastAPI 内存占用更低 (实测) |

---

*文档版本: v1.7-draft-1 | 最后更新: 2026-05-15*
