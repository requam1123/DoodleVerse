// file: src/config/apiConfig.ts

export const BACKEND_PORT = 8089;
export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

// 前端运行端口配置 (提示)
export const FRONTEND_PORT = 3131;
export const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

// 标准 OpenAI 格式接口配置
// 支持使用 One-API / New-API / 任意第三方 OpenAI 兼容网关代理
export const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || "";
export const OPENAI_BASE_URL = process.env.NEXT_PUBLIC_OPENAI_BASE_URL || "https://api.openai.com/v1";
export const OPENAI_MODEL = process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4o-mini"; // 可切换为 gpt-4o 或 claude-3-5-sonnet (在兼容网关下)
