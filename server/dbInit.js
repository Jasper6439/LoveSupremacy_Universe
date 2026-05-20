import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, 'data')
const DB_PATH = join(DATA_DIR, 'game.db')

mkdirSync(DATA_DIR, { recursive: true })

// ── 初始化 SQL.js ────────────────────────────────────────────────────────────
const SQL = await initSqlJs()

// ── 加载或创建数据库 ───────────────────────────────────────────────────────
let db
try {
  const buffer = readFileSync(DB_PATH)
  db = new SQL.Database(buffer)
  console.log('[DB] 从磁盘加载现有数据库')
} catch {
  db = new SQL.Database()
  console.log('[DB] 创建新数据库')
}

// ── 保存到磁盘的辅助函数 ────────────────────────────────────────────────────
export function saveDb() {
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(DB_PATH, buffer)
}

// 自动保存：每 30 秒持久化一次
setInterval(saveDb, 30_000)

// ── 优雅关闭时保存 ─────────────────────────────────────────────────────────
process.on('SIGINT', () => { saveDb(); process.exit(0) })
process.on('exit', () => saveDb())

// ── 建表（IF NOT EXISTS 防止重复创建）──────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    UNIQUE NOT NULL,
    password   TEXT    NOT NULL,
    email      TEXT    UNIQUE,
    role       TEXT    DEFAULT 'user',
    created_at TEXT    DEFAULT (datetime('now'))
  );
`)

// 兼容旧数据库：添加 email 和 role 列
try {
  db.run("ALTER TABLE users ADD COLUMN email TEXT")
  db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)")
  console.log('[DB] 已添加 email 列')
} catch {
  // 列已存在，忽略
}
try {
  db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
  console.log('[DB] 已添加 role 列')
} catch {
  // 列已存在，忽略
}

db.run(`
  CREATE TABLE IF NOT EXISTS game_state (
    user_id          INTEGER PRIMARY KEY,
    awakening_level  INTEGER DEFAULT 0,
    current_scene    TEXT    DEFAULT 'chat',
    world_mode       TEXT    DEFAULT 'script',
    last_login       TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`)

db.run(`
  CREATE TABLE IF NOT EXISTS inventory (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL,
    item_id  TEXT    NOT NULL,
    quantity INTEGER DEFAULT 0,
    mode     TEXT    DEFAULT 'script',
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, item_id, mode)
  );
`)

db.run(`
  CREATE TABLE IF NOT EXISTS farm_data (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL,
    plot_id        INTEGER NOT NULL,
    crop_type      TEXT,
    grow_progress  INTEGER DEFAULT 0,
    is_watered     INTEGER DEFAULT 0,
    planted_at     INTEGER,
    stage          INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, plot_id)
  );
`)

db.run(`
  CREATE TABLE IF NOT EXISTS chat_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    role       TEXT    NOT NULL,
    content    TEXT    NOT NULL,
    timestamp  TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`)

// ── Telegram 配置表 ─────────────────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS telegram_config (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    bot_token       TEXT,
    admin_chat_id   TEXT,
    public_url      TEXT,
    admin_username  TEXT,
    admin_password  TEXT,
    updated_at      TEXT DEFAULT (datetime('now'))
  );
`)

// 初始化默认配置（管理员 chat id 5315601134）
const tc = db.exec("SELECT COUNT(*) as c FROM telegram_config")
if (tc[0]?.values[0][0] === 0) {
  db.run(`INSERT INTO telegram_config (id, admin_chat_id) VALUES (1, '5315601134')`)
}

db.run(`
  CREATE TABLE IF NOT EXISTS user_telegram (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL UNIQUE,
    chat_id     TEXT    NOT NULL UNIQUE,
    linked_at   TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`)

db.run(`
  CREATE TABLE IF NOT EXISTS character_bots (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT    NOT NULL UNIQUE,
    bot_token    TEXT    NOT NULL,
    name         TEXT    NOT NULL,
    created_at   TEXT    DEFAULT (datetime('now'))
  );
`)

// 初始化默认角色：车如云
const cb = db.exec("SELECT COUNT(*) as c FROM character_bots")
if (cb[0]?.values[0][0] === 0) {
  db.run(`INSERT INTO character_bots (character_id, bot_token, name) VALUES ('charyun', '', '车如云')`)
}

// ── 密码重置表 ──────────────────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    token        TEXT    NOT NULL UNIQUE,
    expires_at  TEXT    NOT NULL,
    used        INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`)

// 初始化25个地块的模板（如果 farm_data 为空）
const count = db.exec("SELECT COUNT(*) as c FROM farm_data")
if (count[0]?.values[0][0] === 0) {
  for (let i = 0; i < 25; i++) {
    db.run('INSERT OR IGNORE INTO farm_data (user_id, plot_id) VALUES (0, ?)', [i])
  }
}

saveDb()
console.log('[DB] 初始化完成，表结构已就绪')
export default db
