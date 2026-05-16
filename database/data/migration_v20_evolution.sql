-- ============================================================
-- 角色进化记忆系统 - 数据库迁移
-- v1.9.3: 新增 character_memory 和 character_state 表
-- ============================================================

-- 角色记忆表：存储从对话中提取的关键记忆
CREATE TABLE IF NOT EXISTS character_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    character_id TEXT NOT NULL DEFAULT 'chayewoon',
    memory_content TEXT NOT NULL,
    memory_type TEXT NOT NULL DEFAULT 'fact',  -- preference, event, emotion, fact
    importance REAL NOT NULL DEFAULT 0.5,       -- 0.0 - 1.0
    created_at TEXT NOT NULL,
    last_accessed TEXT NOT NULL,
    
    -- 索引优化
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 为 character_memory 创建索引
CREATE INDEX IF NOT EXISTS idx_character_memory_user_char 
    ON character_memory(user_id, character_id);
CREATE INDEX IF NOT EXISTS idx_character_memory_importance 
    ON character_memory(importance DESC);
CREATE INDEX IF NOT EXISTS idx_character_memory_type 
    ON character_memory(memory_type);

-- 角色状态表：存储角色的情绪状态和进化信息
CREATE TABLE IF NOT EXISTS character_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    character_id TEXT NOT NULL DEFAULT 'chayewoon',
    
    -- 情绪状态
    emotion_state TEXT NOT NULL DEFAULT 'neutral',  -- neutral, happy, sad, angry, loving, etc.
    emotion_valence REAL NOT NULL DEFAULT 0.0,      -- 效价: -1.0 (负面) 到 1.0 (正面)
    emotion_arousal REAL NOT NULL DEFAULT 0.0,      -- 唤醒度: -1.0 (平静) 到 1.0 (激动)
    
    -- 进化系统
    evolution_points INTEGER NOT NULL DEFAULT 0,    -- 累积进化点数
    personality_traits TEXT NOT NULL DEFAULT '{}', -- JSON: 性格特征
    system_prompt_additions TEXT NOT NULL DEFAULT '', -- 额外的系统提示词
    
    updated_at TEXT NOT NULL,
    
    -- 唯一约束：每个用户每个角色只有一条状态记录
    UNIQUE(user_id, character_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 为 character_state 创建索引
CREATE INDEX IF NOT EXISTS idx_character_state_user_char 
    ON character_state(user_id, character_id);
CREATE INDEX IF NOT EXISTS idx_character_state_emotion 
    ON character_state(emotion_state);

-- ============================================================
-- 可选：添加触发器自动更新 last_accessed
-- ============================================================

CREATE TRIGGER IF NOT EXISTS trigger_memory_accessed
AFTER UPDATE ON character_memory
BEGIN
    UPDATE character_memory 
    SET last_accessed = datetime('now') 
    WHERE id = NEW.id;
END;

-- ============================================================
-- 示例数据（可选）
-- ============================================================

-- 示例：为测试用户添加初始记忆
-- INSERT INTO character_memory (user_id, character_id, memory_content, memory_type, importance, created_at, last_accessed)
-- VALUES (1, 'chayewoon', '用户喜欢草莓蛋糕', 'preference', 0.8, datetime('now'), datetime('now'));

-- 示例：为测试用户初始化角色状态
-- INSERT INTO character_state (user_id, character_id, emotion_state, emotion_valence, emotion_arousal, evolution_points, updated_at)
-- VALUES (1, 'chayewoon', 'happy', 0.5, 0.2, 0, datetime('now'));

-- ============================================================
-- 验证迁移
-- ============================================================

-- 查询表结构
.schema character_memory
.schema character_state

-- 查询索引
.indexes character_memory
.indexes character_state
