import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || '服务器内部错误';
  let code = error.code || 'INTERNAL_ERROR';
  let details = error.details;

  // 处理Prisma错误
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        message = '数据已存在，违反唯一约束';
        code = 'DUPLICATE_ENTRY';
        details = {
          target: error.meta?.['target'],
          constraint: error.meta?.['constraint']
        };
        break;
      case 'P2025':
        statusCode = 404;
        message = '记录未找到';
        code = 'RECORD_NOT_FOUND';
        break;
      case 'P2003':
        statusCode = 400;
        message = '外键约束失败';
        code = 'FOREIGN_KEY_CONSTRAINT';
        break;
      case 'P2014':
        statusCode = 400;
        message = '数据关系冲突';
        code = 'RELATION_VIOLATION';
        break;
      default:
        statusCode = 400;
        message = '数据库操作失败';
        code = 'DATABASE_ERROR';
        details = { prismaCode: error.code };
    }
  }

  // 处理Prisma验证错误
  if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = '数据验证失败';
    code = 'VALIDATION_ERROR';
  }

  // 处理JWT错误
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token无效';
    code = 'INVALID_TOKEN';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token已过期';
    code = 'TOKEN_EXPIRED';
  }

  // 处理验证错误
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = '请求参数验证失败';
    code = 'VALIDATION_ERROR';
  }

  // 记录错误日志
  logger.error('API错误', {
    error: {
      message: error.message,
      stack: error.stack,
      statusCode,
      code,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      user: req.user?.username,
    },
  });

  // 生产环境不返回敏感信息
  if (process.env['NODE_ENV'] === 'production') {
    if (statusCode === 500) {
      message = '服务器内部错误';
      details = undefined;
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    details,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  });
};

/**
 * 异步错误捕获包装器
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 创建API错误
 */
export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  if (code) error.code = code;
  if (details) error.details = details;
  return error;
};

/**
 * 404错误处理中间件
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = createError(
    `路由 ${req.method} ${req.path} 未找到`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};
