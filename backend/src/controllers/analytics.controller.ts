import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

// 获取分析概览
export const getAnalyticsOverview = async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalModels,
      totalTemplates,
      totalHexagrams,
      activeModels,
      activeTemplates
    ] = await Promise.all([
      prisma.adminUser.count(),
      prisma.aiModel.count(),
      prisma.promptTemplate.count(),
      prisma.hexagramData.count(),
      prisma.aiModel.count({ where: { isActive: true } }),
      prisma.promptTemplate.count({ where: { status: 'active' } })
    ]);

    const overview = {
      users: {
        total: totalUsers,
        active: totalUsers, // 简化处理，实际可以根据最后登录时间计算
      },
      models: {
        total: totalModels,
        active: activeModels,
      },
      templates: {
        total: totalTemplates,
        active: activeTemplates,
      },
      hexagrams: {
        total: totalHexagrams,
        active: totalHexagrams,
      },
    };

    res.json({
      success: true,
      message: '获取分析概览成功',
      data: overview,
    });
  } catch (error) {
    logger.error('获取分析概览失败', { error });
    throw createError('获取分析概览失败', 500);
  }
};

// 获取使用统计
export const getUsageStatistics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    // 模拟使用统计数据（实际项目中应该从日志或使用记录表中获取）
    const mockData = {
      period,
      data: [
        { date: '2025-01-01', requests: 120, users: 15 },
        { date: '2025-01-02', requests: 98, users: 12 },
        { date: '2025-01-03', requests: 156, users: 18 },
        { date: '2025-01-04', requests: 134, users: 16 },
        { date: '2025-01-05', requests: 89, users: 11 },
        { date: '2025-01-06', requests: 167, users: 20 },
        { date: '2025-01-07', requests: 145, users: 17 },
      ],
      summary: {
        totalRequests: 909,
        avgRequestsPerDay: 129.9,
        totalUsers: 109,
        avgUsersPerDay: 15.6,
      },
    };

    res.json({
      success: true,
      message: '获取使用统计成功',
      data: mockData,
    });
  } catch (error) {
    logger.error('获取使用统计失败', { error });
    throw createError('获取使用统计失败', 500);
  }
};

// 获取模型性能统计
export const getModelPerformance = async (req: Request, res: Response) => {
  try {
    const models = await prisma.aiModel.findMany({
      include: {
        provider: {
          select: {
            name: true,
            displayName: true,
          },
        },
      },
    });

    // 模拟性能数据（实际项目中应该从使用日志中统计）
    const performanceData = models.map((model, index) => ({
      id: model.id,
      name: model.name,
      displayName: model.displayName,
      provider: model.provider.displayName,
      usage: {
        totalRequests: Math.floor(Math.random() * 1000) + 100,
        successRate: (Math.random() * 0.1 + 0.9) * 100, // 90-100%
        avgResponseTime: Math.floor(Math.random() * 2000) + 500, // 500-2500ms
        errorCount: Math.floor(Math.random() * 10),
      },
      costs: {
        totalTokens: Math.floor(Math.random() * 100000) + 10000,
        totalCost: (Math.random() * 50 + 10).toFixed(2),
      },
      isActive: model.isActive,
    }));

    res.json({
      success: true,
      message: '获取模型性能统计成功',
      data: performanceData,
    });
  } catch (error) {
    logger.error('获取模型性能统计失败', { error });
    throw createError('获取模型性能统计失败', 500);
  }
};

// 获取卦象统计
export const getHexagramStatistics = async (req: Request, res: Response) => {
  try {
    const hexagrams = await prisma.hexagramData.findMany({
      select: {
        id: true,
        name: true,
        element: true,
        isActive: true,
      },
    });

    // 按五行元素分组统计
    const elementStats = hexagrams.reduce((acc, hexagram) => {
      const element = hexagram.element;
      if (!acc[element]) {
        acc[element] = { count: 0, active: 0 };
      }
      acc[element].count++;
      if (hexagram.isActive) {
        acc[element].active++;
      }
      return acc;
    }, {} as Record<string, { count: number; active: number }>);

    // 模拟使用频率数据
    const usageStats = hexagrams.map(hexagram => ({
      id: hexagram.id,
      name: hexagram.name,
      element: hexagram.element,
      usageCount: Math.floor(Math.random() * 500) + 50,
      lastUsed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 最近30天内
      isActive: hexagram.isActive,
    }));

    const statistics = {
      total: hexagrams.length,
      active: hexagrams.filter(h => h.isActive).length,
      elementDistribution: elementStats,
      usageRanking: usageStats.sort((a, b) => b.usageCount - a.usageCount),
      summary: {
        mostUsed: usageStats.reduce((prev, current) => 
          prev.usageCount > current.usageCount ? prev : current
        ),
        leastUsed: usageStats.reduce((prev, current) => 
          prev.usageCount < current.usageCount ? prev : current
        ),
      },
    };

    res.json({
      success: true,
      message: '获取卦象统计成功',
      data: statistics,
    });
  } catch (error) {
    logger.error('获取卦象统计失败', { error });
    throw createError('获取卦象统计失败', 500);
  }
};
