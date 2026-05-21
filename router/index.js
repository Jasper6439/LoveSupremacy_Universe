require("dotenv").config();

/**
 * index.js - 免费模型路由池 HTTP 服务
 *
 * OpenAI 兼容接口：/v1/chat/completions
 * 管理接口：/pool/status, /pool/health
 *
 * 路由逻辑：
 *   1. 按免费到期时间排序（GLM 5月到期 > NVIDIA未知 > SiliconFlow永久）
 *   2. 按任务复杂度匹配合适模型
 *   3. 故障自动 fallback 到下一个可用模型
 */

// 清除代理环境变量，避免 node-fetch 走代理导致 404
// GLM / NVIDIA NIM / SiliconFlow 均支持直连，无需代理
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;

const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const pool = require("./pool");

const app = express();
app.use(express.json({ limit: "10mb" }));

// 根路径自动跳转到 Dashboard
app.get("/", (req, res) => {
  res.redirect("/dashboard");
});

// Dashboard 仪表盘页面
app.get("/dashboard", (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, "dashboard.html"), "utf-8");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// 全局未捕获错误处理，防止进程崩溃
process.on("uncaughtException", (err) => {
  console.error(`[FATAL] uncaughtException: ${err.message}`);
});
process.on("unhandledRejection", (reason) => {
  console.error(`[FATAL] unhandledRejection: ${reason?.message || reason}`);
});

const PORT = process.env.PORT || 3000;

// ─── OpenAI 兼容聊天接口 ─────────────────────────────

// 并发保护：强制间隔请求，防止同时请求导致崩溃
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200; // ms

app.post("/v1/chat/completions", async (req, res) => {
  const now = Date.now();
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - (now - lastRequestTime)));
  }
  lastRequestTime = Date.now();

  const { model: requestedModel, messages, stream = false } = req.body;

  // 1. 如果指定了具体模型，直接使用
  //    "router-pool" 特殊处理：触发自动路由
  if (requestedModel && requestedModel !== "auto" && requestedModel !== "router-pool") {
    const model = require("./config").find((m) => m.id === requestedModel);
    if (!model) {
      return res.status(404).json({
        error: { message: `Model '${requestedModel}' not found in pool` },
      });
    }
    return proxyRequest(model, messages, stream, res);
  }

  // 2. 自动路由：根据消息内容匹配合适模型
  const classification = pool.classifyRequest(messages);
  const candidates = pool.matchModels(classification);

  if (candidates.length === 0) {
    return res.status(503).json({
      error: {
        message: "No available models in pool. All models may be rate-limited or unhealthy.",
        poolStatus: pool.getPoolStatus(),
      },
    });
  }

  // 3. 尝试候选模型，失败则 fallback
  let lastError = null;
  for (const model of candidates) {
    try {
      const result = await proxyRequest(model, messages, stream, res);
      if (result === "SENT") return; // 流式响应已发送
      // 非流式：成功返回
      pool.markHealthy(model.id);
      pool.incrementRate(model.id);
      return;
    } catch (err) {
      lastError = err;
      console.warn(`[FALLBACK] ${model.id} failed: ${err.message}`);
      pool.markUnhealthy(model.id);
      // 继续尝试下一个
    }
  }

  // 全部失败
  res.status(502).json({
    error: {
      message: "All models failed",
      detail: lastError?.message,
      poolStatus: pool.getPoolStatus(),
    },
  });
});

// ─── 代理请求到实际 API ─────────────────────────────

const FETCH_TIMEOUT = 30000; // 30秒超时

async function proxyRequest(model, messages, stream, res) {
  // 使用 modelName（上游实际模型名），fallback 到 id
  const upstreamModel = model.modelName || model.id;

  const body = {
    model: upstreamModel,
    messages,
    stream,
    max_tokens: 4096,
    temperature: 0.7,
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${model.apiKey}`,
  };

  // 创建超时信号
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    // 流式响应
    if (stream) {
      const response = await fetch(model.url + "/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`${model.id} returned ${response.status}: ${errText}`);
      }

      // 设置流式响应头
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // 透传 SSE 流
      response.body.pipe(res);
      response.body.on("end", () => res.end());
      return "SENT";
    }

    // 非流式
    const response = await fetch(model.url + "/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`${model.id} returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err; // 让上层 fallback 处理
  }
}

// ─── 管理接口 ──────────────────────────────────────────

app.get("/pool/status", (req, res) => {
  res.json(pool.getPoolStatus());
});

app.get("/pool/health", (req, res) => {
  const status = pool.getPoolStatus();
  res.json({
    healthy: status.healthy > 0,
    ...status,
  });
});

app.get("/pool/models", (req, res) => {
  const models = pool.getSortedModels().map((m) => ({
    id: m.id,
    name: m.name,
    vendor: m.vendor,
    tier: m.tier,
    upstreamModel: m.modelName || m.id,
    expiresAt: m.expiresAt,
    rateLimit: m.rateLimit,
    supportsToolCall: m.supportsToolCall,
    supportsImages: m.supportsImages,
    supportsReasoning: m.supportsReasoning,
  }));
  res.json(models);
});

// ─── 模型列表接口（OpenAI 兼容） ─────────────────────

app.get("/v1/models", (req, res) => {
  const models = require("./config").map((m) => ({
    id: m.id,
    object: "model",
    created: Math.floor(Date.now() / 1000),
    owned_by: m.vendor,
    upstream_model: m.modelName || m.id,
    name: m.name || m.id,
    vendor: m.vendor,
    tier: m.tier || "medium",
    expiresAt: m.expiresAt || "unknown",
    healthy: true,
    rateLimit: m.rateLimit || 20,
    notes: m.notes || "",
  }));
  res.json({ object: "list", data: models });
});

// ─── 启动 ──────────────────────────────────────────

app.listen(PORT, () => {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║      🚀 免费模型路由池已启动                  ║");
  console.log(`║      端口: ${PORT}                              ║`);
  console.log("║      接口: /v1/chat/completions               ║");
  console.log("║      状态: /pool/status                       ║");
  console.log("║      模型: /v1/models                         ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log("");

  const status = pool.getPoolStatus();
  console.log(`📊 模型池状态:`);
  console.log(`   总数: ${status.total}`);
  console.log(`   可用: ${status.healthy}`);
  console.log(`   故障: ${status.unhealthy}`);
  console.log("");
  console.log("📋 优先级 Top 5 (越早过期越优先):");
  status.priority.slice(0, 5).forEach((m, i) => {
    const exp =
      m.expiresAt === "permanent"
        ? "永久免费"
        : m.expiresAt === "unknown"
          ? "未知"
          : `到期: ${m.expiresAt}`;
    console.log(`   ${i + 1}. [${m.vendor}] ${m.name} (${exp})`);
  });
});