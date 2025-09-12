import request from '@/utils/http'

export interface Prompt {
  id: number
  name: string
  content?: string
  category?: string
  tags?: string[]
  isActive?: boolean
  status?: 'draft' | 'active' | 'deprecated'
  systemPrompt?: string
  userPromptTemplate?: string
  formatInstructions?: string
  version?: number
  usageCount?: number
  createdAt?: string
  updatedAt?: string
  creator?: {
    id?: number
    username?: string
    fullName?: string | null
  } | null
}

export interface PromptListParams {
  page?: number
  pageSize?: number
  name?: string
  category?: string
  isActive?: boolean
  status?: 'draft' | 'active' | 'deprecated'
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// 获取提示词列表
export const getPrompts = (params?: PromptListParams) => {
  return request.get<PaginatedResponse<Prompt>>({
    url: '/api/prompts',
    params
  })
}

// 获取单个提示词
export const getPrompt = (id: number) => {
  return request.get<Prompt>({
    url: `/api/prompts/${id}`
  })
}

// 创建提示词
export const createPrompt = (data: Partial<Prompt>) => {
  return request.post<Prompt>({
    url: '/api/prompts',
    data
  })
}

// 更新提示词
export const updatePrompt = (id: number, data: Partial<Prompt>) => {
  return request.put<Prompt>({
    url: `/api/prompts/${id}`,
    data
  })
}

// 删除提示词
export const deletePrompt = (id: number) => {
  return request.del({
    url: `/api/prompts/${id}`
  })
}

// 激活提示词（将状态置为 active）
export const activatePrompt = (id: number) => {
  return request.post({
    url: `/api/prompts/${id}/activate`
  })
}
