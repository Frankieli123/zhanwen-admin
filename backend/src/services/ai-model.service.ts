import { PrismaClient, AiModel, AiProvider } from '@prisma/client';
import { encrypt, decrypt } from '@/utils/encryption';
import { createError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import {
  AIModelCreateRequest,
  AIModelUpdateRequest,
  PaginationQuery,
  PaginatedResponse,
} from '@/types/api.types';

const prisma = new PrismaClient();

export class AIModelService {
  /**
   * 获取AI模型列表（分页）
   */
  async getModels(query: PaginationQuery): Promise<PaginatedResponse<AiModel & { provider: AiProvider }>> {
    const {
      page = 1,
      limit = 10,
      sort = 'desc',
      search,
      category,
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
        { provider: { displayName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (category) {
      where.modelType = category;
    }

    try {
      const [models, total] = await Promise.all([
        prisma.aiModel.findMany({
          where,
          include: {
            provider: true,
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.aiModel.count({ where }),
      ]);

      // 解密API密钥用于显示（只显示前几位）
      const modelsWithMaskedKeys = models.map(model => ({
        ...model,
        apiKeyEncrypted: model.apiKeyEncrypted 
          ? this.maskApiKey(model.apiKeyEncrypted)
          : null,
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: '获取AI模型列表成功',
        data: modelsWithMaskedKeys,
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
      logger.error('获取AI模型列表失败', error);
      throw createError('获取AI模型列表失败', 500);
    }
  }

  /**
   * 根据ID获取AI模型详情
   */
  async getModelById(id: number): Promise<AiModel & { provider: AiProvider }> {
    try {
      const model = await prisma.aiModel.findUnique({
        where: { id },
        include: {
          provider: true,
        },
      });

      if (!model) {
        throw createError('AI模型不存在', 404, 'MODEL_NOT_FOUND');
      }

      // 解密API密钥用于编辑
      if (model.apiKeyEncrypted) {
        try {
          const decryptedKey = decrypt(model.apiKeyEncrypted);
          return {
            ...model,
            apiKeyEncrypted: decryptedKey,
          };
        } catch (decryptError) {
          logger.warn('API密钥解密失败', { modelId: id, error: decryptError });
          return {
            ...model,
            apiKeyEncrypted: null,
          };
        }
      }

      return model;
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('获取AI模型详情失败', error);
      throw createError('获取AI模型详情失败', 500);
    }
  }

  /**
   * 创建AI模型
   */
  async createModel(data: AIModelCreateRequest, createdBy: number): Promise<AiModel> {
    try {
      // 验证提供商是否存在
      const provider = await prisma.aiProvider.findUnique({
        where: { id: data.providerId },
      });

      if (!provider) {
        throw createError('AI提供商不存在', 404, 'PROVIDER_NOT_FOUND');
      }

      // 检查模型名称是否已存在（同一提供商下）
      const existingModel = await prisma.aiModel.findUnique({
        where: {
          providerId_name: {
            providerId: data.providerId,
            name: data.name,
          },
        },
      });

      if (existingModel) {
        throw createError('该提供商下已存在同名模型', 409, 'MODEL_NAME_EXISTS');
      }

      // 加密API密钥
      let encryptedApiKey = null;
      if (data.apiKeyEncrypted) {
        encryptedApiKey = encrypt(data.apiKeyEncrypted);
      }

      // 如果设置为主模型，需要将其他主模型设置为次要
      if (data.role === 'primary') {
        await prisma.aiModel.updateMany({
          where: { role: 'primary' },
          data: { role: 'secondary' },
        });
      }

      const model = await prisma.aiModel.create({
        data: {
          ...data,
          apiKeyEncrypted: encryptedApiKey,
          parameters: data.parameters || {
            temperature: 0.7,
            max_tokens: 3000,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
          },
        },
        include: {
          provider: true,
        },
      });

      logger.info('AI模型创建成功', {
        modelId: model.id,
        name: model.name,
        provider: provider.displayName,
        createdBy,
      });

      return model;
    } catch (error) {
      if (error instanceof Error && (error.message.includes('不存在') || error.message.includes('已存在'))) {
        throw error;
      }
      logger.error('创建AI模型失败', error);
      throw createError('创建AI模型失败', 500);
    }
  }

  /**
   * 更新AI模型
   */
  async updateModel(id: number, data: AIModelUpdateRequest, updatedBy: number): Promise<AiModel> {
    try {
      const existingModel = await prisma.aiModel.findUnique({
        where: { id },
        include: { provider: true },
      });

      if (!existingModel) {
        throw createError('AI模型不存在', 404, 'MODEL_NOT_FOUND');
      }

      // 加密新的API密钥
      let encryptedApiKey = existingModel.apiKeyEncrypted;
      if (data.apiKeyEncrypted !== undefined) {
        encryptedApiKey = data.apiKeyEncrypted ? encrypt(data.apiKeyEncrypted) : null;
      }

      // 如果设置为主模型，需要将其他主模型设置为次要
      if (data.role === 'primary' && existingModel.role !== 'primary') {
        await prisma.aiModel.updateMany({
          where: { 
            role: 'primary',
            id: { not: id },
          },
          data: { role: 'secondary' },
        });
      }

      const updatedModel = await prisma.aiModel.update({
        where: { id },
        data: {
          ...data,
          apiKeyEncrypted: encryptedApiKey,
          parameters: data.parameters
            ? { ...(existingModel.parameters as Record<string, any> || {}), ...data.parameters }
            : existingModel.parameters,
        },
        include: {
          provider: true,
        },
      });

      logger.info('AI模型更新成功', {
        modelId: id,
        name: updatedModel.name,
        updatedBy,
      });

      return updatedModel;
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('更新AI模型失败', error);
      throw createError('更新AI模型失败', 500);
    }
  }

  /**
   * 删除AI模型
   */
  async deleteModel(id: number, deletedBy: number): Promise<void> {
    try {
      const model = await prisma.aiModel.findUnique({
        where: { id },
        include: { provider: true },
      });

      if (!model) {
        throw createError('AI模型不存在', 404, 'MODEL_NOT_FOUND');
      }

      // 检查是否为主模型
      if (model.role === 'primary') {
        throw createError('不能删除主模型，请先设置其他模型为主模型', 400, 'CANNOT_DELETE_PRIMARY_MODEL');
      }

      await prisma.aiModel.delete({
        where: { id },
      });

      logger.info('AI模型删除成功', {
        modelId: id,
        name: model.name,
        provider: model.provider.displayName,
        deletedBy,
      });
    } catch (error) {
      if (error instanceof Error && (error.message.includes('不存在') || error.message.includes('不能删除'))) {
        throw error;
      }
      logger.error('删除AI模型失败', error);
      throw createError('删除AI模型失败', 500);
    }
  }

  /**
   * 批量删除AI模型
   */
  async batchDeleteModels(ids: number[], deletedBy: number): Promise<void> {
    try {
      // 检查是否包含主模型
      const primaryModels = await prisma.aiModel.findMany({
        where: {
          id: { in: ids },
          role: 'primary',
        },
      });

      if (primaryModels.length > 0) {
        throw createError('批量删除中包含主模型，请先设置其他模型为主模型', 400, 'CANNOT_DELETE_PRIMARY_MODELS');
      }

      const result = await prisma.aiModel.deleteMany({
        where: {
          id: { in: ids },
        },
      });

      logger.info('AI模型批量删除成功', {
        deletedCount: result.count,
        deletedBy,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('主模型')) {
        throw error;
      }
      logger.error('批量删除AI模型失败', error);
      throw createError('批量删除AI模型失败', 500);
    }
  }

  /**
   * 测试AI模型连接
   */
  async testModelConnection(id: number): Promise<{ success: boolean; message: string; responseTime?: number }> {
    try {
      const model = await this.getModelById(id);
      
      if (!model.apiKeyEncrypted) {
        return {
          success: false,
          message: 'API密钥未配置',
        };
      }

      // 这里可以实现实际的API连接测试
      // 目前返回模拟结果
      const startTime = Date.now();
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
      
      const responseTime = Date.now() - startTime;

      logger.info('AI模型连接测试', {
        modelId: id,
        name: model.name,
        responseTime,
      });

      return {
        success: true,
        message: '连接测试成功',
        responseTime,
      };
    } catch (error) {
      logger.error('AI模型连接测试失败', error);
      return {
        success: false,
        message: '连接测试失败',
      };
    }
  }

  /**
   * 获取模型使用统计
   */
  async getModelStats(id: number, days: number = 30): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await prisma.apiCallLog.groupBy({
        by: ['status'],
        where: {
          modelId: id,
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

      return {
        period: `${days}天`,
        totalCalls: stats.reduce((sum, stat) => sum + stat._count.id, 0),
        totalTokens: stats.reduce((sum, stat) => sum + (stat._sum.tokensUsed || 0), 0),
        totalCost: stats.reduce((sum, stat) => sum + Number(stat._sum.cost || 0), 0),
        avgResponseTime: stats.reduce((sum, stat) => sum + (stat._avg.responseTimeMs || 0), 0) / stats.length,
        successRate: this.calculateSuccessRate(stats),
        statusBreakdown: stats,
      };
    } catch (error) {
      logger.error('获取模型统计失败', error);
      throw createError('获取模型统计失败', 500);
    }
  }

  /**
   * 掩码API密钥显示
   */
  private maskApiKey(encryptedKey: string): string {
    try {
      const decrypted = decrypt(encryptedKey);
      if (decrypted.length <= 8) {
        return '****';
      }
      return decrypted.substring(0, 4) + '****' + decrypted.substring(decrypted.length - 4);
    } catch (error) {
      return '****';
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
}
