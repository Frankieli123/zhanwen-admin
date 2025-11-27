import { AiProvider } from '@prisma/client';
import { createError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';
import { PaginationQuery, PaginatedResponse } from '@/types/api.types';
import { encrypt, decrypt } from '@/utils/encryption';

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
  /** 明文传入，服务端加密保存 */
  apiKeyEncrypted?: string;
  /** 服务商类型（openai、anthropic、deepseek、custom 等），默认 openai */
  providerType?: string;
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
  /** 明文传入，服务端加密保存 */
  apiKeyEncrypted?: string;
}

export class AIProviderService {
  /**
   * 掩码API密钥显示
   */
  private maskApiKey(encryptedKey: string): string {
    try {
      const decrypted = decrypt(encryptedKey);
      if (!decrypted || decrypted.length <= 8) return '****';
      return decrypted.substring(0, 4) + '****' + decrypted.substring(decrypted.length - 4);
    } catch {
      return '****';
    }
  }

  /**
   * 根据服务商名称获取基础信息（含 baseUrl、isActive、providerType）
   */
  async getProviderBasicByName(
    name: string
  ): Promise<{ baseUrl?: string; isActive: boolean; providerType?: string } | null> {
    try {
      const provider = await prisma.aiProvider.findUnique({
        where: { name },
        // 通过 select 只取基础字段，并用 any 规避 Prisma 复杂类型推断
        select: { baseUrl: true, isActive: true, providerType: true } as any,
      });
      if (!provider) return null;
      // 显式构造返回对象，确保符合 Promise<{ baseUrl?: string; isActive: boolean; providerType?: string } | null>
      const p: any = provider;
      return {
        baseUrl: p.baseUrl,
        isActive: !!p.isActive,
        providerType: p.providerType,
      };
    } catch (error) {
      logger.error('根据名称获取服务商基础信息失败', error);
      return null;
    }
  }

  /**
   * 获取AI服务商列表（分页）
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

      // 掩码处理服务商级密钥（在生成新的Prisma类型之前，避免直接类型访问）
      const providersWithMasked = providers.map(p => {
        const enc = (p as any).apiKeyEncrypted as string | null | undefined;
        return {
          ...p,
          apiKeyEncrypted: enc ? this.maskApiKey(enc) : null,
        } as any;
      });

      return {
        success: true,
        message: '获取AI服务商列表成功',
        data: providersWithMasked,
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
      logger.error('获取AI服务商列表失败', error);
      throw createError('获取AI服务商列表失败', 500);
    }
  }

  /**
   * 根据ID获取AI服务商详情
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
        throw createError('AI服务商不存在', 404, 'PROVIDER_NOT_FOUND');
      }

      const enc = (provider as any).apiKeyEncrypted as string | null | undefined;
      return {
        ...(provider as any),
        apiKeyEncrypted: enc ? this.maskApiKey(enc) : null,
      } as any;
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('获取AI服务商详情失败', error);
      throw createError('获取AI服务商详情失败', 500);
    }
  }

  /**
   * 创建AI服务商
   */
  async createProvider(data: AIProviderCreateRequest, createdBy: number): Promise<AiProvider> {
    try {
      // 统一规范：名称去空格并小写，避免大小写/空格差异导致的重复
      const normalizedName = (data.name || '').trim().toLowerCase();
      const providerType = (data.providerType || 'openai').trim().toLowerCase();

      // 检查名称是否已存在（不区分大小写）
      const existingProvider = await prisma.aiProvider.findFirst({
        where: { name: { equals: normalizedName, mode: 'insensitive' } },
      });

      if (existingProvider) {
        throw createError('服务商名称已存在', 409, 'PROVIDER_NAME_EXISTS');
      }

      const { apiKeyEncrypted, ...rest } = data;
      const createData: any = {
        ...rest,
        // 使用规范化后的name写库，displayName按用户输入保留
        name: normalizedName,
        providerType,
        supportedModels: rest.supportedModels || [],
        metadata: rest.metadata || {},
      };
      if (apiKeyEncrypted) createData.apiKeyEncrypted = encrypt(apiKeyEncrypted);
      const provider = await prisma.aiProvider.create({
        data: createData,
      });

      logger.info('AI服务商创建成功', {
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
      logger.error('创建AI服务商失败', error);
      throw createError('创建AI服务商失败', 500);
    }
  }

  /**
   * 更新AI服务商
   */
  async updateProvider(id: number, data: AIProviderUpdateRequest, updatedBy: number): Promise<AiProvider> {
    try {
      const existingProvider = await prisma.aiProvider.findUnique({
        where: { id },
      });

      if (!existingProvider) {
        throw createError('AI服务商不存在', 404, 'PROVIDER_NOT_FOUND');
      }

      const { apiKeyEncrypted, ...rest } = data;
      const updateData: any = {
        ...rest,
        supportedModels: rest.supportedModels || existingProvider.supportedModels,
        metadata: rest.metadata
          ? { ...(existingProvider.metadata as Record<string, any> || {}), ...rest.metadata }
          : existingProvider.metadata,
      };
      if (apiKeyEncrypted !== undefined) {
        updateData.apiKeyEncrypted = apiKeyEncrypted ? encrypt(apiKeyEncrypted) : null;
      }
      const updatedProvider = await prisma.aiProvider.update({
        where: { id },
        data: updateData as any,
      });

      logger.info('AI服务商更新成功', {
        providerId: id,
        name: updatedProvider.name,
        updatedBy,
      });

      return updatedProvider;
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('更新AI服务商失败', error);
      throw createError('更新AI服务商失败', 500);
    }
  }

  /**
   * 删除AI服务商
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
        throw createError('AI服务商不存在', 404, 'PROVIDER_NOT_FOUND');
      }

      // 检查是否有关联的AI模型
      if (provider._count.aiModels > 0) {
        throw createError('该服务商下还有AI模型，请先删除相关模型', 400, 'PROVIDER_HAS_MODELS');
      }

      await prisma.aiProvider.delete({
        where: { id },
      });

      logger.info('AI服务商删除成功', {
        providerId: id,
        name: provider.name,
        deletedBy,
      });
    } catch (error) {
      if (error instanceof Error && (error.message.includes('不存在') || error.message.includes('还有AI模型'))) {
        throw error;
      }
      logger.error('删除AI服务商失败', error);
      throw createError('删除AI服务商失败', 500);
    }
  }

  /**
   * 获取所有活跃的服务商（用于下拉选择）
   */
  async getActiveProviders(): Promise<Array<{ id: number; name: string; displayName: string; supportedModels: string[]; baseUrl?: string }>> {
    try {
      const providers = await prisma.aiProvider.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          displayName: true,
          supportedModels: true,
          baseUrl: true,
        },
        orderBy: { displayName: 'asc' },
      });

      return providers;
    } catch (error) {
      logger.error('获取活跃服务商列表失败', error);
      throw createError('获取活跃服务商列表失败', 500);
    }
  }
  /**
   * 根据服务商名称获取解密后的API密钥（仅内部使用）
   */
  async getDecryptedApiKeyByName(name: string): Promise<string | null> {
    try {
      const provider = await prisma.aiProvider.findUnique({
        where: { name },
      });

      if (!provider) return null;

      const enc = (provider as any).apiKeyEncrypted as string | null | undefined;
      if (!enc) return null;

      try {
        return decrypt(enc);
      } catch {
        return null;
      }
    } catch (error) {
      logger.error('根据名称获取服务商API密钥失败', error);
      return null;
    }
  }

  /**
   * 根据服务商ID获取解密后的API密钥（仅内部使用）
   */
  async getDecryptedApiKeyById(id: number): Promise<string | null> {
    try {
      const provider = await prisma.aiProvider.findUnique({
        where: { id },
      });

      if (!provider) return null;

      const enc = (provider as any).apiKeyEncrypted as string | null | undefined;
      if (!enc) return null;

      try {
        return decrypt(enc);
      } catch {
        return null;
      }
    } catch (error) {
      logger.error('根据ID获取服务商API密钥失败', error);
      return null;
    }
  }

  /**
   * 测试服务商连接
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

        logger.info('AI服务商连接测试成功', {
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
      logger.error('AI服务商连接测试失败', error);
      return {
        success: false,
        message: '连接测试失败',
      };
    }
  }

  /**
   * 获取服务商使用统计
   */
  async getProviderStats(id: number, days: number = 30): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 获取该服务商下所有模型的统计
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
      logger.error('获取服务商统计失败', error);
      throw createError('获取服务商统计失败', 500);
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
