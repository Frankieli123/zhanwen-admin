import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { useUserStore } from '@/store/modules/user'
import { ApiStatus } from './status'
import { HttpError, handleError, showError } from './error'
import { $t } from '@/locales'

/** 请求配置常量 */
const REQUEST_TIMEOUT = 15000
const LOGOUT_DELAY = 500
const MAX_RETRIES = 2
const RETRY_DELAY = 1000
const UNAUTHORIZED_DEBOUNCE_TIME = 3000

/** 401防抖状态 */
let isUnauthorizedErrorShown = false
let unauthorizedTimer: NodeJS.Timeout | null = null

/** 调试日志开关（默认开启，可通过 localStorage.DEBUG_HTTP 控制） */
const DEBUG_HTTP = (() => {
  try {
    const v = localStorage.getItem('DEBUG_HTTP')
    if (v === 'true') return true
    if (v === 'false') return false
  } catch {
    // ignore localStorage access error
  }
  return true
})()

/** 简易 ETag 缓存（仅内存） */
type CacheEntry = { etag: string; data: any; at: number }
const ETagCache = new Map<string, CacheEntry>()

function sortParams(val: any): any {
  if (Array.isArray(val)) return val.map(sortParams)
  if (val && typeof val === 'object') {
    const out: Record<string, any> = {}
    for (const k of Object.keys(val).sort()) out[k] = sortParams(val[k])
    return out
  }
  return val
}

function buildCacheKey(cfg: {
  baseURL?: string
  url?: string
  method?: string
  params?: any
}): string {
  const base = cfg.baseURL || ''
  const url = cfg.url || ''
  const method = (cfg.method || 'GET').toUpperCase()
  const params = cfg.params ? JSON.stringify(sortParams(cfg.params)) : ''
  return `${method} ${base}${url}?${params}`
}

function mask(val?: string | null, keep: number = 6) {
  if (!val) return val
  const s = String(val)
  if (s.length <= keep) return `${s[0] || ''}***`
  return `${s.slice(0, keep)}***(${s.length})`
}

function toPlainHeaders(h: any) {
  try {
    const plain: Record<string, any> = {}
    if (!h) return plain
    const entries = typeof h.toJSON === 'function' ? h.toJSON() : h
    for (const k of Object.keys(entries)) {
      const key = k.toLowerCase()
      let value = entries[k]
      if (key === 'authorization' || key === 'x-api-key' || key === 'cookie') {
        value = mask(typeof value === 'string' ? value : JSON.stringify(value))
      }
      plain[key] = value
    }
    return plain
  } catch {
    return {}
  }
}

/** 扩展 AxiosRequestConfig */
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  showErrorMessage?: boolean
}

const { VITE_API_URL, VITE_WITH_CREDENTIALS } = import.meta.env
// 开发环境 VITE_API_URL 通常配置为 '/'，此时应当使用空字符串，避免 baseURL + url 导致 '//' 协议相对路径
const NORMALIZED_BASE_URL = VITE_API_URL && VITE_API_URL !== '/' ? VITE_API_URL : ''

/** Axios实例 */
const axiosInstance = axios.create({
  timeout: REQUEST_TIMEOUT,
  baseURL: NORMALIZED_BASE_URL,
  withCredentials: VITE_WITH_CREDENTIALS === 'true',
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
  transformResponse: [
    (data, headers) => {
      const contentType = headers['content-type']
      if (contentType?.includes('application/json')) {
        try {
          return JSON.parse(data)
        } catch {
          return data
        }
      }
      return data
    }
  ]
})

/** 请求拦截器 */
axiosInstance.interceptors.request.use(
  (request: InternalAxiosRequestConfig) => {
    const { accessToken } = useUserStore()
    if (accessToken) {
      const tokenVal = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`
      request.headers.set('Authorization', tokenVal)
    }

    // 统一修正 baseURL 与 url，避免 '/api/api/*'，以及使 '/public/*'、'/auth/*' 走根路径
    try {
      const rawBase = (request.baseURL || '').replace(/\/+$/, '')
      let rawUrl = request.url || ''
      // 若 base 以 /api 结尾且 url 以 /api 开头，去重一次
      if (rawBase.endsWith('/api') && /^\/api(\/|$)/.test(rawUrl)) {
        rawUrl = rawUrl.replace(/^\/api/, '')
      }
      // 对于根路由，强制使用根 baseURL，避免被 '/api' 前缀污染
      if (/^\/(auth|public|health|api-docs)(\/|$)/.test(rawUrl)) {
        request.baseURL = ''
      }
      if (rawUrl && !rawUrl.startsWith('/')) rawUrl = '/' + rawUrl
      request.url = rawUrl
    } catch {
      // ignore url normalize error
    }

    // 自动附带公开接口所需的 X-API-Key（供 /public/** 路由使用）
    try {
      const fromLocal =
        typeof localStorage !== 'undefined' ? localStorage.getItem('PUBLIC_API_KEY') : null
      const fromEnv = (import.meta as any)?.env?.VITE_PUBLIC_API_KEY as string | undefined
      const apiKey = fromLocal || fromEnv
      if (apiKey) {
        request.headers.set('X-API-Key', apiKey)
      }
    } catch (e) {
      // 忽略读取本地存储的异常，避免影响正常请求
      if (DEBUG_HTTP) console.warn('[HTTP][request] read PUBLIC_API_KEY failed:', e)
    }

    // 基于 ETag 的 GET 条件请求
    try {
      const method = (request.method || 'GET').toUpperCase()
      if (method === 'GET') {
        const key = buildCacheKey(request)
        const entry = ETagCache.get(key)
        if (entry?.etag) {
          request.headers.set('If-None-Match', entry.etag)
          if (DEBUG_HTTP) console.debug('[HTTP][etag][send]', { key, etag: entry.etag })
        }
      }
    } catch (e) {
      if (DEBUG_HTTP) console.warn('[HTTP][etag][prepare] failed:', e)
    }

    if (request.data && !(request.data instanceof FormData) && !request.headers['Content-Type']) {
      request.headers.set('Content-Type', 'application/json')
      request.data = JSON.stringify(request.data)
    }

    // 记录请求开始时间与调试信息
    ;(request as any).__startTime = Date.now()
    if (DEBUG_HTTP) {
      const fullUrl = `${request.baseURL || ''}${request.url || ''}`
      const info = {
        method: (request.method || 'GET').toUpperCase(),
        url: fullUrl,
        params: request.params,
        withCredentials: request.withCredentials,
        headers: toPlainHeaders(request.headers),
        hasAuth: !!request.headers.get?.('Authorization'),
        hasApiKey: !!request.headers.get?.('X-API-Key')
      }
      // 避免打印过长body
      try {
        const dataStr =
          typeof request.data === 'string' ? request.data : JSON.stringify(request.data)
        const shortDataStr =
          dataStr && dataStr.length > 200
            ? `${dataStr.slice(0, 200)}...(${dataStr.length})`
            : dataStr
        console.debug('[HTTP][request]', info, shortDataStr)
      } catch (e) {
        console.debug('[HTTP][request]', info, e)
      }
    }

    return request
  },
  (error) => {
    showError(createHttpError($t('httpMsg.requestConfigError'), ApiStatus.error))
    return Promise.reject(error)
  }
)

/** 响应拦截器 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse<Api.Http.BaseResponse>) => {
    // ETag/304 处理与存储
    try {
      const cfg: any = response.config || {}
      const method = (cfg.method || 'GET').toUpperCase()
      if (method === 'GET') {
        const key = buildCacheKey(cfg)
        if (response.status === 304) {
          const entry = ETagCache.get(key)
          if (entry) {
            response.data = entry.data
            if (DEBUG_HTTP) console.debug('[HTTP][etag][hit-304]', { key, etag: entry.etag })
            return response
          }
          if (DEBUG_HTTP) console.warn('[HTTP][etag][miss-304]', { key })
          // 无本地缓存也视为成功，给出空 data，避免业务异常
          response.data = { success: true, message: 'Not Modified', data: undefined } as any
          return response
        }
        const etag = (response.headers as any)?.etag
        if (etag) {
          ETagCache.set(key, { etag, data: response.data, at: Date.now() })
          if (DEBUG_HTTP) console.debug('[HTTP][etag][store]', { key, etag })
        }
      }
    } catch {
      // ignore etag handling failure
    }
    if (DEBUG_HTTP) {
      const cfg: any = response.config || {}
      const elapsed = cfg.__startTime ? Date.now() - cfg.__startTime : undefined
      const fullUrl = `${cfg.baseURL || ''}${cfg.url || ''}`
      const logObj = {
        status: response.status,
        method: (cfg.method || 'GET').toUpperCase(),
        url: fullUrl,
        elapsedMs: elapsed
      }
      try {
        const dataStr = JSON.stringify(response.data)
        const shortDataStr =
          dataStr && dataStr.length > 300
            ? `${dataStr.slice(0, 300)}...(${dataStr.length})`
            : dataStr
        console.debug('[HTTP][response]', logObj, shortDataStr)
      } catch (e) {
        console.debug('[HTTP][response]', logObj, e)
      }
    }
    // 兼容两种后端响应结构：
    // 1) 业务码结构：{ code, msg, data }
    // 2) 成功布尔结构：{ success, message, data }
    const dataAny: any = response.data as any
    const { code, msg } = dataAny || {}

    // 情况2：后端返回 success 布尔
    if (dataAny && dataAny.success === true) {
      return response
    }

    // 情况1：按业务码判断
    if (code === ApiStatus.success) return response
    if (code === ApiStatus.unauthorized) handleUnauthorizedError(msg)

    const message = msg || dataAny?.message || $t('httpMsg.requestFailed')
    const errCode = typeof code === 'number' ? code : ApiStatus.error
    throw createHttpError(message, errCode)
  },
  (error) => {
    if (DEBUG_HTTP) {
      try {
        const cfg: any = error.config || {}
        const elapsed = cfg.__startTime ? Date.now() - cfg.__startTime : undefined
        const fullUrl = `${cfg.baseURL || ''}${cfg.url || ''}`
        const status = error.response?.status
        console.error('[HTTP][error]', {
          method: (cfg.method || 'GET').toUpperCase(),
          url: fullUrl,
          status,
          elapsedMs: elapsed,
          requestHeaders: toPlainHeaders(cfg.headers),
          responseData: error.response?.data
        })
      } catch {
        // ignore logging failure
      }
    }
    if (error.response?.status === ApiStatus.unauthorized) handleUnauthorizedError()
    return Promise.reject(handleError(error))
  }
)

/** 统一创建HttpError */
function createHttpError(message: string, code: number) {
  return new HttpError(message, code)
}

/** 处理401错误（带防抖） */
function handleUnauthorizedError(message?: string): never {
  const error = createHttpError(message || $t('httpMsg.unauthorized'), ApiStatus.unauthorized)

  if (!isUnauthorizedErrorShown) {
    isUnauthorizedErrorShown = true
    logOut()

    unauthorizedTimer = setTimeout(resetUnauthorizedError, UNAUTHORIZED_DEBOUNCE_TIME)

    showError(error, true)
    throw error
  }

  throw error
}

/** 重置401防抖状态 */
function resetUnauthorizedError() {
  isUnauthorizedErrorShown = false
  if (unauthorizedTimer) clearTimeout(unauthorizedTimer)
  unauthorizedTimer = null
}

/** 退出登录函数 */
function logOut() {
  setTimeout(() => {
    useUserStore().logOut()
  }, LOGOUT_DELAY)
}

/** 是否需要重试 */
function shouldRetry(statusCode: number) {
  return [
    ApiStatus.requestTimeout,
    ApiStatus.internalServerError,
    ApiStatus.badGateway,
    ApiStatus.serviceUnavailable,
    ApiStatus.gatewayTimeout
  ].includes(statusCode)
}

/** 请求重试逻辑 */
async function retryRequest<T>(
  config: ExtendedAxiosRequestConfig,
  retries: number = MAX_RETRIES
): Promise<T> {
  try {
    return await request<T>(config)
  } catch (error) {
    if (retries > 0 && error instanceof HttpError && shouldRetry(error.code)) {
      if (DEBUG_HTTP) {
        const fullUrl = `${config.baseURL || VITE_API_URL || ''}${config.url || ''}`
        console.warn('[HTTP][retry]', {
          attempt: MAX_RETRIES - retries + 1,
          code: error.code,
          message: error.message,
          url: fullUrl
        })
      }
      await delay(RETRY_DELAY)
      return retryRequest<T>(config, retries - 1)
    }
    if (DEBUG_HTTP) {
      const fullUrl = `${config.baseURL || VITE_API_URL || ''}${config.url || ''}`
      console.error('[HTTP][retry][giveup]', { url: fullUrl, error })
    }
    throw error
  }
}

/** 延迟函数 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 请求函数 */
async function request<T = any>(config: ExtendedAxiosRequestConfig): Promise<T> {
  // POST | PUT 参数自动填充
  if (
    ['POST', 'PUT'].includes(config.method?.toUpperCase() || '') &&
    config.params &&
    !config.data
  ) {
    config.data = config.params
    config.params = undefined
  }

  try {
    const res = await axiosInstance.request<Api.Http.BaseResponse<T>>(config)
    const responseData = res.data as any

    // 处理标准化响应格式
    if (responseData && typeof responseData === 'object') {
      // 如果有success字段且有data字段，表示是标准格式
      if ('success' in responseData && 'data' in responseData) {
        // 如果有分页信息，返回完整响应对象
        if ('pagination' in responseData) {
          return responseData as T
        }
        // 否则只返回data部分
        return responseData.data as T
      }
      // 旧格式：直接返回data字段
      if ('data' in responseData) {
        return responseData.data as T
      }
    }

    // 默认返回整个响应
    return responseData as T
  } catch (error) {
    if (error instanceof HttpError && error.code !== ApiStatus.unauthorized) {
      const showMsg = config.showErrorMessage !== false
      showError(error, showMsg)
    }
    return Promise.reject(error)
  }
}

/** API方法集合 */
const api = {
  get<T>(config: ExtendedAxiosRequestConfig) {
    return retryRequest<T>({ ...config, method: 'GET' })
  },
  post<T>(config: ExtendedAxiosRequestConfig) {
    return retryRequest<T>({ ...config, method: 'POST' })
  },
  put<T>(config: ExtendedAxiosRequestConfig) {
    return retryRequest<T>({ ...config, method: 'PUT' })
  },
  del<T>(config: ExtendedAxiosRequestConfig) {
    return retryRequest<T>({ ...config, method: 'DELETE' })
  },
  request<T>(config: ExtendedAxiosRequestConfig) {
    return retryRequest<T>(config)
  }
}

export default api
