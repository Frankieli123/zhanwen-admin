import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createError } from '@/middleware/error.middleware';
import { ApiResponse, PaginatedResponse } from '@/types/api.types';
import { generateApiKey } from '@/utils/apiKey';

const prisma = new PrismaClient();

/**
 * 获取API Key列表
 */
export const getApiKeys = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;

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

  res.json(response);
};

/**
 * 获取API Key详情
 */
export const getApiKeyById = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);

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
    throw createError('API Key不存在', 404, 'API_KEY_NOT_FOUND');
  }

  const response: ApiResponse = {
    success: true,
    message: '获取API Key详情成功',
    data: apiKey,
  };

  res.json(response);
};

/**
 * 创建API Key
 */
export const createApiKey = async (req: Request, res: Response): Promise<void> => {
  const { name, permissions, description, expiresAt } = req.body;

  // 生成API Key
  const key = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      key,
      permissions: permissions || [],
      description,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
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

  res.status(201).json(response);
};

/**
 * 更新API Key
 */
export const updateApiKey = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const { name, permissions, description, isActive, expiresAt } = req.body;

  const existingApiKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!existingApiKey) {
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

  res.json(response);
};

/**
 * 删除API Key
 */
export const deleteApiKey = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);

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

  res.json(response);
};

/**
 * 重新生成API Key
 */
export const regenerateApiKey = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);

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

  res.json(response);
};

/**
 * 批量删除API Key
 */
export const batchDeleteApiKeys = async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body;

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

  res.json(response);
};
