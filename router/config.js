/**
 * config.js - 模型路由池配置
 *
 * 每个模型包含：
 *   - id: WorkBuddy 模型 ID
 *   - modelName: 上游 API 实际模型名（已验证 2026-05-17）
 *   - vendor: 供应商
 *   - url: API 端点
 *   - apiKey: API 密钥
 *   - tier: 能力等级
 *   - expiresAt: 免费到期时间（越早到期越优先使用）
 *   - rateLimit: 每分钟请求数上限
 */

// Environment variable API keys (fallback to empty string)
const GLM_API_KEY = process.env.GLM_API_KEY || '';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || '';
const SENSENOVA_API_KEY = process.env.SENSENOVA_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';


const MODELS = [
  // ═══════════════════════════════════════════════════════
  // GLM 智谱 - 免费3个月 (~2026年2月注册, 约5月到期)
  //    1200万文本token + 600万多模态token
  //    最高优先级：到期前用完！
  // ═══════════════════════════════════════════════════════
  {
    id: "glm-glm-5.1",
    modelName: "glm-5.1",
    name: "GLM-5.1 (Z-ai旗舰Agent/代码)",
    vendor: "GLM",
    url: "https://open.bigmodel.cn/api/paas/v4",
    apiKey: GLM_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "2026-05-28",
    rateLimit: 60,
    notes: "旗舰Agent/代码模型"
  },
  {
    id: "glm-glm-4.5-air",
    modelName: "glm-4.5-air",
    name: "GLM-4.5-Air (文本最强)",
    vendor: "GLM",
    url: "https://open.bigmodel.cn/api/paas/v4",
    apiKey: GLM_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "2026-05-28",
    rateLimit: 60,
    notes: "文本能力最强"
  },
  {
    id: "glm-glm-4.5",
    modelName: "glm-4.5",
    name: "GLM-4.5 (通用)",
    vendor: "GLM",
    url: "https://open.bigmodel.cn/api/paas/v4",
    apiKey: GLM_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "strong",
    expiresAt: "2026-05-28",
    rateLimit: 60,
    notes: "通用模型"
  },
  {
    id: "glm-glm-4-flash",
    modelName: "glm-4-flash",
    name: "GLM-4-Flash (轻量免费)",
    vendor: "GLM",
    url: "https://open.bigmodel.cn/api/paas/v4",
    apiKey: GLM_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "light",
    expiresAt: "2026-05-28",
    rateLimit: 60,
    notes: "轻量快速"
  },

  // ═══════════════════════════════════════════════════════
  // NVIDIA NIM - 已验证可用模型（2026-05-17）
  //    免费 API，约 40req/min
  // ═══════════════════════════════════════════════════════
  {
    id: "nvidia-deepseek-v4-flash",
    modelName: "deepseek-ai/deepseek-v4-flash",
    name: "DeepSeek-V4-Flash (推理强)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-deepseek-coder-6.7b",
    modelName: "deepseek-ai/deepseek-coder-6.7b-instruct",
    name: "DeepSeek-Coder-6.7B (代码专用)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-minimax-m2.7",
    modelName: "minimaxai/minimax-m2.7",
    name: "MiniMax M2.7 (230B 逻辑/代码/办公)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-kimi-k2.6",
    modelName: "moonshotai/kimi-k2.6",
    name: "Kimi K2.6 (长上下文/推理)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-glm-5.1",
    modelName: "z-ai/glm-5.1",
    name: "GLM-5.1 (Z-ai旗舰Agent/代码/长链推理)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-glm5",
    modelName: "z-ai/glm5",
    name: "GLM-5 (通用旗舰)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-qwen3-coder-480b",
    modelName: "qwen/qwen3-coder-480b-a35b-instruct",
    name: "Qwen3-Coder-480B (代码/Agent专用)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-nemotron-3-super-120b",
    modelName: "nvidia/nemotron-3-super-120b-a12b",
    name: "Nemotron 3 Super 120B",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-nemotron-4-340b",
    modelName: "nvidia/nemotron-4-340b-instruct",
    name: "Nemotron 4 340B",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-magnum-v4-72b",
    modelName: "nvidia/nemotron-3-nano-30b-a3b",
    name: "Magnum V4 72B",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-llama-4-maverick",
    modelName: "meta/llama-4-maverick-17b-128e-instruct",
    name: "Llama 4 Maverick 17B (多模态)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: true,
    supportsReasoning: false,
    tier: "multimodal",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-llama-3.1-70b",
    modelName: "meta/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B Instruct (强能力)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-llama-3.3-70b",
    modelName: "meta/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "medium",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-llama-3.1-8b",
    modelName: "meta/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B Instruct (轻量)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "light",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-mistral-small-4-119b",
    modelName: "mistralai/mistral-small-4-119b-2603",
    name: "Mistral Small 4 119B (中等能力)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "medium",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-mistral-nemotron",
    modelName: "mistralai/mistral-nemotron",
    name: "Mistral-Nemotron 128K (代码强)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-nemotron-mini-4b",
    modelName: "nvidia/nemotron-mini-4b-instruct",
    name: "Nemotron Mini 4B (轻量本地)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "light",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-stepfun-3.5-flash",
    modelName: "stepfun-ai/step-3.5-flash",
    name: "Step-3.5-Flash (高频轻量)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "light",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-nv-embed-v1",
    modelName: "nvidia/nv-embed-v1",
    name: "NV-Embed-v1 (Embedding)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: false,
    supportsImages: false,
    supportsReasoning: false,
    tier: "embedding",
    expiresAt: "unknown",
    rateLimit: 40
  },
  {
    id: "nvidia-nv-embedcode-7b-v1",
    modelName: "nvidia/nv-embedcode-7b-v1",
    name: "NV-EmbedCode-7B-v1 (代码Embedding)",
    vendor: "NVIDIA NIM",
    url: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY,
    supportsToolCall: false,
    supportsImages: false,
    supportsReasoning: false,
    tier: "embedding",
    expiresAt: "unknown",
    rateLimit: 40
  },

  // ═══════════════════════════════════════════════════════
  // SiliconFlow - 已验证可用模型（2026-05-17）
  //    永久免费，兜底
  // ═══════════════════════════════════════════════════════
  {
    id: "siliconflow-qwen2.5-7b-instruct",
    modelName: "Qwen/Qwen2.5-7B-Instruct",
    name: "Qwen2.5-7B-Instruct (永久免费)",
    vendor: "SiliconFlow",
    url: "https://api.siliconflow.cn/v1",
    apiKey: SILICONFLOW_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "medium",
    expiresAt: "permanent",
    rateLimit: 30
  },
  {
    id: "siliconflow-qwen2.5-14b",
    modelName: "Qwen/Qwen2.5-14B-Instruct",
    name: "Qwen2.5-14B (永久免费)",
    vendor: "SiliconFlow",
    url: "https://api.siliconflow.cn/v1",
    apiKey: SILICONFLOW_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "medium",
    expiresAt: "permanent",
    rateLimit: 30
  },
  {
    id: "siliconflow-deepseek-v4-flash",
    modelName: "deepseek-ai/DeepSeek-V4-Flash",
    name: "硅基流动·DeepSeek-V4-Flash (余额消耗)",
    vendor: "SiliconFlow",
    url: "https://api.siliconflow.cn/v1",
    apiKey: SILICONFLOW_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "flagship",
    expiresAt: "permanent",
    rateLimit: 30,
    notes: "消耗余额的非免费模型"
  },

  // ═══════════════════════════════════════════════════════
  // SenseNova - 自定义API，可能有502证书错误
  //    最低优先级
  // ═══════════════════════════════════════════════════════
  {
    id: "sensenova-6.7-flash-lite",
    modelName: "6.7-flash-lite",
    name: "SenseNova 6.7 Flash Lite",
    vendor: "SenseNova",
    url: "https://token.sensenova.cn/v1",
    apiKey: SENSENOVA_API_KEY,
    supportsToolCall: true,
    supportsImages: true,
    supportsReasoning: false,
    tier: "medium",
    expiresAt: "unknown",
    rateLimit: 20,
    notes: "可能502证书错误"
  },
  {
    id: "sensenova-deepseek-v4-flash",
    modelName: "deepseek-v4-flash",
    name: "SenseNova·DeepSeek-V4-Flash",
    vendor: "SenseNova",
    url: "https://token.sensenova.cn/v1",
    apiKey: SENSENOVA_API_KEY,
    supportsToolCall: true,
    supportsImages: true,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 20,
    notes: "可能502证书错误"
  },
  {
    id: "sensenova-u1-fast",
    modelName: "U1-Fast",
    name: "SenseNova U1 Fast (图片生成)",
    vendor: "SenseNova",
    url: "https://token.sensenova.cn/v1/images/generations",
    apiKey: SENSENOVA_API_KEY,
    supportsToolCall: false,
    supportsImages: false,
    supportsReasoning: false,
    tier: "image",
    expiresAt: "unknown",
    rateLimit: 10,
    notes: "图片生成专用"
  }
,

  // ═══════════════════════════════════════════════════════
  // OpenRouter - 免费模型（2026-05-20 最新查询）
  //    25 个免费对话模型，通过 openrouter.ai/api/v1 路由
  //    ⚠️ 日限动态调整（购买 ≥$5 后提升），非永久
  //    Key1: <OPENROUTER_API_KEY>
  // ═══════════════════════════════════════════════════════
  // ─── flagships ───
  {
    id: "openrouter-deepseek-v4-flash",
    modelName: "deepseek/deepseek-v4-flash:free",
    name: "OpenRouter·DeepSeek V4 Flash",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-glm-5.1",
    modelName: "z-ai/glm-5.1",
    name: "OpenRouter·GLM 5.1",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-gemma-4-26b",
    modelName: "google/gemma-4-26b-a4b-it:free",
    name: "OpenRouter·Gemma 4 26B",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: true,
    supportsReasoning: false,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-gemma-4-31b",
    modelName: "google/gemma-4-31b-it:free",
    name: "OpenRouter·Gemma 4 31B",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: true,
    supportsReasoning: false,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-gpt-oss-120b",
    modelName: "openai/gpt-oss-120b:free",
    name: "OpenRouter·GPT OSS 120B",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-qwen3-coder",
    modelName: "qwen/qwen3-coder:free",
    name: "OpenRouter·Qwen3 Coder 480B",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-qwen3-next-80b",
    modelName: "qwen/qwen3-next-80b-a3b-instruct:free",
    name: "OpenRouter·Qwen3 Next 80B",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-hermes-3-405b",
    modelName: "nousresearch/hermes-3-llama-3.1-405b:free",
    name: "OpenRouter·Hermes 3 405B",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "flagship",
    expiresAt: "unknown",
    rateLimit: 20
  },
  // ─── strong ───
  {
    id: "openrouter-nemotron-3-super",
    modelName: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "OpenRouter·Nemotron 3 Super 120B",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-llama-3.3-70b",
    modelName: "meta-llama/llama-3.3-70b-instruct:free",
    name: "OpenRouter·Llama 3.3 70B",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-glm-4.5-air",
    modelName: "z-ai/glm-4.5-air:free",
    name: "OpenRouter·GLM 4.5 Air",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-baidu-cobuddy",
    modelName: "baidu/cobuddy:free",
    name: "OpenRouter·Baidu CoBuddy",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-gpt-oss-20b",
    modelName: "openai/gpt-oss-20b:free",
    name: "OpenRouter·GPT OSS 20B",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-minimax-m2.5",
    modelName: "minimax/minimax-m2.5:free",
    name: "OpenRouter·MiniMax M2.5",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-trinity-large-thinking",
    modelName: "arcee-ai/trinity-large-thinking:free",
    name: "OpenRouter·Trinity Large Thinking",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-nemotron-nano-30b",
    modelName: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "OpenRouter·Nemotron 3 Nano 30B",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "strong",
    expiresAt: "unknown",
    rateLimit: 20
  },
  // ─── medium ───
  {
    id: "openrouter-venice-uncensored",
    modelName: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    name: "OpenRouter·Venice Uncensored",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "medium",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-laguna-xs.2",
    modelName: "poolside/laguna-xs.2:free",
    name: "OpenRouter·Laguna XS.2 (代码)",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "medium",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-laguna-m.1",
    modelName: "poolside/laguna-m.1:free",
    name: "OpenRouter·Laguna M.1 (代码)",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "medium",
    expiresAt: "unknown",
    rateLimit: 20
  },
  // ─── multimodal ───
  {
    id: "openrouter-nemotron-nano-omni",
    modelName: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    name: "OpenRouter·Nemotron Nano Omni (多模态)",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: true,
    supportsReasoning: true,
    tier: "multimodal",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-nemotron-nano-12b-vl",
    modelName: "nvidia/nemotron-nano-12b-v2-vl:free",
    name: "OpenRouter·Nemotron Nano 12B VL (视觉)",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: true,
    supportsReasoning: false,
    tier: "multimodal",
    expiresAt: "unknown",
    rateLimit: 20
  },
  // ─── light ───
  {
    id: "openrouter-llama-3.2-3b",
    modelName: "meta-llama/llama-3.2-3b-instruct:free",
    name: "OpenRouter·Llama 3.2 3B",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "light",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-lfm-1.2b-thinking",
    modelName: "liquid/lfm-2.5-1.2b-thinking:free",
    name: "OpenRouter·LFM 1.2B Thinking",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: true,
    tier: "light",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-lfm-1.2b-instruct",
    modelName: "liquid/lfm-2.5-1.2b-instruct:free",
    name: "OpenRouter·LFM 1.2B Instruct",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "light",
    expiresAt: "unknown",
    rateLimit: 20
  },
  {
    id: "openrouter-nemotron-nano-9b",
    modelName: "nvidia/nemotron-nano-9b-v2:free",
    name: "OpenRouter·Nemotron Nano 9B",
    vendor: "OpenRouter",
    url: "https://openrouter.ai/api/v1",
    apiKey: OPENROUTER_API_KEY,
    supportsToolCall: true,
    supportsImages: false,
    supportsReasoning: false,
    tier: "light",
    expiresAt: "unknown",
    rateLimit: 20
  }
];

module.exports = MODELS;
