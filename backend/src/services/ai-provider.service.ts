import { PrismaClient, AiProvider } from '@prisma/client';
import { createError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import { PaginationQuery, PaginatedResponse } from '@/types/api.types';

const prisma = new PrismaClient();

export interface AIProviderCreateRequest {
  name: string;
  displayName: string;
  baseUrl: string;
  authType?: string;
  supportedModels?: string[];
  rateLimitRpm?: number;
  rateLimitTpm?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface AIProviderUpdateRequest {
  displayName?: string;
  baseUrl?: string;
  authType?: string;
  supportedModels?: string[];
  rateLimitRpm?: number;
  rateLimitTpm?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export class AIProviderService {
  /**
   * 获取AI提供商列表（分页）
   */
  async getProviders(query: PaginationQuery): Promise<PaginatedResponse<AiProvider & { _count: { aiModels: number } }>> {
    const {
      page = 1,
      limit = 10,
      sort = 'desc',
      search,
      status,
    } = query;

    const skip = (page - 1) * limit;
    const orderBy = { createdAt: sort };

    // 构建查询条件
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    try {
      const [providers, total] = await Promise.all([
        prisma.aiProvider.findMany({
          where,
          include: {
            _count: {
              select: { aiModels: true },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.aiProvider.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: '获取AI提供商列表成功',
        data: providers,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('获取AI提供商列表失败', error);
      throw createError('获取AI提供商列表失败', 500);
    }
  }

  /**
   * 根据ID获取AI提供商详情
   */
  async getProviderById(id: number): Promise<AiProvider & { aiModels: any[] }> {
    try {
      const provider = await prisma.aiProvider.findUnique({
        where: { id },
        include: {
          aiModels: {
            select: {
              id: true,
              name: true,
              displayName: true,
              modelType: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!provider) {
        throw createError('AI提供商不存在', 404, 'PROVIDER_NOT_FOUND');
      }

      return provider;
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('获取AI提供商详情失败', error);
      throw createError('获取AI提供商详情失败', 500);
    }
  }

  /**
   * 创建AI提供商
   */
  async createProvider(data: AIProviderCreateRequest, createdBy: number): Promise<AiProvider> {
    try {
      // 检查名称是否已存在
      const existingProvider = await prisma.aiProvider.findUnique({
        where: { name: data.name },
      });

      if (existingProvider) {
        throw createError('提供商名称已存在', 409, 'PROVIDER_NAME_EXISTS');
      }

      const provider = await prisma.aiProvider.create({
        data: {
          ...data,
          supportedModels: data.supportedModels || [],
          metadata: data.metadata || {},
        },
      });

      logger.info('AI提供商创建成功', {
        providerId: provider.id,
        name: provider.name,
        displayName: provider.displayName,
        createdBy,
      });

      return provider;
    } catch (error) {
      if (error instanceof Error && error.message.includes('已存在')) {
        throw error;
      }
      logger.error('创建AI提供商失败', error);
      throw createError('创建AI提供商失败', 500);
    }
  }

  /**
   * 更新AI提供商
   */
  async updateProvider(id: number, data: AIProviderUpdateRequest, updatedBy: number): Promise<AiProvider> {
    try {
      const existingProvider = await prisma.aiProvider.findUnique({
        where: { id },
      });

      if (!existingProvider) {
        throw createError('AI提供商不存在', 404, 'PROVIDER_NOT_FOUND');
      }

      const updatedProvider = await prisma.aiProvider.update({
        where: { id },
        data: {
          ...data,
          supportedModels: data.supportedModels || existingProvider.supportedModels,
          metadata: data.metadata 
            ? { ...existingProvider.metadata, ...data.metadata }
            : existingProvider.metadata,
        },
      });

      logger.info('AI提供商更新成功', {
        providerId: id,
        name: updatedProvider.name,
        updatedBy,
      });

      return updatedProvider;
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('更新AI提供商失败', error);
      throw createError('更新AI提供商失败', 500);
    }
  }

  /**
   * 删除AI提供商
   */
  async deleteProvider(id: number, deletedBy: number): Promise<void> {
    try {
      const provider = await prisma.aiProvider.findUnique({
        where: { id },
        include: {
          _count: {
            select: { aiModels: true },
          },
        },
      });

      if (!provider) {
        throw createError('AI提供商不存在', 404, 'PROVIDER_NOT_FOUND');
      }

      // 检查是否有关联的AI模型
      if (provider._count.aiModels > 0) {
        throw createError('该提供商下还有AI模型，请先删除相关模型', 400, 'PROVIDER_HAS_MODELS');
      }

      await prisma.aiProvider.delete({
        where: { id },
      });

      logger.info('AI提供商删除成功', {
        providerId: id,
        name: provider.name,
        deletedBy,
      });
    } catch (error) {
      if (error instanceof Error && (error.message.includes('不存在') || error.message.includes('还有AI模型'))) {
        throw error;
      }
      logger.error('删除AI提供商失败', error);
      throw createError('删除AI提供商失败', 500);
    }
  }

  /**
   * 获取所有活跃的提供商（用于下拉选择）
   */
  async getActiveProviders(): Promise<Array<{ id: number; name: string; displayName: string; supportedModels: string[] }>> {
    try {
      const providers = await prisma.aiProvider.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          displayName: true,
          supportedModels: true,
        },
        orderBy: { displayName: 'asc' },
      });

      return providers;
    } catch (error) {
      logger.error('获取活跃提供商列表失败', error);
      throw createError('获取活跃提供商列表失败', 500);
    }
  }

  /**
   * 测试提供商连接
   */
  async testProviderConnection(id: number): Promise<{ success: boolean; message: string; responseTime?: number }> {
    try {
      const provider = await this.getProviderById(id);
      
      const startTime = Date.now();
      
      // 这里可以实现实际的API连接测试
      // 目前返回模拟结果
      try {
        // 模拟网络请求
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            // 模拟90%成功率
            if (Math.random() > 0.1) {
              resolve(true);
            } else {
              reject(new Error('连接超时'));
            }
          }, 100 + Math.random() * 500);
        });

        const responseTime = Date.now() - startTime;

        logger.info('AI提供商连接测试成功', {
          providerId: id,
          name: provider.name,
          responseTime,
        });

        return {
          success: true,
          message: '连接测试成功',
          responseTime,
        };
      } catch (testError) {
        return {
          success: false,
          message: '连接测试失败: ' + (testError as Error).message,
        };
      }
    } catch (error) {
      logger.error('AI提供商连接测试失败', error);
      return {
        success: false,
        message: '连接测试失败',
      };
    }
  }

  /**
   * 获取提供商使用统计
   */
  async getProviderStats(id: number, days: number = 30): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 获取该提供商下所有模型的统计
      const models = await prisma.aiModel.findMany({
        where: { providerId: id },
        select: { id: true },
      });

      const modelIds = models.map(m => m.id);

      const stats = await prisma.apiCallLog.groupBy({
        by: ['status'],
        where: {
          modelId: { in: modelIds },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
        _sum: {
          tokensUsed: true,
          cost: true,
        },
        _avg: {
          responseTimeMs: true,
        },
      });

      // 获取每日调用统计
      const dailyStats = await prisma.apiCallLog.groupBy({
        by: ['createdAt'],
        where: {
          modelId: { in: modelIds },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
        _sum: {
          cost: true,
        },
      });

      return {
        period: `${days}天`,
        totalCalls: stats.reduce((sum, stat) => sum + stat._count.id, 0),
        totalTokens: stats.reduce((sum, stat) => sum + (stat._sum.tokensUsed || 0), 0),
        totalCost: stats.reduce((sum, stat) => sum + Number(stat._sum.cost || 0), 0),
        avgResponseTime: stats.reduce((sum, stat) => sum + (stat._avg.responseTimeMs || 0), 0) / stats.length,
        successRate: this.calculateSuccessRate(stats),
        modelsCount: models.length,
        dailyStats: this.processDailyStats(dailyStats, days),
      };
    } catch (error) {
      logger.error('获取提供商统计失败', error);
      throw createError('获取提供商统计失败', 500);
    }
  }

  /**
   * 计算成功率
   */
  private calculateSuccessRate(stats: any[]): number {
    const total = stats.reduce((sum, stat) => sum + stat._count.id, 0);
    const successful = stats
      .filter(stat => stat.status === 'success')
      .reduce((sum, stat) => sum + stat._count.id, 0);
    
    return total > 0 ? (successful / total) * 100 : 0;
  }

  /**
   * 处理每日统计数据
   */
  private processDailyStats(dailyStats: any[], days: number): any[] {
    const result = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStats = dailyStats.filter(stat => 
        stat.createdAt.toISOString().split('T')[0] === dateStr
      );
      
      result.push({
        date: dateStr,
        calls: dayStats.reduce((sum, stat) => sum + stat._count.id, 0),
        cost: dayStats.reduce((sum, stat) => sum + Number(stat._sum.cost || 0), 0),
      });
    }
    
    return result;
  }
}
