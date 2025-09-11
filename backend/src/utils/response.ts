/**
 * 标准化响应格式辅助函数
 */

export interface StandardResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: Record<string, any>;
  timestamp?: string;
}

/**
 * 创建成功响应
 */
export function successResponse<T = any>(
  message: string,
  data?: T,
  pagination?: StandardResponse['pagination'],
  meta?: Record<string, any>
): StandardResponse<T> {
  return {
    success: true,
    message,
    data,
    pagination,
    meta,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 创建错误响应
 */
export function errorResponse(
  message: string,
  code?: number,
  details?: any
): StandardResponse {
  return {
    success: false,
    message,
    data: details,
    meta: { errorCode: code },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 创建分页响应
 */
export function paginatedResponse<T = any>(
  message: string,
  data: T[],
  page: number,
  limit: number,
  total: number,
  meta?: Record<string, any>
): StandardResponse<T[]> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    meta,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 检查响应是否已经是标准格式
 */
export function isStandardResponse(obj: any): obj is StandardResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.success === 'boolean' &&
    typeof obj.message === 'string'
  );
}

/**
 * 确保响应是标准格式
 */
export function ensureStandardResponse<T = any>(
  result: any,
  defaultMessage: string = '操作成功'
): StandardResponse<T> {
  // 如果已经是标准格式，直接返回
  if (isStandardResponse(result)) {
    return result;
  }

  // 如果是数组，包装为标准格式
  if (Array.isArray(result)) {
    return successResponse(defaultMessage, result) as StandardResponse<T>;
  }

  // 如果是对象，尝试智能判断
  if (typeof result === 'object' && result !== null) {
    // 检查是否包含data字段
    if ('data' in result) {
      return {
        success: true,
        message: result.message || defaultMessage,
        data: result.data,
        pagination: result.pagination,
        meta: result.meta,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // 其他情况，直接包装为data
  return successResponse(defaultMessage, result);
}
