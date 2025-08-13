import { Request, Response } from 'express';
import { createError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';
import { PaginationQuery, PaginatedResponse } from '@/types/api.types';

// 获取卦象数据列表
export const getHexagrams = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, element, isActive } = req.query as PaginationQuery & {
      element?: string;
      isActive?: string;
    };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (element) where.element = element;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [hexagrams, total] = await Promise.all([
      prisma.hexagramData.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.hexagramData.count({ where }),
    ]);

    const response: PaginatedResponse<any> = {
      success: true,
      message: '获取卦象数据成功',
      data: hexagrams,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: Number(page) * Number(limit) < total,
        hasPrev: Number(page) > 1,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('获取卦象数据失败', { error });
    throw createError('获取卦象数据失败', 500);
  }
};

// 根据ID获取卦象数据
export const getHexagramById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const hexagram = await prisma.hexagramData.findUnique({
      where: { id: Number(id) },
    });

    if (!hexagram) {
      throw createError('卦象数据不存在', 404);
    }

    res.json({
      success: true,
      message: '获取卦象数据成功',
      data: hexagram,
    });
  } catch (error) {
    logger.error('获取卦象数据失败', { error, id: req.params.id });
    throw error;
  }
};

// 创建卦象数据
export const createHexagram = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const hexagram = await prisma.hexagramData.create({
      data: {
        ...data,
        timeInfo: data.timeInfo || {},
        directionInfo: data.directionInfo || {},
        metadata: data.metadata || {},
      },
    });

    logger.info('卦象数据创建成功', { hexagramId: hexagram.id });

    res.status(201).json({
      success: true,
      message: '卦象数据创建成功',
      data: hexagram,
    });
  } catch (error) {
    logger.error('创建卦象数据失败', { error, data: req.body });
    throw createError('创建卦象数据失败', 500);
  }
};

// 更新卦象数据
export const updateHexagram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existingHexagram = await prisma.hexagramData.findUnique({
      where: { id: Number(id) },
    });

    if (!existingHexagram) {
      throw createError('卦象数据不存在', 404);
    }

    const hexagram = await prisma.hexagramData.update({
      where: { id: Number(id) },
      data: {
        ...data,
        timeInfo: data.timeInfo || existingHexagram.timeInfo,
        directionInfo: data.directionInfo || existingHexagram.directionInfo,
        metadata: data.metadata || existingHexagram.metadata,
      },
    });

    logger.info('卦象数据更新成功', { hexagramId: hexagram.id });

    res.json({
      success: true,
      message: '卦象数据更新成功',
      data: hexagram,
    });
  } catch (error) {
    logger.error('更新卦象数据失败', { error, id: req.params.id });
    throw error;
  }
};

// 删除卦象数据
export const deleteHexagram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingHexagram = await prisma.hexagramData.findUnique({
      where: { id: Number(id) },
    });

    if (!existingHexagram) {
      throw createError('卦象数据不存在', 404);
    }

    await prisma.hexagramData.delete({
      where: { id: Number(id) },
    });

    logger.info('卦象数据删除成功', { hexagramId: Number(id) });

    res.json({
      success: true,
      message: '卦象数据删除成功',
    });
  } catch (error) {
    logger.error('删除卦象数据失败', { error, id: req.params.id });
    throw error;
  }
};

// 批量删除卦象数据
export const batchDeleteHexagrams = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    const result = await prisma.hexagramData.deleteMany({
      where: {
        id: {
          in: ids.map((id: string) => Number(id)),
        },
      },
    });

    logger.info('批量删除卦象数据成功', { count: result.count, ids });

    res.json({
      success: true,
      message: `成功删除 ${result.count} 条卦象数据`,
      data: { deletedCount: result.count },
    });
  } catch (error) {
    logger.error('批量删除卦象数据失败', { error, ids: req.body.ids });
    throw createError('批量删除卦象数据失败', 500);
  }
};
