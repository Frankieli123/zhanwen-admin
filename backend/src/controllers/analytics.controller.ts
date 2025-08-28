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

    // 计算日期范围
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // 从使用统计表获取真实数据
    const usageStats = await prisma.usageStatistic.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // 按日期分组统计
    const dailyStats = new Map();
    usageStats.forEach(stat => {
      const dateKey = stat.date.toISOString().split('T')[0];
      if (!dailyStats.has(dateKey)) {
        dailyStats.set(dateKey, { date: dateKey, requests: 0, users: 0 });
      }
      
      const dayData = dailyStats.get(dateKey);
      if (stat.metricName === 'api_calls') {
        dayData.requests += Number(stat.metricValue);
      } else if (stat.metricName === 'unique_users') {
        dayData.users += Number(stat.metricValue);
      }
    });

    const data = Array.from(dailyStats.values());
    const totalRequests = data.reduce((sum, day) => sum + day.requests, 0);
    const totalUsers = data.reduce((sum, day) => sum + day.users, 0);

    const result = {
      period,
      data,
      summary: {
        totalRequests,
        avgRequestsPerDay: data.length > 0 ? totalRequests / data.length : 0,
        totalUsers,
        avgUsersPerDay: data.length > 0 ? totalUsers / data.length : 0,
      },
    };

    res.json({
      success: true,
      message: '获取使用统计成功',
      data: result,
    });
  } catch (error) {
    logger.error('获取使用统计失败', { error });
    throw createError('获取使用统计失败', 500);
  }
};

// 获取模型性能统计
export const getModelPerformance = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 计算日期范围
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const models = await prisma.aiModel.findMany({
      include: {
        provider: {
          select: {
            name: true,
            displayName: true,
          },
        },
        apiCallLogs: {
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
        },
      },
    });

    // 从真实日志数据统计性能
    const performanceData = models.map((model) => {
      const logs = model.apiCallLogs;
      const totalRequests = logs.length;
      const successfulRequests = logs.filter(log => log.status === 'success').length;
      const errorCount = logs.filter(log => log.status === 'error').length;
      const totalTokens = logs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0);
      const totalCost = logs.reduce((sum, log) => sum + Number(log.cost || 0), 0);
      const responseTimes = logs.filter(log => log.responseTimeMs).map(log => log.responseTimeMs!);
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;

      return {
        id: model.id,
        name: model.name,
        displayName: model.displayName,
        provider: model.provider.displayName,
        usage: {
          totalRequests,
          successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
          avgResponseTime: Math.round(avgResponseTime),
          errorCount,
        },
        costs: {
          totalTokens,
          totalCost: totalCost.toFixed(6),
        },
        isActive: model.isActive,
      };
    });

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

    // 从使用统计表获取卦象使用数据
    const hexagramUsageStats = await prisma.usageStatistic.findMany({
      where: {
        metricName: {
          startsWith: 'hexagram_',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 处理卦象使用统计
    const usageMap = new Map();
    hexagramUsageStats.forEach(stat => {
      const hexagramId = stat.metricName.replace('hexagram_', '');
      if (!usageMap.has(hexagramId)) {
        usageMap.set(hexagramId, {
          usageCount: 0,
          lastUsed: stat.createdAt,
        });
      }
      const data = usageMap.get(hexagramId);
      data.usageCount += Number(stat.metricValue);
      if (stat.createdAt > data.lastUsed) {
        data.lastUsed = stat.createdAt;
      }
    });

    const usageStats = hexagrams.map(hexagram => {
      const usage = usageMap.get(hexagram.id.toString()) || { usageCount: 0, lastUsed: new Date() };
      return {
        id: hexagram.id,
        name: hexagram.name,
        element: hexagram.element,
        usageCount: usage.usageCount,
        lastUsed: usage.lastUsed,
        isActive: hexagram.isActive,
      };
    });

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
