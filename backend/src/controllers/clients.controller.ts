import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import { generateClientId } from '@/utils/clientId';

const prisma = new PrismaClient();

// 获取所有客户端应用
export const getClients = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, platform, isActive } = req.query;
    
    const whereClause: any = {};
    if (platform) whereClause.platform = platform;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';

    const [clients, total] = await Promise.all([
      prisma.clientApp.findMany({
        where: whereClause,
        include: {
          apiKey: {
            select: {
              name: true,
              key: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.clientApp.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      message: '获取客户端列表成功',
      data: {
        clients,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('获取客户端列表失败', { error });
    throw createError('获取客户端列表失败', 500);
  }
};

// 创建新客户端应用
export const createClient = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      platform,
      version,
      owner,
      contactEmail,
      apiKeyId,
    } = req.body;

    // 生成唯一的客户端ID
    const clientId = generateClientId();

    const client = await prisma.clientApp.create({
      data: {
        clientId,
        name,
        description,
        platform,
        version,
        owner,
        contactEmail,
        apiKeyId: apiKeyId ? parseInt(apiKeyId) : null,
      },
      include: {
        apiKey: {
          select: {
            name: true,
            key: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: '客户端创建成功',
      data: client,
    });
  } catch (error) {
    logger.error('创建客户端失败', { error });
    throw createError('创建客户端失败', 500);
  }
};

// 获取单个客户端详情
export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const client = await prisma.clientApp.findUnique({
      where: { id: parseInt(id) },
      include: {
        apiKey: {
          select: {
            name: true,
            key: true,
          },
        },
        apiCallLogs: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
        usageStatistics: {
          take: 30,
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!client) {
      res.status(404).json({
        success: false,
        message: '客户端不存在',
        code: 'CLIENT_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      message: '获取客户端详情成功',
      data: client,
    });
  } catch (error) {
    logger.error('获取客户端详情失败', { error });
    throw createError('获取客户端详情失败', 500);
  }
};

// 更新客户端信息
export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      platform,
      version,
      owner,
      contactEmail,
      isActive,
      apiKeyId,
    } = req.body;

    const client = await prisma.clientApp.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        platform,
        version,
        owner,
        contactEmail,
        isActive,
        apiKeyId: apiKeyId ? parseInt(apiKeyId) : null,
      },
      include: {
        apiKey: {
          select: {
            name: true,
            key: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: '客户端更新成功',
      data: client,
    });
  } catch (error) {
    logger.error('更新客户端失败', { error });
    throw createError('更新客户端失败', 500);
  }
};

// 删除客户端
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.clientApp.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: '客户端删除成功',
    });
  } catch (error) {
    logger.error('删除客户端失败', { error });
    throw createError('删除客户端失败', 500);
  }
};

// 获取客户端统计数据
export const getClientStats = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [
      totalRequests,
      successfulRequests,
      totalTokens,
      totalCost,
      avgResponseTime,
      dailyStats,
    ] = await Promise.all([
      // 总请求数
      prisma.apiCallLog.count({
        where: {
          clientId,
          createdAt: { gte: start, lte: end },
        },
      }),
      // 成功请求数
      prisma.apiCallLog.count({
        where: {
          clientId,
          status: 'success',
          createdAt: { gte: start, lte: end },
        },
      }),
      // 总token数
      prisma.apiCallLog.aggregate({
        where: {
          clientId,
          createdAt: { gte: start, lte: end },
        },
        _sum: {
          tokensUsed: true,
        },
      }),
      // 总成本
      prisma.apiCallLog.aggregate({
        where: {
          clientId,
          createdAt: { gte: start, lte: end },
        },
        _sum: {
          cost: true,
        },
      }),
      // 平均响应时间
      prisma.apiCallLog.aggregate({
        where: {
          clientId,
          createdAt: { gte: start, lte: end },
          responseTimeMs: { not: null },
        },
        _avg: {
          responseTimeMs: true,
        },
      }),
      // 每日统计
      prisma.usageStatistic.findMany({
        where: {
          clientId,
          date: { gte: start, lte: end },
        },
        orderBy: {
          date: 'asc',
        },
      }),
    ]);

    const stats = {
      summary: {
        totalRequests,
        successfulRequests,
        successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
        totalTokens: Number(totalTokens._sum.tokensUsed || 0),
        totalCost: Number(totalCost._sum.cost || 0),
        avgResponseTime: Math.round(avgResponseTime._avg.responseTimeMs || 0),
      },
      dailyStats,
    };

    res.json({
      success: true,
      message: '获取客户端统计成功',
      data: stats,
    });
  } catch (error) {
    logger.error('获取客户端统计失败', { error });
    throw createError('获取客户端统计失败', 500);
  }
};

// 重新生成客户端ID
export const regenerateClientId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const newClientId = generateClientId();

    const client = await prisma.clientApp.update({
      where: { id: parseInt(id) },
      data: {
        clientId: newClientId,
      },
    });

    res.json({
      success: true,
      message: '客户端ID重新生成成功',
      data: {
        id: client.id,
        clientId: client.clientId,
      },
    });
  } catch (error) {
    logger.error('重新生成客户端ID失败', { error });
    throw createError('重新生成客户端ID失败', 500);
  }
};
