/**
 * pool.js - 模型路由池引擎
 *
 * 核心逻辑：
 * 1. 按免费到期时间排序（越早过期越优先）
 * 2. 按任务复杂度匹配合适能力等级的模型
 * 3. 自动故障转移（fallback）
 * 4. 速率限制追踪
 */

const MODELS = require("./config");

// ─── 运行时状态 ──────────────────────────────────────────
const state = {
  /** { modelId: { lastReset, count } } - 每分钟请求计数 */
  rateCounters: {},
  /** { modelId: true } - 标记为不可用的模型 */
  unhealthy: {},
  /** { modelId: timestamp } - 健康检查冷却 */
  cooldownUntil: {},
};

const RATE_WINDOW_MS = 60_000; // 1分钟窗口
const COOLDOWN_MS = 30_000; // 故障后冷却30秒

// ─── 排序：按免费到期时间优先 ─────────────────────────────

function expirationScore(expiresAt) {
  if (expiresAt === "permanent") return 9999; // 永久免费 = 最低优先级
  if (expiresAt === "unknown") return 999; // 未知 = 较低优先级
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return 999;
  // 越早到期，分数越低（越优先）
  return Math.floor((d.getTime() - Date.now()) / 86400000);
}

function getSortedModels() {
  return [...MODELS].sort((a, b) => {
    // 1. 健康状态：不健康的放最后
    const aHealthy = !state.unhealthy[a.id];
    const bHealthy = !state.unhealthy[b.id];
    if (aHealthy !== bHealthy) return aHealthy ? -1 : 1;

    // 2. 到期时间：越早到期越优先
    const aScore = expirationScore(a.expiresAt);
    const bScore = expirationScore(b.expiresAt);
    if (aScore !== bScore) return aScore - bScore;

    // 3. 同优先级按 tier 排序
    const tierOrder = {
      flagship: 0,
      strong: 1,
      medium: 2,
      light: 3,
      multimodal: 0,
      embedding: 4,
      image: 5,
    };
    return (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99);
  });
}

// ─── 速率限制 ──────────────────────────────────────────

function checkRateLimit(model) {
  const now = Date.now();
  const counter = state.rateCounters[model.id];
  if (!counter || now - counter.lastReset > RATE_WINDOW_MS) {
    state.rateCounters[model.id] = { lastReset: now, count: 0 };
    return true;
  }
  if (counter.count >= (model.rateLimit || 40)) {
    return false; // 超过速率限制
  }
  return true;
}

function incrementRate(modelId) {
  const counter = state.rateCounters[modelId];
  if (counter) counter.count++;
}

// ─── 模型匹配 ──────────────────────────────────────────

/**
 * 根据任务需求匹配合适的模型列表
 * @param {Object} req - 请求参数
 * @param {string} req.tier - 目标能力等级 (flagship|strong|medium|light|multimodal)
 * @param {boolean} req.needToolCall - 是否需要工具调用
 * @param {boolean} req.needImages - 是否需要图片理解
 * @param {boolean} req.needReasoning - 是否需要推理能力
 * @returns {Array} 按优先级排序的可用模型列表
 */
function matchModels(req = {}) {
  const sorted = getSortedModels();

  return sorted.filter((m) => {
    // 健康检查
    if (state.unhealthy[m.id]) {
      const cooldown = state.cooldownUntil[m.id] || 0;
      if (Date.now() < cooldown) return false;
      // 冷却结束，恢复
      delete state.unhealthy[m.id];
      delete state.cooldownUntil[m.id];
    }

    // 速率限制
    if (!checkRateLimit(m)) return false;

    // 能力匹配
    if (req.tier) {
      const tierPriority = {
        flagship: 0,
        strong: 1,
        medium: 2,
        light: 3,
        multimodal: 0,
        embedding: 4,
        image: 5,
      };
      const reqPriority = tierPriority[req.tier] ?? 99;
      const modelPriority = tierPriority[m.tier] ?? 99;
      // 只返回能力不低于要求的模型
      if (modelPriority > reqPriority + 1) return false;
    }

    if (req.needToolCall && !m.supportsToolCall) return false;
    if (req.needImages && !m.supportsImages) return false;
    if (req.needReasoning && !m.supportsReasoning) return false;

    return true;
  });
}

// ─── 标记故障 ──────────────────────────────────────────

function markUnhealthy(modelId) {
  state.unhealthy[modelId] = true;
  state.cooldownUntil[modelId] = Date.now() + COOLDOWN_MS;
}

function markHealthy(modelId) {
  delete state.unhealthy[modelId];
  delete state.cooldownUntil[modelId];
}

// ─── 智能分类 ──────────────────────────────────────────

/**
 * 根据用户消息自动判断任务复杂度
 */
function classifyRequest(messages) {
  const lastMsg = messages?.[messages.length - 1]?.content || "";
  const allText = messages?.map((m) => m.content).join(" ") || "";
  const textLen = allText.length;

  // 需要推理：涉及复杂分析
  const needReasoning =
    /分析|解释|为什么|推理|对比|论证|证明|设计|架构|优化|调试|bug|error/i.test(
      allText
    );

  // 需要工具调用
  const needToolCall =
    /工具|函数|api|调用|查|搜索|天气|翻译|计算/i.test(allText);

  // 需要图片
  const needImages = messages?.some((m) => Array.isArray(m.content));

  // 判断复杂度
  let tier = "medium";
  if (textLen > 2000 || needReasoning) {
    tier = "flagship";
  } else if (textLen > 500) {
    tier = "strong";
  } else if (textLen < 50 && !needReasoning) {
    tier = "light";
  }

  return { tier, needToolCall, needImages, needReasoning };
}

// ─── 统计 ──────────────────────────────────────────

function getPoolStatus() {
  const models = getSortedModels();
  return {
    total: MODELS.length,
    healthy: models.filter((m) => !state.unhealthy[m.id]).length,
    unhealthy: Object.keys(state.unhealthy).length,
    priority: models.slice(0, 10).map((m) => ({
      id: m.id,
      name: m.name,
      vendor: m.vendor,
      tier: m.tier,
      expiresAt: m.expiresAt,
      healthy: !state.unhealthy[m.id],
    })),
  };
}

module.exports = {
  matchModels,
  markUnhealthy,
  markHealthy,
  incrementRate,
  classifyRequest,
  getPoolStatus,
  getSortedModels,
};