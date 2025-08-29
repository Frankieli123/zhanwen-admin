import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createError } from '@/middleware/error.middleware';
import { ApiResponse, PaginatedResponse } from '@/types/api.types';
import { generateApiKey } from '@/utils/apiKey';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

/**
 * 获取API Key列表
 */
export const getApiKeys = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;
  const reqMeta = {
    method: req.method,
    path: (req as any).originalUrl || req.url,
    userId: (req as any).user?.userId,
    ip: (req.headers['x-forwarded-for'] as string) || (req as any).ip,
  };
  const t0 = Date.now();
  logger.info('API getApiKeys: start', { ...reqMeta, page, limit, hasSearch: Boolean(search) });

  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [apiKeys, total] = await Promise.all([
    prisma.apiKey.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.apiKey.count({ where: whereClause }),
  ]);

  const duration = Date.now() - t0;
  if (duration > 1000) {
    logger.warn('API getApiKeys: slow query', { ...reqMeta, durationMs: duration, returned: apiKeys.length, total });
  } else {
    logger.debug('API getApiKeys: query complete', { ...reqMeta, durationMs: duration, returned: apiKeys.length, total });
  }

  const totalPages = Math.ceil(total / limit);

  const response: PaginatedResponse = {
    success: true,
    message: '获取API Key列表成功',
    data: apiKeys,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };

  logger.info('API getApiKeys: success', { ...reqMeta, durationMs: Date.now() - t0, returned: apiKeys.length, total, page, limit });
  res.json(response);
};

/**
 * 获取API Key详情
 */
export const getApiKeyById = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const reqMeta = {
    method: req.method,
    path: (req as any).originalUrl || req.url,
    userId: (req as any).user?.userId,
    ip: (req.headers['x-forwarded-for'] as string) || (req as any).ip,
    id,
  };
  const t0 = Date.now();
  logger.debug('API getApiKeyById: start', reqMeta);

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      key: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      usageCount: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!apiKey) {
    logger.warn('API getApiKeyById: not found', reqMeta);
    throw createError('API Key不存在', 404, 'API_KEY_NOT_FOUND');
  }

  const response: ApiResponse = {
    success: true,
    message: '获取API Key详情成功',
    data: apiKey,
  };

  logger.info('API getApiKeyById: success', { ...reqMeta, durationMs: Date.now() - t0 });
  res.json(response);
};

/**
 * 创建API Key
 */
export const createApiKey = async (req: Request, res: Response): Promise<void> => {
  const { name, permissions, description, expiresAt, isActive = true } = req.body;

  // 生成API Key
  const key = generateApiKey();
  const reqMeta = {
    method: req.method,
    path: (req as any).originalUrl || req.url,
    userId: (req as any).user?.userId,
    ip: (req.headers['x-forwarded-for'] as string) || (req as any).ip,
    name,
    isActive,
    hasExpiresAt: Boolean(expiresAt),
    permissionsCount: Array.isArray(permissions) ? permissions.length : 0,
  };
  const t0 = Date.now();
  logger.info('API createApiKey: start', reqMeta);

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      key,
      permissions: permissions || [],
      description,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive,
    },
    select: {
      id: true,
      name: true,
      key: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      description: true,
      createdAt: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    message: 'API Key创建成功',
    data: apiKey,
  };

  logger.info('API createApiKey: success', { ...reqMeta, durationMs: Date.now() - t0, id: apiKey.id });
  res.status(201).json(response);
};

/**
 * 更新API Key
 */
export const updateApiKey = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const { name, permissions, description, isActive, expiresAt } = req.body;
  const reqMeta = {
    method: req.method,
    path: (req as any).originalUrl || req.url,
    userId: (req as any).user?.userId,
    ip: (req.headers['x-forwarded-for'] as string) || (req as any).ip,
    id,
  };
  const t0 = Date.now();
  logger.info('API updateApiKey: start', { ...reqMeta, hasName: Boolean(name), hasPermissions: Array.isArray(permissions), hasExpiresAt: Boolean(expiresAt) });

  const existingApiKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!existingApiKey) {
    logger.warn('API updateApiKey: not found', reqMeta);
    throw createError('API Key不存在', 404, 'API_KEY_NOT_FOUND');
  }

  const updatedApiKey = await prisma.apiKey.update({
    where: { id },
    data: {
      name,
      permissions,
      description,
      isActive,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    select: {
      id: true,
      name: true,
      key: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      usageCount: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    message: 'API Key更新成功',
    data: updatedApiKey,
  };

  logger.info('API updateApiKey: success', { ...reqMeta, durationMs: Date.now() - t0 });
  res.json(response);
};

/**
 * 删除API Key
 */
export const deleteApiKey = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const reqMeta = {
    method: req.method,
    path: (req as any).originalUrl || req.url,
    userId: (req as any).user?.userId,
    ip: (req.headers['x-forwarded-for'] as string) || (req as any).ip,
    id,
  };
  const t0 = Date.now();
  logger.info('API deleteApiKey: start', reqMeta);

  const existingApiKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!existingApiKey) {
    throw createError('API Key不存在', 404, 'API_KEY_NOT_FOUND');
  }

  await prisma.apiKey.delete({
    where: { id },
  });

  const response: ApiResponse = {
    success: true,
    message: 'API Key删除成功',
  };

  logger.info('API deleteApiKey: success', { ...reqMeta, durationMs: Date.now() - t0 });
  res.json(response);
};

/**
 * 重新生成API Key
 */
export const regenerateApiKey = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const reqMeta = {
    method: req.method,
    path: (req as any).originalUrl || req.url,
    userId: (req as any).user?.userId,
    ip: (req.headers['x-forwarded-for'] as string) || (req as any).ip,
    id,
  };
  const t0 = Date.now();
  logger.info('API regenerateApiKey: start', reqMeta);

  const existingApiKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!existingApiKey) {
    throw createError('API Key不存在', 404, 'API_KEY_NOT_FOUND');
  }

  // 生成新的API Key
  const newKey = generateApiKey();

  const updatedApiKey = await prisma.apiKey.update({
    where: { id },
    data: {
      key: newKey,
      usageCount: 0, // 重置使用次数
      lastUsedAt: null, // 重置最后使用时间
    },
    select: {
      id: true,
      name: true,
      key: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    message: 'API Key重新生成成功',
    data: updatedApiKey,
  };

  logger.info('API regenerateApiKey: success', { ...reqMeta, durationMs: Date.now() - t0 });
  res.json(response);
};

/**
 * 批量删除API Key
 */
export const batchDeleteApiKeys = async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body;
  const reqMeta = {
    method: req.method,
    path: (req as any).originalUrl || req.url,
    userId: (req as any).user?.userId,
    ip: (req.headers['x-forwarded-for'] as string) || (req as any).ip,
    count: Array.isArray(ids) ? ids.length : 0,
    sample: Array.isArray(ids) ? ids.slice(0, 5) : [],
  };
  const t0 = Date.now();
  logger.info('API batchDeleteApiKeys: start', reqMeta);

  if (!Array.isArray(ids) || ids.length === 0) {
    throw createError('请提供要删除的API Key ID列表', 400, 'INVALID_IDS');
  }

  const deleteResult = await prisma.apiKey.deleteMany({
    where: {
      id: { in: ids },
    },
  });

  const response: ApiResponse = {
    success: true,
    message: `成功删除 ${deleteResult.count} 个API Key`,
    data: { deletedCount: deleteResult.count },
  };

  logger.info('API batchDeleteApiKeys: success', { ...reqMeta, durationMs: Date.now() - t0, deleted: deleteResult.count });
  res.json(response);
};
