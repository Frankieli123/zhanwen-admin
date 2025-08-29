/// <reference types="vite/client" />

// 可选：声明自定义环境变量，避免 TS 报错并提供智能提示
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
