import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API基础配置 - 生产环境使用相对路径，开发环境使用完整URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.MODE === 'production' ? '' : 'http://localhost:30001'
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

// 认证相关API
export const authAPI = {
  // 登录
  login: (credentials: { username: string; password: string; remember?: boolean }) =>
    api.post('/auth/login', credentials),

  // 登出
  logout: () => api.post('/auth/logout'),

  // 获取当前用户信息
  getCurrentUser: () => api.get('/auth/me'),

  // 修改密码
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api.put('/auth/change-password', data),

  // 刷新Token
  refreshToken: () => api.post('/auth/refresh'),
};

// AI模型相关API
export const aiModelsAPI = {
  // 获取AI模型列表
  getModels: (params?: any) => api.getPaginated('/api/ai-models', params),

  // 获取AI模型详情
  getModel: (id: number) => api.get(`/api/ai-models/${id}`),

  // 创建AI模型
  createModel: (data: any) => api.post('/api/ai-models', data),

  // 更新AI模型
  updateModel: (id: number, data: any) => api.put(`/api/ai-models/${id}`, data),

  // 删除AI模型
  deleteModel: (id: number) => api.delete(`/api/ai-models/${id}`),

  // 批量删除AI模型
  batchDeleteModels: (ids: number[]) => api.delete('/api/ai-models/batch', { data: { ids } }),

  // 测试AI模型连接
  testModelConnection: (id: number) => api.post(`/api/ai-models/${id}/test`),

  // 获取AI模型统计
  getModelStats: (id: number, days?: number) => api.get(`/api/ai-models/${id}/stats`, { params: { days } }),

  // 获取AI提供商列表
  getProviders: (params?: any) => api.getPaginated('/api/ai-providers', params),

  // 获取活跃的AI提供商
  getActiveProviders: () => api.get('/api/ai-providers/active'),

  // 获取AI提供商详情
  getProvider: (id: number) => api.get(`/api/ai-providers/${id}`),
};

// 提示词模板相关API
export const promptsAPI = {
  // 获取提示词模板列表
  getTemplates: (params?: any) => api.getPaginated('/api/prompts', params),

  // 获取提示词模板详情
  getTemplate: (id: number) => api.get(`/api/prompts/${id}`),

  // 创建提示词模板
  createTemplate: (data: any) => api.post('/api/prompts', data),

  // 更新提示词模板
  updateTemplate: (id: number, data: any) => api.put(`/api/prompts/${id}`, data),

  // 删除提示词模板
  deleteTemplate: (id: number) => api.delete(`/api/prompts/${id}`),

  // 批量删除提示词模板
  batchDeleteTemplates: (ids: number[]) => api.delete('/api/prompts/batch', { data: { ids } }),

  // 激活提示词模板
  activateTemplate: (id: number) => api.post(`/api/prompts/${id}/activate`),

  // 获取模板版本历史
  getTemplateVersions: (name: string) => api.get(`/api/prompts/${name}/versions`),

  // 复制提示词模板
  duplicateTemplate: (id: number, newName: string) => api.post(`/api/prompts/${id}/duplicate`, { newName }),

  // 获取提示词模板统计
  getTemplateStats: (id: number) => api.get(`/api/prompts/${id}/stats`),
};

// 应用配置相关API
export const configsAPI = {
  // 获取应用配置列表
  getConfigs: (params?: any) => api.getPaginated('/api/configs', params),

  // 获取应用配置详情
  getConfig: (id: number) => api.get(`/api/configs/${id}`),

  // 获取平台配置
  getPlatformConfigs: (platform: string) => api.get(`/api/configs/platform/${platform}`),

  // 创建应用配置
  createConfig: (data: any) => api.post('/api/configs', data),

  // 更新应用配置
  updateConfig: (id: number, data: any) => api.put(`/api/configs/${id}`, data),

  // 删除应用配置
  deleteConfig: (id: number) => api.delete(`/api/configs/${id}`),

  // 批量删除应用配置
  batchDeleteConfigs: (ids: number[]) => api.delete('/api/configs/batch', { data: { ids } }),

  // 批量更新配置状态
  batchUpdateStatus: (ids: number[], isActive: boolean) => 
    api.put('/api/configs/batch/status', { ids, isActive }),

  // 复制配置到其他平台
  copyConfigToPlatform: (id: number, targetPlatform: string) => 
    api.post(`/api/configs/${id}/copy`, { targetPlatform }),

  // 获取配置分类
  getCategories: () => api.get('/api/configs/categories'),
};

// 卦象数据API
export const hexagramsAPI = {
  // 获取卦象数据列表
  getHexagrams: (params?: any) => api.get('/api/hexagrams', { params }),

  // 根据ID获取卦象数据
  getHexagramById: (id: number) => api.get(`/api/hexagrams/${id}`),

  // 创建卦象数据
  createHexagram: (data: any) => api.post('/api/hexagrams', data),

  // 更新卦象数据
  updateHexagram: (id: number, data: any) => api.put(`/api/hexagrams/${id}`, data),

  // 删除卦象数据
  deleteHexagram: (id: number) => api.delete(`/api/hexagrams/${id}`),

  // 批量删除卦象数据
  batchDeleteHexagrams: (ids: number[]) => api.delete('/api/hexagrams', { data: { ids } }),
};

// 数据分析API
export const analyticsAPI = {
  // 获取分析概览
  getOverview: () => api.get('/api/analytics/overview'),

  // 获取使用统计
  getUsageStatistics: (params?: any) => api.get('/api/analytics/usage', { params }),

  // 获取模型性能统计
  getModelPerformance: (params?: any) => api.get('/api/analytics/models', { params }),

  // 获取卦象统计
  getHexagramStatistics: (params?: any) => api.get('/api/analytics/hexagrams', { params }),
};

export default apiClient;
