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

    // 过滤返回的字段，包含解密后的API密钥和完整API URL
    const filteredModels = activeModels.map(model => {
      // 构建完整的API URL - 默认添加兼容OpenAI的格式
      let fullApiUrl = model.provider.baseUrl;
      
      if (model.provider.name === 'deepseek') {
        // DeepSeek 不需要 /v1
        fullApiUrl = fullApiUrl.endsWith('/') ? fullApiUrl + 'chat/completions' : fullApiUrl + '/chat/completions';
      } else {
        // 其他提供商添加 /v1/chat/completions（兼容OpenAI格式）
        if (fullApiUrl.endsWith('/')) {
          fullApiUrl = fullApiUrl + 'v1/chat/completions';
        } else if (fullApiUrl.endsWith('/v1')) {
          fullApiUrl = fullApiUrl + '/chat/completions';
        } else {
          fullApiUrl = fullApiUrl + '/v1/chat/completions';
        }
      }

      return {
        id: model.id,
        name: model.name,
        displayName: model.displayName,
        modelType: model.modelType,
        parameters: model.parameters,
        role: model.role,
        priority: model.priority,
        contextWindow: model.contextWindow,
        provider: {
          ...model.provider,
          apiUrl: fullApiUrl, // 添加完整的API URL
        },
        apiKeyEncrypted: model.apiKeyEncrypted, // 包含API密钥字段
      };
    });

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

    // 过滤返回的字段，包含解密后的API密钥
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
      apiKeyEncrypted: primaryModel.apiKeyEncrypted, // 包含API密钥字段
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

/**
 * @swagger
 * /public/ai-models/providers:
 *   get:
 *     summary: 获取活跃的AI提供商列表（公开接口）
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/public/ai-models/providers',
  authenticateApiKey,
  requireApiPermission('ai_models:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const providers = await prisma.aiProvider.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        baseUrl: true,
        supportedModels: true,
      },
      orderBy: {
        displayName: 'asc'
      }
    });

    const response: ApiResponse = {
      success: true,
      message: '获取AI提供商列表成功',
      data: providers,
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /public/ai-models/by-type/{type}:
 *   get:
 *     summary: 根据类型获取AI模型（公开接口）
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [chat, completion, embedding]
 *         description: 模型类型
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/public/ai-models/by-type/:type',
  authenticateApiKey,
  requireApiPermission('ai_models:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { type } = req.params;

    const models = await prisma.aiModel.findMany({
      where: {
        isActive: true,
        modelType: type,
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
        { priority: 'asc' },
        { displayName: 'asc' }
      ]
    });

    // 过滤返回的字段，包含解密后的API密钥
    const filteredModels = models.map(model => ({
      id: model.id,
      name: model.name,
      displayName: model.displayName,
      modelType: model.modelType,
      parameters: model.parameters,
      role: model.role,
      priority: model.priority,
      contextWindow: model.contextWindow,
      provider: model.provider,
      apiKeyEncrypted: model.apiKeyEncrypted, // 包含API密钥字段
    }));

    const response: ApiResponse = {
      success: true,
      message: `获取${type}类型AI模型成功`,
      data: filteredModels,
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /public/prompts/by-name/{name}:
 *   get:
 *     summary: 根据名称获取提示词模板（公开接口）
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: 模板名称
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 模板不存在
 */
router.get(
  '/public/prompts/by-name/:name',
  authenticateApiKey,
  requireApiPermission('prompts:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name } = req.params;

    const template = await prisma.promptTemplate.findFirst({
      where: {
        name,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        type: true,
        systemPrompt: true,
        userPromptTemplate: true,
        formatInstructions: true,
        version: true,
        updatedAt: true,
      }
    });

    if (!template) {
      res.status(404).json({
        success: false,
        message: '提示词模板不存在',
        code: 'TEMPLATE_NOT_FOUND'
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: '获取提示词模板成功',
      data: template,
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /public/hexagrams/all:
 *   get:
 *     summary: 获取所有卦象数据（公开接口）
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/public/hexagrams/all',
  authenticateApiKey,
  requireApiPermission('hexagrams:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const hexagrams = await prisma.hexagramData.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        element: true,
        description: true,
        interpretation: true,
        favorableActions: true,
        unfavorableActions: true,
        timeInfo: true,
        directionInfo: true,
        resolutionMethods: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    const response: ApiResponse = {
      success: true,
      message: '获取卦象数据成功',
      data: hexagrams,
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /public/hexagrams/{id}:
 *   get:
 *     summary: 根据卦象ID获取详细信息（公开接口）
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 卦象ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 卦象不存在
 */
router.get(
  '/public/hexagrams/:id',
  authenticateApiKey,
  requireApiPermission('hexagrams:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: '卦象ID必须是有效的整数',
        code: 'INVALID_HEXAGRAM_ID'
      });
      return;
    }

    const hexagram = await prisma.hexagramData.findFirst({
      where: {
        id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        element: true,
        description: true,
        interpretation: true,
        favorableActions: true,
        unfavorableActions: true,
        timeInfo: true,
        directionInfo: true,
        resolutionMethods: true,
        updatedAt: true,
      }
    });

    if (!hexagram) {
      res.status(404).json({
        success: false,
        message: '卦象不存在',
        code: 'HEXAGRAM_NOT_FOUND'
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: '获取卦象详情成功',
      data: hexagram,
    };

    res.json(response);
  })
);

export default router;
