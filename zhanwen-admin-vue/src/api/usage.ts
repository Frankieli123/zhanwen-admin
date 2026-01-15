import request from '@/utils/http'

export type UsageGroupBy = 'hour' | 'day' | 'week' | 'month'

export interface UsageMetricsPoint {
  time: string
  requests: number
  errors: number
  avgResponseTime: number
}

export interface UsageMetricsData {
  timeSeries: UsageMetricsPoint[]
}

export interface UsageMetricsParams {
  apiKeyId?: number
  clientId?: string
  startDate?: string
  endDate?: string
  groupBy?: UsageGroupBy
}

export const getUsageMetrics = (params?: UsageMetricsParams) => {
  return request.get<UsageMetricsData>({
    url: '/api/usage/metrics',
    params
  })
}

export interface UsageLogsPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface UsageLogItem {
  id: string
  timestamp: string
  clientId?: string
  userId?: string
  platform?: string
  requestId?: string
  sessionId?: string
  modelId?: number
  modelName?: string
  providerName?: string
  tokensUsed?: number
  cost?: number
  endpoint?: string
  method?: string
  statusCode?: number
  status?: string
  responseTime?: number
  metadata?: Record<string, any>
  clientInfo?: Record<string, any>
  errorMessage?: string
}

export interface UsageLogsParams {
  apiKeyId?: number
  clientId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'responseTimeMs' | 'status' | 'id'
  sortOrder?: 'asc' | 'desc'
}

export interface UsageLogsPage {
  success: boolean
  message?: string
  data: UsageLogItem[]
  pagination: UsageLogsPagination
}

export const getUsageLogs = (params?: UsageLogsParams) => {
  return request.get<UsageLogsPage>({
    url: '/api/usage/logs',
    params
  })
}

export interface ClientStatsParams {
  apiKeyId?: number
  period?: number
  top?: number
}

export interface ClientStatsItem {
  clientId: string
  requestCount: number
  errorRate?: number
  avgResponseTime?: number
  lastSeen?: string
  info?: Record<string, any>
}

export const getClientStats = (params?: ClientStatsParams) => {
  return request.get<ClientStatsItem[]>({
    url: '/api/usage/clients',
    params
  })
}

export interface ClientsDetailParams {
  page?: number
  limit?: number
  q?: string
  platform?: 'web' | 'ios' | 'android' | 'wechat'
  isActive?: boolean
  apiKeyId?: number
  startDate?: string
  endDate?: string
  period?: number
}

export interface ClientDetailItem {
  id: number
  clientId: string
  name: string
  description?: string
  platform?: string
  version?: string
  appVersion?: string
  buildTime?: string
  language?: string
  timezone?: string
  userAgent?: string
  screenInfo?: Record<string, any> | null
  deviceInfo?: Record<string, any> | null
  networkInfo?: Record<string, any> | null
  isActive?: boolean
  apiKeyId?: number | null
  owner?: string
  contactEmail?: string
  firstSeen?: string
  lastActiveAt?: string
  createdAt?: string
  updatedAt?: string
  totalRequests?: number
  totalTokens?: string
  totalCost?: number
  periodRequests?: number
  periodErrors?: number
  periodErrorRate?: number
  periodAvgResponseTime?: number
  periodTokens?: number
  periodCost?: number
  periodLastSeen?: string | null
}

export interface ClientsDetailPage {
  success: boolean
  message?: string
  data: ClientDetailItem[]
  pagination: UsageLogsPagination
}

export const getUsageClientsDetail = (params?: ClientsDetailParams) => {
  return request.get<ClientsDetailPage>({
    url: '/api/usage/clients-detail',
    params
  })
}

export interface UsageMetricDataItem {
  id: string
  date: string
  name: string
  value: string
  platform?: string
  clientId?: string
  sessionId?: string
  userId?: string
  metadata?: Record<string, any>
  clientInfo?: Record<string, any>
  created?: string
  lastUpdated?: string
}

export interface UsageMetricsDataParams {
  apiKeyId?: number
  clientId?: string
  metricName?: string
  startDate?: string
  endDate?: string
  limit?: number
}

export const getUsageMetricsData = (params?: UsageMetricsDataParams) => {
  return request.get<UsageMetricDataItem[]>({
    url: '/api/usage/metrics-data',
    params
  })
}

export interface UsageRealtimeData {
  todayRequests: number
  requestsGrowth: number
  activeClients: number
  avgResponseTime: number
  errorRate: number
}

export const getUsageRealtime = () => {
  return request.get<UsageRealtimeData>({
    url: '/api/usage/realtime'
  })
}

export interface UsageErrorsParams {
  apiKeyId?: number
  period?: number
  groupBy?: 'status' | 'endpoint' | 'client'
}

export interface UsageErrorRecentItem {
  timestamp: string
  endpoint: string
  statusCode: number
  message: string
}

export interface UsageErrorsData {
  total: number
  distribution: Record<string, number>
  recent: UsageErrorRecentItem[]
}

export const getUsageErrors = (params?: UsageErrorsParams) => {
  return request.get<UsageErrorsData>({
    url: '/api/usage/errors',
    params
  })
}

export interface UsagePerformanceParams {
  apiKeyId?: number
  period?: number
  percentiles?: number[] | string
}

export interface UsagePerformanceData {
  count: number
  avgResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  percentiles: Record<string, number>
}

export const getUsagePerformance = (params?: UsagePerformanceParams) => {
  return request.get<UsagePerformanceData>({
    url: '/api/usage/performance',
    params
  })
}

export interface UsageEndpointsParams {
  apiKeyId?: number
  period?: number
  top?: number
}

export interface UsageEndpointItem {
  endpoint: string
  method: string
  count: number
  successRate: number
  avgTime: number
  p95Time: number
}

export const getUsageEndpoints = (params?: UsageEndpointsParams) => {
  return request.get<UsageEndpointItem[]>({
    url: '/api/usage/endpoints',
    params
  })
}

export interface UsageGeoItem {
  location: string
  count: number
}

export const getUsageGeo = (params?: { apiKeyId?: number; period?: number }) => {
  return request.get<UsageGeoItem[]>({
    url: '/api/usage/geo',
    params
  })
}

export interface UsageDevicesData {
  desktop: number
  mobile: number
  tablet: number
  other: number
}

export const getUsageDevices = (params?: { apiKeyId?: number; period?: number }) => {
  return request.get<UsageDevicesData>({
    url: '/api/usage/devices',
    params
  })
}
