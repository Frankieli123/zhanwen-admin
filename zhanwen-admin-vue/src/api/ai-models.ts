import request from '@/utils/http'

export interface AIModel {
  id: number
  name: string
  displayName: string
  provider: {
    id: number
    name: string
    displayName: string
  }
  apiKeyEncrypted?: string
  customApiUrl?: string
  modelType: 'chat' | 'completion' | 'embedding'
  role: 'primary' | 'secondary' | 'disabled'
  priority: number
  costPer1kTokens: number
  contextWindow: number
  isActive: boolean
  parameters?: Record<string, any>
  testing?: boolean // 用于UI状态管理
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface AIModelListParams {
  page?: number
  limit?: number
  // 兼容模型列表页面的查询字段
  name?: string
  provider?: string
  enabled?: boolean
  // 其他可选扩展字段
  search?: string
  status?: string
  category?: string
  sort?: 'asc' | 'desc'
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

// 获取模型列表
export const getAIModels = (params?: AIModelListParams) => {
  return request.get<PaginatedResponse<AIModel>>({
    url: '/api/ai-models',
    params
  })
}

// 获取单个AI模型
export const getAIModel = (id: number) => {
  return request.get<AIModel>({
    url: `/api/ai-models/${id}`
  })
}

// 创建AI模型
export type AIModelCreateRequest = Partial<AIModel> & {
  providerId: number | 'custom'
  /** 明文或后端兼容字段，后端会加密存储 */
  apiKey?: string
  /** 对齐后端命名 */
  isActive?: boolean
  /** 自定义基础地址（对齐后端 customApiUrl 字段） */
  customApiUrl?: string
}

export const createAIModel = (data: AIModelCreateRequest) => {
  return request.post<AIModel>({
    url: '/api/ai-models',
    data
  })
}

// 更新AI模型
export const updateAIModel = (id: number, data: Partial<AIModel>) => {
  return request.put<AIModel>({
    url: `/api/ai-models/${id}`,
    data
  })
}

/**
 * 删除AI模型
 */
export const deleteAIModel = (id: number) => {
  return request.del({ url: `/api/ai-models/${id}` })
}

/**
 * 测试AI模型连接
 */
export const testAIModelConnection = (id: number) => {
  return request.post({ url: `/api/ai-models/${id}/test` })
}

// 切换AI模型状态
export const toggleAIModelStatus = (id: number) => {
  return request.put<AIModel>({
    url: `/api/ai-models/${id}/toggle`
  })
}

// AI服务商相关接口
export interface AIProvider {
  id?: number
  name: string
  providerType?: string
  displayName: string
  baseUrl: string
  authType?: string
  isActive?: boolean
  supportedModels?: string[]
  metadata?: Record<string, any>
  /** 后端在具备更高权限时返回，用于会话级自动回填 */
  apiKeyDecrypted?: string | null
  /** 列表接口会返回已掩码的密钥（或null），仅作展示用途 */
  apiKeyEncrypted?: string | null
  createdAt?: string
  updatedAt?: string
}

// 获取活跃的AI服务商列表
export const getActiveProviders = () => {
  return request.get<AIProvider[]>({
    url: '/api/ai-providers/active'
  })
}

// 创建AI服务商
export const createAIProvider = (data: Partial<AIProvider>) => {
  return request.post<AIProvider>({
    url: '/api/ai-providers',
    data
  })
}

// 获取AI服务商分页列表（带状态、创建时间等完整信息）
export const getAIProviders = (params?: {
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'inactive'
}) => {
  return request.get<PaginatedResponse<AIProvider>>({
    url: '/api/ai-providers',
    params
  })
}

// 获取单个AI服务商详情
export const getAIProviderById = (id: number) => {
  return request.get<AIProvider>({
    url: `/api/ai-providers/${id}`
  })
}

// 更新AI服务商
export const updateAIProvider = (
  id: number,
  data: Partial<AIProvider> & { apiKeyEncrypted?: string }
) => {
  return request.put<AIProvider>({
    url: `/api/ai-providers/${id}`,
    data
  })
}

// 删除AI服务商
export const deleteAIProvider = (id: number) => {
  return request.del({
    url: `/api/ai-providers/${id}`
  })
}

// 拉取指定服务商的模型列表
export const fetchProviderModels = (data: {
  provider: string
  apiKey: string
  apiUrl?: string
}) => {
  return request.post<string[]>({
    url: '/api/ai-models/fetch-models',
    data
  })
}
