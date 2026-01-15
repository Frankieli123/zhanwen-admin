import request from '@/utils/http'

export interface ModelAnalyticsParams {
  startDate?: string
  endDate?: string
  apiKeyId?: number
  modelId?: number
  clientId?: string
  groupBy?: 'day' | 'week' | 'month'
}

export const getModelAnalytics = (params?: ModelAnalyticsParams) => {
  return request.get<any>({
    url: '/api/analytics/models',
    params
  })
}

