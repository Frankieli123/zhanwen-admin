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

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误和token过期
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储并跳转到登录页
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      window.location.href = '/login';
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

// 为认证客户端添加token拦截器
authClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
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
  // 获取AI模型列表
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

  // 获取AI提供商列表
  getProviders: (params?: any) => api.getPaginated('/ai-providers', params),

  // 获取活跃的AI提供商
  getActiveProviders: () => api.get('/ai-providers/active'),

  // 获取AI提供商详情
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

export default apiClient;
