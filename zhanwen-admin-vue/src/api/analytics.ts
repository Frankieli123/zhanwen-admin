import request from '@/utils/http'

export interface AnalyticsData {
  date: string
  totalCalls: number
  successCalls: number
  failedCalls: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  uniqueClients: number
  avgResponseTime: number
}

export interface AnalyticsParams {
  startDate?: string
  endDate?: string
  apiKeyId?: number
  modelId?: number
  clientId?: string
  groupBy?: 'day' | 'week' | 'month'
}

export interface ClientData {
  clientId: string
  deviceType?: string
  platform?: string
  appVersion?: string
  lastSeen: string
  totalCalls: number
  location?: {
    country?: string
    city?: string
  }
}

// 获取使用统计
export const getUsageAnalytics = (params?: AnalyticsParams) => {
  return request.get<AnalyticsData[]>({
    url: '/api/analytics/usage',
    params
  })
}

// 获取客户端统计
export const getClientAnalytics = (params?: AnalyticsParams) => {
  return request.get<ClientData[]>({
    url: '/api/analytics/clients',
    params
  })
}

// 获取模型使用统计
export const getModelAnalytics = (params?: AnalyticsParams) => {
  return request.get<any>({
    url: '/api/analytics/models',
    params
  })
}

// 获取错误统计
export const getErrorAnalytics = (params?: AnalyticsParams) => {
  return request.get<any>({
    url: '/api/analytics/errors',
    params
  })
}

// 导出数据
export const exportAnalytics = (params?: AnalyticsParams) => {
  return request.get<Blob>({
    url: '/api/analytics/export',
    params,
    responseType: 'blob'
  })
}

// 获取实时数据
export const getRealtimeAnalytics = () => {
  return request.get<any>({
    url: '/api/analytics/realtime'
  })
}
