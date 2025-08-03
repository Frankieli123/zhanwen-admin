import { Request } from 'express';

// 扩展 Express 命名空间以包含 Multer
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  timestamp?: string;
  path?: string;
  method?: string;
}

// 分页响应类型
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

// 分页查询参数
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
  search?: string;
  category?: string;
  status?: string;
  platform?: string;
}

// 用户认证相关类型
export interface LoginRequest {
  username: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: string;
    permissions: string[];
  };
  expiresIn: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// AI模型相关类型
export interface AIModelCreateRequest {
  providerId: number | string;
  name: string;
  displayName?: string;
  apiKeyEncrypted?: string;
  customApiUrl?: string;
  customProviderName?: string;
  modelType?: 'chat' | 'completion' | 'embedding';
  parameters?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
  role?: 'primary' | 'secondary' | 'disabled';
  priority?: number;
  costPer1kTokens?: number;
  contextWindow?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface AIModelUpdateRequest {
  providerId?: number | string;
  name?: string;
  displayName?: string;
  apiKeyEncrypted?: string;
  customApiUrl?: string;
  customProviderName?: string;
  modelType?: 'chat' | 'completion' | 'embedding';
  parameters?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
  role?: 'primary' | 'secondary' | 'disabled';
  priority?: number;
  costPer1kTokens?: number | string;
  contextWindow?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

// 提示词模板相关类型
export interface PromptTemplateCreateRequest {
  name: string;
  type: 'system' | 'user' | 'format';
  category?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
  formatInstructions?: string;
  variables?: string[];
  description?: string;
  tags?: string[];
}

export interface PromptTemplateUpdateRequest {
  name?: string;
  type?: 'system' | 'user' | 'format';
  category?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
  formatInstructions?: string;
  variables?: string[];
  status?: 'draft' | 'active' | 'deprecated';
  description?: string;
  tags?: string[];
}

// 应用配置相关类型
export interface AppConfigCreateRequest {
  platform: 'web' | 'ios' | 'android' | 'wechat';
  configKey: string;
  configValue: any;
  dataType?: 'json' | 'string' | 'number' | 'boolean';
  category?: string;
  description?: string;
  isSensitive?: boolean;
  validationRules?: Record<string, any>;
}

export interface AppConfigUpdateRequest {
  configValue?: any;
  dataType?: 'json' | 'string' | 'number' | 'boolean';
  category?: string;
  description?: string;
  isActive?: boolean;
  isSensitive?: boolean;
  validationRules?: Record<string, any>;
}

// 卦象数据相关类型
export interface HexagramDataCreateRequest {
  name: string;
  element: string;
  description?: string;
  interpretation?: string;
  favorableActions?: string[];
  unfavorableActions?: string[];
  timeInfo?: Record<string, any>;
  directionInfo?: Record<string, any>;
  resolutionMethods?: string[];
  metadata?: Record<string, any>;
}

export interface HexagramDataUpdateRequest {
  name?: string;
  element?: string;
  description?: string;
  interpretation?: string;
  favorableActions?: string[];
  unfavorableActions?: string[];
  timeInfo?: Record<string, any>;
  directionInfo?: Record<string, any>;
  resolutionMethods?: string[];
  metadata?: Record<string, any>;
  isActive?: boolean;
}

// 批量操作类型
export interface BatchDeleteRequest {
  ids: number[];
}

export interface BatchUpdateRequest {
  ids: number[];
  data: Record<string, any>;
}

// 统计数据类型
export interface DashboardStats {
  totalUsers: number;
  totalApiCalls: number;
  totalCost: number;
  activeModels: number;
  recentActivity: Array<{
    id: number;
    action: string;
    resourceType: string;
    user: string;
    timestamp: string;
  }>;
  apiCallsChart: Array<{
    date: string;
    calls: number;
    cost: number;
  }>;
  modelUsageChart: Array<{
    model: string;
    calls: number;
    percentage: number;
  }>;
}

// 错误类型
export interface ApiError {
  success: false;
  message: string;
  code: string;
  details?: any;
  timestamp: string;
  path: string;
  method: string;
}

// 文件上传类型
export interface FileUploadResponse {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  url: string;
}

// 导出/导入类型
export interface ExportRequest {
  format: 'json' | 'csv' | 'xlsx';
  filters?: Record<string, any>;
}

export interface ImportRequest {
  file: Express.Multer.File;
  options?: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
  };
}
