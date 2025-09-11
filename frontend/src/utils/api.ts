import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API基础配置 - 生产环境使用相对路径，开发环境使用完整URL
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3001/api'
);

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token 安全处理工具
const TokenManager = {
  // 获取 token（带过期检查）
  getToken: () => {
    try {
      const token = localStorage.getItem('auth_token');
      const tokenExpiry = localStorage.getItem('auth_token_expiry');

      if (!token || !tokenExpiry) {
        return null;
      }

      // 检查 token 是否过期
      if (Date.now() > parseInt(tokenExpiry)) {
        TokenManager.clearToken();
        return null;
      }

      return token;
    } catch (error) {
      console.error('获取 token 失败:', error);
      return null;
    }
  },

  // 设置 token（带过期时间）
  setToken: (token: string, expiresIn: string = '7d') => {
    try {
      localStorage.setItem('auth_token', token);

      // 解析过期时间
      let expiryTime: number;
      if (expiresIn.endsWith('d')) {
        const days = parseInt(expiresIn);
        expiryTime = Date.now() + (days * 24 * 60 * 60 * 1000);
      } else if (expiresIn.endsWith('h')) {
        const hours = parseInt(expiresIn);
        expiryTime = Date.now() + (hours * 60 * 60 * 1000);
      } else if (expiresIn.endsWith('m')) {
        const minutes = parseInt(expiresIn);
        expiryTime = Date.now() + (minutes * 60 * 1000);
      } else {
        // 默认7天
        expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000);
      }

      localStorage.setItem('auth_token_expiry', expiryTime.toString());
    } catch (error) {
      console.error('设置 token 失败:', error);
    }
  },

  // 清除 token
  clearToken: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token_expiry');
    localStorage.removeItem('user_info');
  },

  // 检查 token 是否即将过期（30分钟内）
  willExpireSoon: () => {
    try {
      const tokenExpiry = localStorage.getItem('auth_token_expiry');
      if (!tokenExpiry) return false;

      const expiryTime = parseInt(tokenExpiry);
      const thirtyMinutes = 30 * 60 * 1000;

      return (expiryTime - Date.now()) < thirtyMinutes;
    } catch (error) {
      console.error('检查 token 过期时间失败:', error);
      return false;
    }
  },

  // 获取 token 剩余时间（毫秒）
  getTimeToExpiry: () => {
    try {
      const tokenExpiry = localStorage.getItem('auth_token_expiry');
      if (!tokenExpiry) return 0;

      const expiryTime = parseInt(tokenExpiry);
      return Math.max(0, expiryTime - Date.now());
    } catch (error) {
      console.error('获取 token 剩余时间失败:', error);
      return 0;
    }
  }
};

// 请求拦截器 - 添加认证token + 网页控制台日志
apiClient.interceptors.request.use(
  (config) => {
    const token = TokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 记录开始时间用于计算耗时
    (config as any)._startTime = Date.now();
    const method = (config.method || 'get').toString().toUpperCase();
    const base = config.baseURL || apiClient.defaults.baseURL || '';
    const fullUrl = `${base || ''}${config.url || ''}`;
    // 仅打印关键字段，避免泄露敏感头
    // 在“网页控制台”直接可见
    console.info(`[API] -> ${method} ${fullUrl}`, {
      params: config.params,
      timeout: config.timeout,
    });

    return config;
  },
  (error) => {
    console.error('[API] request error', { message: error?.message });
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误和token过期
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const start = (response.config as any)._startTime || Date.now();
    const duration = Date.now() - start;
    const method = (response.config.method || 'get').toString().toUpperCase();
    const base = response.config.baseURL || apiClient.defaults.baseURL || '';
    const fullUrl = `${base || ''}${response.config.url || ''}`;
    console.info(`[API] <- ${response.status} ${method} ${fullUrl} (${duration}ms)`, {
      ok: response.status >= 200 && response.status < 300,
      success: (response.data && (response.data.success !== undefined)) ? !!response.data.success : undefined,
      message: response.data?.message,
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 处理401错误（token过期或无效）
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 尝试刷新 token
        const refreshResponse = await authClient.post('/auth/refresh');

        if (refreshResponse.data.success) {
          const newToken = refreshResponse.data.data.token;
          const expiresIn = refreshResponse.data.data.expiresIn;

          // 更新 token
          TokenManager.setToken(newToken, expiresIn);

          // 重试原请求
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient.request(originalRequest);
        }
      } catch (refreshError) {
        console.warn('Token 刷新失败:', refreshError);
      }

      // 刷新失败，清除 token 并跳转登录
      TokenManager.clearToken();

      // 跳转到登录页
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 通用API方法
export const api = {
  // GET请求
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await apiClient.get(url, config);
    return response.data;
  },

  // POST请求
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await apiClient.post(url, data, config);
    return response.data;
  },

  // PUT请求
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await apiClient.put(url, data, config);
    return response.data;
  },

  // DELETE请求
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await apiClient.delete(url, config);
    return response.data;
  },

  // 分页GET请求
  getPaginated: async <T = any>(url: string, params?: any): Promise<PaginatedResponse<T>> => {
    const response = await apiClient.get(url, { params });
    return response.data;
  },
};

// 认证相关API - 认证接口在根路径 /auth 下，不在 /api 下
const AUTH_BASE_URL = import.meta.env.VITE_API_URL ?
  import.meta.env.VITE_API_URL.replace('/api', '') :
  (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001');

const authClient = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 为认证客户端添加token拦截器 + 网页控制台日志
authClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    (config as any)._startTime = Date.now();
    const method = (config.method || 'get').toString().toUpperCase();
    const base = config.baseURL || '';
    const fullUrl = `${base || ''}${config.url || ''}`;
    console.info(`[AUTH] -> ${method} ${fullUrl}`, { params: config.params, timeout: config.timeout });
    return config;
  },
  (error) => {
    console.error('[AUTH] request error', { message: error?.message });
    return Promise.reject(error);
  }
);

authClient.interceptors.response.use(
  (response) => {
    const start = (response.config as any)._startTime || Date.now();
    const duration = Date.now() - start;
    const method = (response.config.method || 'get').toString().toUpperCase();
    const base = response.config.baseURL || '';
    const fullUrl = `${base || ''}${response.config.url || ''}`;
    console.info(`[AUTH] <- ${response.status} ${method} ${fullUrl} (${duration}ms)`, {
      ok: response.status >= 200 && response.status < 300,
      success: (response.data && (response.data.success !== undefined)) ? !!response.data.success : undefined,
      message: response.data?.message,
    });
    return response;
  },
  (error) => {
    try {
      const cfg = error.config || {};
      const start = (cfg as any)._startTime || Date.now();
      const duration = Date.now() - start;
      const method = (cfg.method || 'get').toString().toUpperCase();
      const base = cfg.baseURL || '';
      const fullUrl = `${base || ''}${cfg.url || ''}`;
      const status = error.response?.status;
      console.error(`[AUTH] xx ${status ?? 'ERR'} ${method} ${fullUrl} (${duration}ms)`, {
        message: error.message,
        data: error.response?.data,
      });
    } catch {}
    return Promise.reject(error);
  }
);

export const authAPI = {
  // 登录
  login: async (credentials: { username: string; password: string; remember?: boolean }) => {
    const response = await authClient.post('/auth/login', credentials);
    return response.data;
  },

  // 登出
  logout: async () => {
    const response = await authClient.post('/auth/logout');
    return response.data;
  },

  // 获取当前用户信息
  getCurrentUser: async () => {
    const response = await authClient.get('/auth/me');
    return response.data;
  },

  // 修改密码
  changePassword: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    const response = await authClient.put('/auth/change-password', data);
    return response.data;
  },

  // 刷新Token
  refreshToken: async () => {
    const response = await authClient.post('/auth/refresh');
    return response.data;
  },
};

// AI模型相关API
export const aiModelsAPI = {
  // 获取模型列表
  getModels: (params?: any) => api.getPaginated('/ai-models', params),

  // 获取AI模型详情
  getModel: (id: number) => api.get(`/ai-models/${id}`),

  // 创建AI模型
  createModel: (data: any) => api.post('/ai-models', data),

  // 更新AI模型
  updateModel: (id: number, data: any) => api.put(`/ai-models/${id}`, data),

  // 删除AI模型
  deleteModel: (id: number) => api.delete(`/ai-models/${id}`),

  // 批量删除AI模型
  batchDeleteModels: (ids: number[]) => api.delete('/ai-models/batch', { data: { ids } }),

  // 测试AI模型连接
  testModelConnection: (id: number) => api.post(`/ai-models/${id}/test`),

  // 获取AI模型统计
  getModelStats: (id: number, days?: number) => api.get(`/ai-models/${id}/stats`, { params: { days } }),

  // 获取AI服务商列表
  getProviders: (params?: any) => api.getPaginated('/ai-providers', params),

  // 获取活跃的AI服务商
  getActiveProviders: () => api.get('/ai-providers/active'),

  // 获取AI服务商详情
  getProvider: (id: number) => api.get(`/ai-providers/${id}`),

  // 获取当前活跃AI配置
  getActiveConfiguration: () => api.get('/ai-models/active'),

  // 获取当前主模型
  getPrimaryModel: () => api.get('/ai-models/primary'),

  // 拉取模型列表
  fetchModels: (data: { provider: string; apiKey: string; apiUrl?: string }) =>
    api.post('/ai-models/fetch-models', data),

  // 测试API连接
  testConnection: (data: { provider: string; apiKey: string; apiUrl?: string }) =>
    api.post('/ai-models/test-connection', data),
};

// 提示词模板相关API
export const promptsAPI = {
  // 获取提示词模板列表
  getTemplates: (params?: any) => api.getPaginated('/prompts', params),

  // 获取提示词模板详情
  getTemplate: (id: number) => api.get(`/prompts/${id}`),

  // 创建提示词模板
  createTemplate: (data: any) => api.post('/prompts', data),

  // 更新提示词模板
  updateTemplate: (id: number, data: any) => api.put(`/prompts/${id}`, data),

  // 删除提示词模板
  deleteTemplate: (id: number) => api.delete(`/prompts/${id}`),

  // 批量删除提示词模板
  batchDeleteTemplates: (ids: number[]) => api.delete('/prompts/batch', { data: { ids } }),

  // 激活提示词模板
  activateTemplate: (id: number) => api.post(`/prompts/${id}/activate`),

  // 获取模板版本历史
  getTemplateVersions: (name: string) => api.get(`/prompts/${name}/versions`),

  // 复制提示词模板
  duplicateTemplate: (id: number, newName: string) => api.post(`/prompts/${id}/duplicate`, { newName }),

  // 获取提示词模板统计
  getTemplateStats: (id: number) => api.get(`/prompts/${id}/stats`),
};

// 应用配置相关API
export const configsAPI = {
  // 获取应用配置列表
  getConfigs: (params?: any) => api.getPaginated('/configs', params),

  // 获取应用配置详情
  getConfig: (id: number) => api.get(`/configs/${id}`),

  // 获取平台配置
  getPlatformConfigs: (platform: string) => api.get(`/configs/platform/${platform}`),

  // 创建应用配置
  createConfig: (data: any) => api.post('/configs', data),

  // 更新应用配置
  updateConfig: (id: number, data: any) => api.put(`/configs/${id}`, data),

  // 删除应用配置
  deleteConfig: (id: number) => api.delete(`/configs/${id}`),

  // 批量删除应用配置
  batchDeleteConfigs: (ids: number[]) => api.delete('/configs/batch', { data: { ids } }),

  // 批量更新配置状态
  batchUpdateStatus: (ids: number[], isActive: boolean) =>
    api.put('/configs/batch/status', { ids, isActive }),

  // 复制配置到其他平台
  copyConfigToPlatform: (id: number, targetPlatform: string) =>
    api.post(`/configs/${id}/copy`, { targetPlatform }),

  // 获取配置分类
  getCategories: () => api.get('/configs/categories'),
};

// 卦象数据API
export const hexagramsAPI = {
  // 获取卦象数据列表
  getHexagrams: (params?: any) => api.get('/hexagrams', { params }),

  // 根据ID获取卦象数据
  getHexagramById: (id: number) => api.get(`/hexagrams/${id}`),

  // 创建卦象数据
  createHexagram: (data: any) => api.post('/hexagrams', data),

  // 更新卦象数据
  updateHexagram: (id: number, data: any) => api.put(`/hexagrams/${id}`, data),

  // 删除卦象数据
  deleteHexagram: (id: number) => api.delete(`/hexagrams/${id}`),

  // 批量删除卦象数据
  batchDeleteHexagrams: (ids: number[]) => api.delete('/hexagrams', { data: { ids } }),
};

// 数据分析API
export const analyticsAPI = {
  // 获取分析概览
  getOverview: () => api.get('/analytics/overview'),

  // 获取使用统计
  getUsageStatistics: (params?: any) => api.get('/analytics/usage', { params }),

  // 获取模型性能统计
  getModelPerformance: (params?: any) => api.get('/analytics/models', { params }),

  // 获取卦象统计
  getHexagramStatistics: (params?: any) => api.get('/analytics/hexagrams', { params }),
};

// API Key 管理API
export const apiKeysAPI = {
  // 获取API Key列表
  getApiKeys: (params?: any) => api.getPaginated('/api-keys', params),

  // 获取API Key详情
  getApiKey: (id: number) => api.get(`/api-keys/${id}`),

  // 创建API Key
  createApiKey: (data: any) => api.post('/api-keys', data),

  // 更新API Key
  updateApiKey: (id: number, data: any) => api.put(`/api-keys/${id}`, data),

  // 删除API Key
  deleteApiKey: (id: number) => api.delete(`/api-keys/${id}`),

  // 重新生成API Key
  regenerateApiKey: (id: number) => api.post(`/api-keys/${id}/regenerate`),

  // 批量删除API Key
  batchDeleteApiKeys: (ids: number[]) => api.delete('/api-keys/batch', { data: { ids } }),

  // 获取API Key使用统计
  getApiKeyUsageStats: (days?: number) => api.get('/api-keys/usage-stats', { params: { days } }),
};

// 使用数据分析API
export const usageAPI = {
  // 获取API调用日志
  getApiLogs: (params?: {
    apiKeyId?: number;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.getPaginated('/usage/logs', params),

  // 获取使用指标
  getUsageMetrics: (params?: {
    apiKeyId?: number;
    clientId?: string;
    period?: 'day' | 'week' | 'month' | 'year';
    startDate?: string;
    endDate?: string;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
  }) => api.get('/usage/metrics', { params }),

  // 获取客户端统计
  getClientStats: (params?: {
    apiKeyId?: number;
    period?: number;
    top?: number;
  }) => api.get('/usage/clients', { params }),

  // 获取实时统计
  getRealtimeStats: () => api.get('/usage/realtime'),

  // 获取错误分析
  getErrorAnalysis: (params?: {
    apiKeyId?: number;
    period?: number;
    groupBy?: 'status' | 'endpoint' | 'client';
  }) => api.get('/usage/errors', { params }),

  // 获取性能分析
  getPerformanceMetrics: (params?: {
    apiKeyId?: number;
    period?: number;
    percentiles?: number[];
  }) => api.get('/usage/performance', { params }),

  // 获取API端点统计
  getEndpointStats: (params?: {
    apiKeyId?: number;
    period?: number;
    top?: number;
  }) => api.get('/usage/endpoints', { params }),

  // 获取地理位置分析
  getGeoAnalysis: (params?: {
    apiKeyId?: number;
    period?: number;
  }) => api.get('/usage/geo', { params }),

  // 获取设备分析
  getDeviceAnalysis: (params?: {
    apiKeyId?: number;
    period?: number;
  }) => api.get('/usage/devices', { params }),

  // 导出报告
  exportReport: (params: {
    type: 'logs' | 'metrics' | 'summary';
    format: 'csv' | 'json' | 'pdf';
    startDate?: string;
    endDate?: string;
    apiKeyId?: number;
  }) => api.get('/usage/export', { params, responseType: 'blob' }),

  // 获取使用指标数据
  getMetricsData: (params?: {
    apiKeyId?: number;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    metricName?: string;
    limit?: number;
  }) => api.get('/usage/metrics-data', { params }),
};

// 导出 TokenManager 供其他模块使用
export { TokenManager };

export default apiClient;
