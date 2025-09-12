import request from '@/utils/http'

// 数据模型（方案一）
export interface PromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  template?: boolean
}

export interface PromptVariables {
  required: string[]
  optional: string[]
  defaults?: Record<string, any>
}

export interface PromptFormatting {
  title_rule?: string
  subtitle_rule?: string
  list_rule?: string
  strip_markdown?: boolean
}

export interface PromptOverrides {
  model?: string | null
  parameters?: Record<string, any> | null
}

export interface PromptConfig {
  id: number
  name: string
  version: string
  platform: string
  scene: string
  language: string
  active: boolean
  messages: PromptMessage[]
  variables: PromptVariables
  formatting?: PromptFormatting
  overrides?: PromptOverrides
  metadata?: Record<string, any>
  updatedAt: string
}

export interface PublicPromptListQuery {
  platform?: string
  scene?: string
  lang?: string
  active?: boolean
  version?: string
  page?: number
  pageSize?: number
}

export interface ApiEnvelope<T = any> {
  success: boolean
  message: string
  data?: T
  code?: string
}

// 获取活跃提示词
export const getActivePrompt = (params?: PublicPromptListQuery) => {
  return request.get<PromptConfig>({
    url: '/public/prompts/active',
    params
  })
}

// 列表
export const getPublicPrompts = (params?: PublicPromptListQuery) => {
  return request.get<PromptConfig[]>({
    url: '/public/prompts',
    params
  })
}

// 详情
export const getPublicPromptDetail = (id: number) => {
  return request.get<PromptConfig>({
    url: `/public/prompts/${id}`
  })
}

// 服务端渲染（可选）
export const renderPublicPrompt = (id: number, variables: Record<string, any>) => {
  return request.post<{ messages: Array<{ role: string; content: string }> }>({
    url: `/public/prompts/${id}/render`,
    data: { variables }
  })
}

// 通过名称获取单个提示词（带 ETag 缓存）
export const getPublicPromptByName = (name: string) => {
  return request.get<PromptConfig>({
    url: `/public/prompts/by-name/${encodeURIComponent(name)}`
  })
}
