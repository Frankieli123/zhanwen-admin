import { AppConfig } from '@prisma/client';
import { createError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';
import {
  AppConfigCreateRequest,
  AppConfigUpdateRequest,
  PaginationQuery,
  PaginatedResponse,
} from '@/types/api.types';

export class AppConfigService {
  /**
   * 获取应用配置列表（分页）
   */
  async getConfigs(query: PaginationQuery): Promise<PaginatedResponse<AppConfig>> {
    const {
      page = 1,
      limit = 10,
      sort = 'desc',
      search,
      category,
      status,
      platform,
    } = query;

    const skip = (page - 1) * limit;
    const orderBy = { createdAt: sort };

    // 构建查询条件
    const where: any = {};

    if (search) {
      where.OR = [
        { configKey: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (category) {
      where.category = category;
    }

    if (platform) {
      where.platform = platform;
    }

    try {
      const [configs, total] = await Promise.all([
        prisma.appConfig.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        prisma.appConfig.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: '获取应用配置列表成功',
        data: configs,
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
      logger.error('获取应用配置列表失败', error);
      throw createError('获取应用配置列表失败', 500);
    }
  }

  /**
   * 根据ID获取应用配置详情
   */
  async getConfigById(id: number): Promise<AppConfig> {
    try {
      const config = await prisma.appConfig.findUnique({
        where: { id },
      });

      if (!config) {
        throw createError('应用配置不存在', 404, 'CONFIG_NOT_FOUND');
      }

      return config;
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('获取应用配置详情失败', error);
      throw createError('获取应用配置详情失败', 500);
    }
  }

  /**
   * 根据平台和配置键获取配置
   */
  async getConfigByKey(platform: string, configKey: string): Promise<AppConfig | null> {
    try {
      const config = await prisma.appConfig.findUnique({
        where: {
          platform_configKey: {
            platform,
            configKey,
          },
        },
      });

      return config;
    } catch (error) {
      logger.error('根据键获取配置失败', error);
      throw createError('根据键获取配置失败', 500);
    }
  }

  /**
   * 获取平台的所有活跃配置
   */
  async getPlatformConfigs(platform: string): Promise<Record<string, any>> {
    try {
      const configs = await prisma.appConfig.findMany({
        where: {
          platform,
          isActive: true,
        },
        orderBy: { configKey: 'asc' },
      });

      // 转换为键值对格式
      const configMap: Record<string, any> = {};
      configs.forEach(config => {
        configMap[config.configKey] = config.configValue;
      });

      return configMap;
    } catch (error) {
      logger.error('获取平台配置失败', error);
      throw createError('获取平台配置失败', 500);
    }
  }

  /**
   * 创建应用配置
   */
  async createConfig(data: AppConfigCreateRequest, createdBy: number): Promise<AppConfig> {
    try {
      // 检查配置键是否已存在（同一平台下）
      const existingConfig = await prisma.appConfig.findUnique({
        where: {
          platform_configKey: {
            platform: data.platform,
            configKey: data.configKey,
          },
        },
      });

      if (existingConfig) {
        throw createError('该平台下配置键已存在', 409, 'CONFIG_KEY_EXISTS');
      }

      // 验证配置值
      this.validateConfigValue(data.configValue, data.dataType || 'json');

      const config = await prisma.appConfig.create({
        data: {
          ...data,
          validationRules: data.validationRules || {},
        },
      });

      logger.info('应用配置创建成功', {
        configId: config.id,
        platform: config.platform,
        configKey: config.configKey,
        createdBy,
      });

      return config;
    } catch (error) {
      if (error instanceof Error && error.message.includes('已存在')) {
        throw error;
      }
      logger.error('创建应用配置失败', error);
      throw createError('创建应用配置失败', 500);
    }
  }

  /**
   * 更新应用配置
   */
  async updateConfig(id: number, data: AppConfigUpdateRequest, updatedBy: number): Promise<AppConfig> {
    try {
      const existingConfig = await prisma.appConfig.findUnique({
        where: { id },
      });

      if (!existingConfig) {
        throw createError('应用配置不存在', 404, 'CONFIG_NOT_FOUND');
      }

      // 验证配置值
      if (data.configValue !== undefined) {
        const dataType = data.dataType || existingConfig.dataType;
        this.validateConfigValue(data.configValue, dataType);
      }

      const updatedConfig = await prisma.appConfig.update({
        where: { id },
        data: {
          ...data,
          validationRules: data.validationRules
            ? { ...(existingConfig.validationRules as Record<string, any> || {}), ...data.validationRules }
            : existingConfig.validationRules,
        },
      });

      logger.info('应用配置更新成功', {
        configId: id,
        platform: updatedConfig.platform,
        configKey: updatedConfig.configKey,
        updatedBy,
      });

      return updatedConfig;
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('更新应用配置失败', error);
      throw createError('更新应用配置失败', 500);
    }
  }

  /**
   * 删除应用配置
   */
  async deleteConfig(id: number, deletedBy: number): Promise<void> {
    try {
      const config = await prisma.appConfig.findUnique({
        where: { id },
      });

      if (!config) {
        throw createError('应用配置不存在', 404, 'CONFIG_NOT_FOUND');
      }

      await prisma.appConfig.delete({
        where: { id },
      });

      logger.info('应用配置删除成功', {
        configId: id,
        platform: config.platform,
        configKey: config.configKey,
        deletedBy,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('删除应用配置失败', error);
      throw createError('删除应用配置失败', 500);
    }
  }

  /**
   * 批量删除应用配置
   */
  async batchDeleteConfigs(ids: number[], deletedBy: number): Promise<void> {
    try {
      const result = await prisma.appConfig.deleteMany({
        where: {
          id: { in: ids },
        },
      });

      logger.info('应用配置批量删除成功', {
        deletedCount: result.count,
        deletedBy,
      });
    } catch (error) {
      logger.error('批量删除应用配置失败', error);
      throw createError('批量删除应用配置失败', 500);
    }
  }

  /**
   * 批量更新配置状态
   */
  async batchUpdateStatus(ids: number[], isActive: boolean, updatedBy: number): Promise<void> {
    try {
      const result = await prisma.appConfig.updateMany({
        where: {
          id: { in: ids },
        },
        data: { isActive },
      });

      logger.info('应用配置批量状态更新成功', {
        updatedCount: result.count,
        isActive,
        updatedBy,
      });
    } catch (error) {
      logger.error('批量更新配置状态失败', error);
      throw createError('批量更新配置状态失败', 500);
    }
  }

  /**
   * 复制配置到其他平台
   */
  async copyConfigToPlatform(
    sourceId: number,
    targetPlatform: string,
    createdBy: number
  ): Promise<AppConfig> {
    try {
      const sourceConfig = await prisma.appConfig.findUnique({
        where: { id: sourceId },
      });

      if (!sourceConfig) {
        throw createError('源配置不存在', 404, 'CONFIG_NOT_FOUND');
      }

      // 检查目标平台是否已存在同名配置
      const existingConfig = await prisma.appConfig.findUnique({
        where: {
          platform_configKey: {
            platform: targetPlatform,
            configKey: sourceConfig.configKey,
          },
        },
      });

      if (existingConfig) {
        throw createError('目标平台已存在同名配置', 409, 'CONFIG_KEY_EXISTS');
      }

      const copiedConfig = await prisma.appConfig.create({
        data: {
          platform: targetPlatform,
          configKey: sourceConfig.configKey,
          configValue: sourceConfig.configValue,
          dataType: sourceConfig.dataType,
          category: sourceConfig.category,
          description: `复制自 ${sourceConfig.platform} 平台: ${sourceConfig.description || ''}`,
          isActive: false, // 复制的配置默认为非活跃状态
          isSensitive: sourceConfig.isSensitive,
          validationRules: sourceConfig.validationRules,
        },
      });

      logger.info('配置复制成功', {
        sourceId,
        targetId: copiedConfig.id,
        sourcePlatform: sourceConfig.platform,
        targetPlatform,
        configKey: sourceConfig.configKey,
        createdBy,
      });

      return copiedConfig;
    } catch (error) {
      if (error instanceof Error && (error.message.includes('不存在') || error.message.includes('已存在'))) {
        throw error;
      }
      logger.error('复制配置失败', error);
      throw createError('复制配置失败', 500);
    }
  }

  /**
   * 获取配置分类列表
   */
  async getCategories(): Promise<string[]> {
    try {
      const result = await prisma.appConfig.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });

      return result.map(item => item.category);
    } catch (error) {
      logger.error('获取配置分类失败', error);
      throw createError('获取配置分类失败', 500);
    }
  }

  /**
   * 验证配置值
   */
  private validateConfigValue(value: any, dataType: string): void {
    switch (dataType) {
      case 'string':
        if (typeof value !== 'string') {
          throw createError('配置值必须是字符串类型', 400, 'INVALID_CONFIG_VALUE');
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          throw createError('配置值必须是数字类型', 400, 'INVALID_CONFIG_VALUE');
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw createError('配置值必须是布尔类型', 400, 'INVALID_CONFIG_VALUE');
        }
        break;
      case 'json':
        // JSON类型可以是任何值，但需要能够序列化
        try {
          JSON.stringify(value);
        } catch (error) {
          throw createError('配置值必须是有效的JSON格式', 400, 'INVALID_CONFIG_VALUE');
        }
        break;
      default:
        throw createError('不支持的数据类型', 400, 'UNSUPPORTED_DATA_TYPE');
    }
  }
}
