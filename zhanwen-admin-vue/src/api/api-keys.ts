import request from '@/utils/http'

export interface ApiKey {
  id: number
  name: string
  key: string
  description?: string
  permissions?: string[]
  dailyLimit?: number
  totalLimit?: number
  expiresAt?: string
  isActive: boolean
  usageCount?: number
  lastUsedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface ApiKeyListParams {
  page?: number
  limit?: number
  name?: string
  isActive?: boolean
}

// 获取API密钥列表
export const getApiKeys = (params?: ApiKeyListParams) => {
  // 兼容旧参数：将 pageSize 映射为后端需要的 limit
  const query: Record<string, any> = { ...(params as any) }
  if (query && query.pageSize != null) {
    query.limit = query.pageSize
    delete query.pageSize
  }
  // 后端不支持 type 查询参数，避免 Joi 校验未知字段错误
  if ('type' in query) delete query.type
  return request.get<{ list: ApiKey[]; total: number }>({
    url: '/api/api-keys',
    params: query
  })
}

// 获取单个API密钥
export const getApiKey = (id: number) => {
  return request.get<ApiKey>({
    url: `/api/api-keys/${id}`
  })
}

// 创建API密钥
export const createApiKey = (data: Partial<ApiKey>) => {
  const { name, permissions, description, isActive, expiresAt } = data || {}
  const payload: any = {}
  if (name != null) payload.name = name
  if (Array.isArray(permissions)) payload.permissions = permissions
  if (description !== undefined) payload.description = description
  if (typeof isActive === 'boolean') payload.isActive = isActive
  if (expiresAt !== undefined) payload.expiresAt = expiresAt
  return request.post<{ key: string }>({
    url: '/api/api-keys',
    data: payload
  })
}

// 更新API密钥
export const updateApiKey = (id: number, data: Partial<ApiKey>) => {
  const { name, permissions, description, isActive, expiresAt } = data || {}
  const payload: any = {}
  if (name !== undefined) payload.name = name
  if (Array.isArray(permissions)) payload.permissions = permissions
  if (description !== undefined) payload.description = description
  if (typeof isActive === 'boolean') payload.isActive = isActive
  if (expiresAt !== undefined) payload.expiresAt = expiresAt
  return request.put<ApiKey>({
    url: `/api/api-keys/${id}`,
    data: payload
  })
}

// 删除API密钥
export const deleteApiKey = (id: number) => {
  return request.del({
    url: `/api/api-keys/${id}`
  })
}

// 刷新API密钥
export const refreshApiKey = (id: number) => {
  return request.post<{ key: string }>({
    // 后端实际提供的是 regenerate 接口
    url: `/api/api-keys/${id}/regenerate`
  })
}

// 重置API密钥
export const resetApiKey = (id: number) => {
  return request.post<{ key: string }>({
    // 与刷新保持一致，调用后端 regenerate
    url: `/api/api-keys/${id}/regenerate`
  })
}

// 权限列表（动态聚合自后端路由）
export interface PermissionsResponse {
  all: string[]
  jwt: string[]
  apiKey: string[]
}

export const getPermissions = () => {
  return request.get<PermissionsResponse>({
    url: '/api/permissions'
  })
}
