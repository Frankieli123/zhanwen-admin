import { PrismaClient, PromptTemplate } from '@prisma/client';
import { createError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import {
  PromptTemplateCreateRequest,
  PromptTemplateUpdateRequest,
  PaginationQuery,
  PaginatedResponse,
} from '@/types/api.types';

const prisma = new PrismaClient();

// 定义包含 creator 信息的 PromptTemplate 类型
type PromptTemplateWithCreator = PromptTemplate & {
  creator?: {
    id: number;
    username: string;
    fullName: string | null;
  } | null;
};

export class PromptTemplateService {
  /**
   * 获取提示词模板列表（分页）
   */
  async getTemplates(query: PaginationQuery): Promise<PaginatedResponse<PromptTemplateWithCreator>> {
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
        { description: { contains: search, mode: 'insensitive' } },
        { systemPrompt: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    try {
      const [templates, total] = await Promise.all([
        prisma.promptTemplate.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.promptTemplate.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: '获取提示词模板列表成功',
        data: templates,
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
      logger.error('获取提示词模板列表失败', error);
      throw createError('获取提示词模板列表失败', 500);
    }
  }

  /**
   * 根据ID获取提示词模板详情
   */
  async getTemplateById(id: number): Promise<PromptTemplateWithCreator> {
    try {
      const template = await prisma.promptTemplate.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      if (!template) {
        throw createError('提示词模板不存在', 404, 'TEMPLATE_NOT_FOUND');
      }

      return template;
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('获取提示词模板详情失败', error);
      throw createError('获取提示词模板详情失败', 500);
    }
  }

  /**
   * 创建提示词模板
   */
  async createTemplate(data: PromptTemplateCreateRequest, createdBy: number): Promise<PromptTemplateWithCreator> {
    try {
      // 检查模板名称是否已存在（同一版本）
      const existingTemplate = await prisma.promptTemplate.findFirst({
        where: {
          name: data.name,
          version: 1, // 新创建的模板默认版本为1
        },
      });

      if (existingTemplate) {
        throw createError('模板名称已存在', 409, 'TEMPLATE_NAME_EXISTS');
      }

      const template = await prisma.promptTemplate.create({
        data: {
          ...data,
          variables: data.variables || [],
          tags: data.tags || [],
          version: 1,
          status: 'draft',
          createdBy,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });

      logger.info('提示词模板创建成功', {
        templateId: template.id,
        name: template.name,
        type: template.type,
        createdBy,
      });

      return template;
    } catch (error) {
      if (error instanceof Error && error.message.includes('已存在')) {
        throw error;
      }
      logger.error('创建提示词模板失败', error);
      throw createError('创建提示词模板失败', 500);
    }
  }

  /**
   * 更新提示词模板
   */
  async updateTemplate(id: number, data: PromptTemplateUpdateRequest, updatedBy: number): Promise<PromptTemplate> {
    try {
      const existingTemplate = await prisma.promptTemplate.findUnique({
        where: { id },
        include: { creator: true },
      });

      if (!existingTemplate) {
        throw createError('提示词模板不存在', 404, 'TEMPLATE_NOT_FOUND');
      }

      // 如果模板已经是active状态，更新时需要创建新版本
      if (existingTemplate.status === 'active' && data.status !== 'deprecated') {
        return await this.createNewVersion(existingTemplate, data, updatedBy);
      }

      const updatedTemplate = await prisma.promptTemplate.update({
        where: { id },
        data: {
          ...data,
          variables: data.variables || existingTemplate.variables,
          tags: data.tags || existingTemplate.tags,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });

      logger.info('提示词模板更新成功', {
        templateId: id,
        name: updatedTemplate.name,
        updatedBy,
      });

      return updatedTemplate;
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('更新提示词模板失败', error);
      throw createError('更新提示词模板失败', 500);
    }
  }

  /**
   * 删除提示词模板
   */
  async deleteTemplate(id: number, deletedBy: number): Promise<void> {
    try {
      const template = await prisma.promptTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        throw createError('提示词模板不存在', 404, 'TEMPLATE_NOT_FOUND');
      }

      // 检查是否为活跃状态的模板
      if (template.status === 'active') {
        throw createError('不能删除活跃状态的模板，请先将其设置为废弃状态', 400, 'CANNOT_DELETE_ACTIVE_TEMPLATE');
      }

      await prisma.promptTemplate.delete({
        where: { id },
      });

      logger.info('提示词模板删除成功', {
        templateId: id,
        name: template.name,
        deletedBy,
      });
    } catch (error) {
      if (error instanceof Error && (error.message.includes('不存在') || error.message.includes('不能删除'))) {
        throw error;
      }
      logger.error('删除提示词模板失败', error);
      throw createError('删除提示词模板失败', 500);
    }
  }

  /**
   * 批量删除提示词模板
   */
  async batchDeleteTemplates(ids: number[], deletedBy: number): Promise<void> {
    try {
      // 检查是否包含活跃状态的模板
      const activeTemplates = await prisma.promptTemplate.findMany({
        where: {
          id: { in: ids },
          status: 'active',
        },
      });

      if (activeTemplates.length > 0) {
        throw createError('批量删除中包含活跃状态的模板，请先将其设置为废弃状态', 400, 'CANNOT_DELETE_ACTIVE_TEMPLATES');
      }

      const result = await prisma.promptTemplate.deleteMany({
        where: {
          id: { in: ids },
        },
      });

      logger.info('提示词模板批量删除成功', {
        deletedCount: result.count,
        deletedBy,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('活跃状态')) {
        throw error;
      }
      logger.error('批量删除提示词模板失败', error);
      throw createError('批量删除提示词模板失败', 500);
    }
  }

  /**
   * 激活提示词模板
   */
  async activateTemplate(id: number, activatedBy: number): Promise<PromptTemplate> {
    try {
      const template = await prisma.promptTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        throw createError('提示词模板不存在', 404, 'TEMPLATE_NOT_FOUND');
      }

      // 将同名的其他活跃模板设置为废弃
      await prisma.promptTemplate.updateMany({
        where: {
          name: template.name,
          status: 'active',
          id: { not: id },
        },
        data: { status: 'deprecated' },
      });

      const activatedTemplate = await prisma.promptTemplate.update({
        where: { id },
        data: { status: 'active' },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });

      logger.info('提示词模板激活成功', {
        templateId: id,
        name: template.name,
        activatedBy,
      });

      return activatedTemplate;
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('激活提示词模板失败', error);
      throw createError('激活提示词模板失败', 500);
    }
  }

  /**
   * 获取模板版本历史
   */
  async getTemplateVersions(name: string): Promise<PromptTemplate[]> {
    try {
      const versions = await prisma.promptTemplate.findMany({
        where: { name },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
        orderBy: { version: 'desc' },
      });

      return versions;
    } catch (error) {
      logger.error('获取模板版本历史失败', error);
      throw createError('获取模板版本历史失败', 500);
    }
  }

  /**
   * 复制模板
   */
  async duplicateTemplate(id: number, newName: string, createdBy: number): Promise<PromptTemplate> {
    try {
      const originalTemplate = await prisma.promptTemplate.findUnique({
        where: { id },
      });

      if (!originalTemplate) {
        throw createError('原模板不存在', 404, 'TEMPLATE_NOT_FOUND');
      }

      // 检查新名称是否已存在
      const existingTemplate = await prisma.promptTemplate.findFirst({
        where: { name: newName },
      });

      if (existingTemplate) {
        throw createError('新模板名称已存在', 409, 'TEMPLATE_NAME_EXISTS');
      }

      const duplicatedTemplate = await prisma.promptTemplate.create({
        data: {
          name: newName,
          type: originalTemplate.type,
          category: originalTemplate.category,
          systemPrompt: originalTemplate.systemPrompt,
          userPromptTemplate: originalTemplate.userPromptTemplate,
          formatInstructions: originalTemplate.formatInstructions,
          variables: originalTemplate.variables,
          description: `复制自: ${originalTemplate.name}`,
          tags: originalTemplate.tags,
          version: 1,
          status: 'draft',
          createdBy,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });

      logger.info('提示词模板复制成功', {
        originalId: id,
        newId: duplicatedTemplate.id,
        newName,
        createdBy,
      });

      return duplicatedTemplate;
    } catch (error) {
      if (error instanceof Error && (error.message.includes('不存在') || error.message.includes('已存在'))) {
        throw error;
      }
      logger.error('复制提示词模板失败', error);
      throw createError('复制提示词模板失败', 500);
    }
  }

  /**
   * 创建新版本
   */
  private async createNewVersion(
    originalTemplate: PromptTemplate,
    updateData: PromptTemplateUpdateRequest,
    createdBy: number
  ): Promise<PromptTemplate> {
    const nextVersion = originalTemplate.version + 1;

    const newVersionTemplate = await prisma.promptTemplate.create({
      data: {
        name: originalTemplate.name,
        type: updateData.type || originalTemplate.type,
        category: updateData.category || originalTemplate.category,
        systemPrompt: updateData.systemPrompt || originalTemplate.systemPrompt,
        userPromptTemplate: updateData.userPromptTemplate || originalTemplate.userPromptTemplate,
        formatInstructions: updateData.formatInstructions || originalTemplate.formatInstructions,
        variables: updateData.variables || originalTemplate.variables,
        description: updateData.description || originalTemplate.description,
        tags: updateData.tags || originalTemplate.tags,
        version: nextVersion,
        status: 'draft',
        createdBy,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    logger.info('提示词模板新版本创建成功', {
      originalId: originalTemplate.id,
      newId: newVersionTemplate.id,
      name: originalTemplate.name,
      version: nextVersion,
      createdBy,
    });

    return newVersionTemplate;
  }

  /**
   * 获取模板使用统计
   */
  async getTemplateStats(id: number): Promise<any> {
    try {
      const template = await prisma.promptTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        throw createError('提示词模板不存在', 404, 'TEMPLATE_NOT_FOUND');
      }

      // 这里可以添加实际的使用统计逻辑
      // 目前返回模拟数据
      return {
        templateId: id,
        name: template.name,
        usageCount: template.usageCount,
        effectivenessScore: template.effectivenessScore,
        lastUsed: new Date(),
        totalVersions: await prisma.promptTemplate.count({
          where: { name: template.name },
        }),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      logger.error('获取模板统计失败', error);
      throw createError('获取模板统计失败', 500);
    }
  }
}
