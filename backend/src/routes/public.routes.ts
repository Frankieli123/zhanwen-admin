import { Router } from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateApiKey, requireApiPermission } from '@/middleware/apiKey.middleware';
import { asyncHandler } from '@/middleware/error.middleware';
import { ApiResponse } from '@/types/api.types';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /public/configs/{platform}:
 *   get:
 *     summary: 获取指定平台的配置（公开接口）
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [web, ios, android, wechat]
 *         description: 平台类型
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 配置分类
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: API Key 无效
 *       403:
 *         description: 权限不足
 */
router.get(
  '/public/configs/:platform',
  authenticateApiKey,
  requireApiPermission('configs:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { platform } = req.params;
    const { category } = req.query;

    const whereClause: any = {
      platform,
      isActive: true,
    };

    if (category) {
      whereClause.category = category;
    }

    const configs = await prisma.appConfig.findMany({
      where: whereClause,
      select: {
        id: true,
        configKey: true,
        configValue: true,
        dataType: true,
        category: true,
        description: true,
        version: true,
        updatedAt: true,
      },
      orderBy: [
        { category: 'asc' },
        { configKey: 'asc' }
      ]
    });

    const response: ApiResponse = {
      success: true,
      message: '获取配置成功',
      data: configs,
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /public/ai-models/active:
 *   get:
 *     summary: 获取当前活跃的AI模型配置（公开接口）
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: API Key 无效
 *       403:
 *         description: 权限不足
 */
router.get(
  '/public/ai-models/active',
  authenticateApiKey,
  requireApiPermission('ai_models:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const activeModels = await prisma.aiModel.findMany({
      where: {
        isActive: true,
        role: { in: ['primary', 'secondary'] }
      },
      include: {
        provider: {
          select: {
            name: true,
            displayName: true,
            baseUrl: true,
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { priority: 'asc' }
      ]
    });

    // 过滤返回的字段，不包含敏感信息
    const filteredModels = activeModels.map(model => ({
      id: model.id,
      name: model.name,
      displayName: model.displayName,
      modelType: model.modelType,
      parameters: model.parameters,
      role: model.role,
      priority: model.priority,
      contextWindow: model.contextWindow,
      provider: model.provider,
    }));

    const response: ApiResponse = {
      success: true,
      message: '获取活跃AI模型成功',
      data: filteredModels,
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /public/ai-models/primary:
 *   get:
 *     summary: 获取主要AI模型配置（公开接口）
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 未找到主要模型
 */
router.get(
  '/public/ai-models/primary',
  authenticateApiKey,
  requireApiPermission('ai_models:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const primaryModel = await prisma.aiModel.findFirst({
      where: {
        isActive: true,
        role: 'primary'
      },
      include: {
        provider: {
          select: {
            name: true,
            displayName: true,
            baseUrl: true,
          }
        }
      }
    });

    if (!primaryModel) {
      res.status(404).json({
        success: false,
        message: '未找到主要AI模型',
        code: 'PRIMARY_MODEL_NOT_FOUND'
      });
      return;
    }

    // 过滤返回的字段，不包含敏感信息
    const filteredPrimaryModel = {
      id: primaryModel.id,
      name: primaryModel.name,
      displayName: primaryModel.displayName,
      modelType: primaryModel.modelType,
      parameters: primaryModel.parameters,
      role: primaryModel.role,
      priority: primaryModel.priority,
      contextWindow: primaryModel.contextWindow,
      provider: primaryModel.provider,
    };

    const response: ApiResponse = {
      success: true,
      message: '获取主要AI模型成功',
      data: filteredPrimaryModel,
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /public/prompts/active:
 *   get:
 *     summary: 获取活跃的提示词模板（公开接口）
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: 模板类型
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/public/prompts/active',
  authenticateApiKey,
  requireApiPermission('prompts:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { type } = req.query;

    const whereClause: any = {
      isActive: true,
    };

    if (type) {
      whereClause.type = type;
    }

    const prompts = await prisma.promptTemplate.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        type: true,
        systemPrompt: true,
        userPromptTemplate: true,
        formatInstructions: true,
        version: true,
        updatedAt: true,
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    });

    const response: ApiResponse = {
      success: true,
      message: '获取活跃提示词模板成功',
      data: prompts,
    };

    res.json(response);
  })
);

export default router;
