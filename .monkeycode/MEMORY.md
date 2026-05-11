# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [代码结构|代码模式|代码生成|构建方法|测试方法|依赖关系|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

[项目知识结构]
- Date: 2026-05-11
- Context: Agent 在执行代码优化任务时发现
- Category: 代码结构
- Instructions:
  - 项目是车如云 Telegram Bot（v3.5），基于 python-telegram-bot 框架
  - 使用 OpenRouter API 作为主要 AI 后端，支持多模型 fallback
  - 备选 AI：Gemini API（用于图片分析、OCR、深度研究等）
  - 数据库使用 SQLite，通过 database.py 的 GameDatabase 类管理
  - 数据目录默认在 /opt/NxSiran/data（可通过 DATA_DIR 环境变量覆盖）
  - bot.py 是主入口文件（4848行），使用 from xxx import * 模式导入模块
  - game_api.py 提供 Web/Mini App 端的游戏 API 接口（农场经营）
  - 角色系统支持多蒸馏角色动态加载（characters/ 目录）
  - 韩国时区 KR_TZ = timezone(timedelta(hours=9)) 多处使用

[项目构建方法]
- Date: 2026-05-11
- Context: Agent 在执行代码优化任务时发现
- Category: 构建方法
- Instructions:
  - 代码质量检查使用 ruff：`ruff check .`
  - ruff.toml 已配置忽略 F403/F405（star imports）和 E402（import 位置）
  - 依赖通过 requirements.txt 管理
  - 启动命令：`python bot.py`
  - Docker 部署支持（Dockerfile + docker-compose.yml）

[项目依赖关系]
- Date: 2026-05-11
- Context: Agent 在执行代码优化任务时发现
- Category: 依赖关系
- Instructions:
  - game_api.py 的认证逻辑依赖 bot.py 中的 validate_session_token/validate_api_token/load_config
  - 使用 sys.modules['bot'] = sys.modules['__main__'] hack 解决循环导入
  - chat_engine.py 是统一对话入口，支持 Web 和 Telegram 双端调用
  - 记忆系统：memory_legacy.py（JSON文件）+ qdrant_memory.py（向量数据库）

[项目环境配置]
- Date: 2026-05-11
- Context: Agent 在执行代码优化任务时发现
- Category: 环境配置
- Instructions:
  - 必需环境变量：TELEGRAM_TOKEN、AI_API_KEY、AI_API_BASE
  - 可选环境变量：DATA_DIR、PORT、AI_MODEL、GEMINI_API_KEY、RELAY_API_KEY
  - 配置通过 config.json（在 DATA_DIR 下）或环境变量管理
  - TTS 语音合成可选：edge-tts（免费）、GPT-SoVITS、Fish Speech
  - edge-tts 是可选依赖，未安装时自动降级
