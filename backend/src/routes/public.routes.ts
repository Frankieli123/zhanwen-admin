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
        { priority: 'asc' },
        { displayName: 'asc' }
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

/**
 * @swagger
 * /public/usage/log:
 *   post:
 *     summary: 记录API调用日志（公开接口）
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modelId:
 *                 type: integer
 *                 description: AI模型ID
 *               requestId:
 *                 type: string
 *                 description: 请求ID
 *               userId:
 *                 type: string
 *                 description: 用户ID
 *               platform:
 *                 type: string
 *                 description: 平台类型
 *               promptHash:
 *                 type: string
 *                 description: 提示词哈希
 *               tokensUsed:
 *                 type: integer
 *                 description: 使用的token数量
 *               cost:
 *                 type: number
 *                 description: 成本
 *               responseTimeMs:
 *                 type: integer
 *                 description: 响应时间（毫秒）
 *               status:
 *                 type: string
 *                 description: 状态
 *               errorMessage:
 *                 type: string
 *                 description: 错误信息
 *               metadata:
 *                 type: object
 *                 description: 元数据
 *     responses:
 *       200:
 *         description: 记录成功
 *       401:
 *         description: API Key 无效
 */
router.post(
  '/public/usage/log',
  authenticateApiKey,
  requireApiPermission('usage:write'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      modelId,
      requestId,
      userId,
      clientId,
      sessionId,
      platform,
      promptHash,
      tokensUsed,
      cost,
      responseTimeMs,
      status,
      errorMessage,
      metadata = {},
      clientInfo = {},
      timestamp
    } = req.body;

    // 如果提供了clientId，更新客户端活跃时间和统计
    if (clientId && clientInfo) {
      const updateData: any = {
        lastActiveAt: new Date(),
        totalRequests: { increment: 1 },
        totalTokens: { increment: tokensUsed ? BigInt(tokensUsed) : BigInt(0) },
        totalCost: { increment: cost ? parseFloat(cost.toString()) : 0 },
      };

      // 更新客户端环境信息
      if (clientInfo.userAgent) updateData.userAgent = clientInfo.userAgent;
      if (clientInfo.language) updateData.language = clientInfo.language;
      if (clientInfo.timezone) updateData.timezone = clientInfo.timezone;
      if (clientInfo.screen) updateData.screenInfo = clientInfo.screen;
      if (clientInfo.deviceMemory || clientInfo.hardwareConcurrency) {
        updateData.deviceInfo = {
          deviceMemory: clientInfo.deviceMemory,
          hardwareConcurrency: clientInfo.hardwareConcurrency
        };
      }
      if (clientInfo.connection) updateData.networkInfo = clientInfo.connection;
      if (clientInfo.appVersion) updateData.appVersion = clientInfo.appVersion;
      if (clientInfo.buildTime) updateData.buildTime = new Date(clientInfo.buildTime);

      await prisma.clientApp.upsert({
        where: { clientId },
        update: updateData,
        create: {
          clientId,
          name: `自动创建-${clientId}`,
          platform: platform || clientInfo.platform || 'unknown',
          userAgent: clientInfo.userAgent,
          language: clientInfo.language,
          timezone: clientInfo.timezone,
          screenInfo: clientInfo.screen || {},
          deviceInfo: {
            deviceMemory: clientInfo.deviceMemory,
            hardwareConcurrency: clientInfo.hardwareConcurrency
          },
          networkInfo: clientInfo.connection || {},
          appVersion: clientInfo.appVersion,
          buildTime: clientInfo.buildTime ? new Date(clientInfo.buildTime) : null,
          lastActiveAt: new Date(),
          totalRequests: 1,
          totalTokens: tokensUsed ? BigInt(tokensUsed) : BigInt(0),
          totalCost: cost ? parseFloat(cost.toString()) : 0,
        },
      });
    }

    await prisma.apiCallLog.create({
      data: {
        modelId: modelId ? parseInt(modelId) : null,
        requestId,
        userId,
        sessionId,
        platform,
        promptHash,
        tokensUsed: tokensUsed ? parseInt(tokensUsed) : null,
        cost: cost ? parseFloat(cost) : null,
        responseTimeMs: responseTimeMs ? parseInt(responseTimeMs) : null,
        status,
        errorMessage,
        metadata,
        clientInfo,
        timestamp: timestamp ? new Date(timestamp) : null,
      },
    });

    const response: ApiResponse = {
      success: true,
      message: 'API调用日志记录成功',
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /public/usage/metrics:
 *   post:
 *     summary: 上报使用指标（公开接口）
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: 日期
 *               platform:
 *                 type: string
 *                 description: 平台类型
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: 指标名称
 *                     value:
 *                       type: integer
 *                       description: 指标值
 *                     metadata:
 *                       type: object
 *                       description: 元数据
 *     responses:
 *       200:
 *         description: 上报成功
 */
router.post(
  '/public/usage/metrics',
  authenticateApiKey,
  requireApiPermission('usage:write'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { date, platform, clientId, metrics } = req.body;

    if (!Array.isArray(metrics)) {
      res.status(400).json({
        success: false,
        message: 'metrics必须是数组格式',
        code: 'INVALID_METRICS_FORMAT'
      });
      return;
    }

    const metricsData = metrics.map((metric: any) => ({
      date: new Date(date),
      platform,
      clientId: clientId || metric.metadata?.clientId,
      sessionId: metric.metadata?.sessionId,
      userId: metric.metadata?.userId,
      metricName: metric.name,
      metricValue: BigInt(metric.value),
      metadata: metric.metadata || {},
      clientInfo: metric.clientInfo || {},
    }));

    // 使用upsert来处理重复数据
    for (const metricData of metricsData) {
      await prisma.usageStatistic.upsert({
        where: {
          date_platform_clientId_metricName: {
            date: metricData.date,
            platform: metricData.platform,
            clientId: metricData.clientId,
            metricName: metricData.metricName,
          },
        },
        update: {
          metricValue: metricData.metricValue,
          metadata: metricData.metadata,
        },
        create: metricData,
      });
    }

    const response: ApiResponse = {
      success: true,
      message: '使用指标上报成功',
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /public/usage/batch:
 *   post:
 *     summary: 批量上报使用数据（公开接口）
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logs:
 *                 type: array
 *                 description: API调用日志数组
 *               metrics:
 *                 type: array
 *                 description: 使用指标数组
 *     responses:
 *       200:
 *         description: 批量上报成功
 */
router.post(
  '/public/usage/batch',
  authenticateApiKey,
  requireApiPermission('usage:write'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { logs = [], metrics = [] } = req.body;

    const results = {
      logs: { success: 0, failed: 0 },
      metrics: { success: 0, failed: 0 },
    };

    // 批量处理API调用日志
    if (logs.length > 0) {
      try {
        // 先处理客户端信息更新
        for (const log of logs) {
          if (log.clientId && log.clientInfo) {
            const updateData: any = {
              lastActiveAt: new Date(),
              totalRequests: { increment: 1 },
              totalTokens: { increment: log.tokensUsed ? BigInt(log.tokensUsed) : BigInt(0) },
              totalCost: { increment: log.cost ? parseFloat(log.cost.toString()) : 0 },
            };

            // 更新客户端环境信息
            if (log.clientInfo.userAgent) updateData.userAgent = log.clientInfo.userAgent;
            if (log.clientInfo.language) updateData.language = log.clientInfo.language;
            if (log.clientInfo.timezone) updateData.timezone = log.clientInfo.timezone;
            if (log.clientInfo.screen) updateData.screenInfo = log.clientInfo.screen;
            if (log.clientInfo.deviceMemory || log.clientInfo.hardwareConcurrency) {
              updateData.deviceInfo = {
                deviceMemory: log.clientInfo.deviceMemory,
                hardwareConcurrency: log.clientInfo.hardwareConcurrency
              };
            }
            if (log.clientInfo.connection) updateData.networkInfo = log.clientInfo.connection;
            if (log.clientInfo.appVersion) updateData.appVersion = log.clientInfo.appVersion;
            if (log.clientInfo.buildTime) updateData.buildTime = new Date(log.clientInfo.buildTime);

            await prisma.clientApp.upsert({
              where: { clientId: log.clientId },
              update: updateData,
              create: {
                clientId: log.clientId,
                name: `自动创建-${log.clientId}`,
                platform: log.platform || log.clientInfo.platform || 'unknown',
                userAgent: log.clientInfo.userAgent,
                language: log.clientInfo.language,
                timezone: log.clientInfo.timezone,
                screenInfo: log.clientInfo.screen || {},
                deviceInfo: {
                  deviceMemory: log.clientInfo.deviceMemory,
                  hardwareConcurrency: log.clientInfo.hardwareConcurrency
                },
                networkInfo: log.clientInfo.connection || {},
                appVersion: log.clientInfo.appVersion,
                buildTime: log.clientInfo.buildTime ? new Date(log.clientInfo.buildTime) : null,
                lastActiveAt: new Date(),
                totalRequests: 1,
                totalTokens: log.tokensUsed ? BigInt(log.tokensUsed) : BigInt(0),
                totalCost: log.cost ? parseFloat(log.cost.toString()) : 0,
              },
            });
          }
        }

        const logData = logs.map((log: any) => ({
          modelId: log.modelId ? parseInt(log.modelId) : null,
          requestId: log.requestId,
          userId: log.userId,
          clientId: log.clientId,
          sessionId: log.sessionId,
          platform: log.platform,
          promptHash: log.promptHash,
          tokensUsed: log.tokensUsed ? parseInt(log.tokensUsed) : null,
          cost: log.cost ? parseFloat(log.cost) : null,
          responseTimeMs: log.responseTimeMs ? parseInt(log.responseTimeMs) : null,
          status: log.status,
          errorMessage: log.errorMessage,
          metadata: log.metadata || {},
          clientInfo: log.clientInfo || {},
          timestamp: log.timestamp ? new Date(log.timestamp) : null,
        }));

        await prisma.apiCallLog.createMany({
          data: logData,
          skipDuplicates: true,
        });
        results.logs.success = logs.length;
      } catch (error) {
        results.logs.failed = logs.length;
      }
    }

    // 批量处理使用指标
    if (metrics.length > 0) {
      for (const metric of metrics) {
        try {
          // 处理客户端信息更新
          if (metric.metadata?.clientId && metric.clientInfo) {
            await prisma.clientApp.upsert({
              where: { clientId: metric.metadata.clientId },
              update: {
                lastActiveAt: new Date(),
                userAgent: metric.clientInfo.userAgent,
                language: metric.clientInfo.language,
                timezone: metric.clientInfo.timezone,
                screenInfo: metric.clientInfo.screen || {},
                deviceInfo: {
                  deviceMemory: metric.clientInfo.deviceMemory,
                  hardwareConcurrency: metric.clientInfo.hardwareConcurrency
                },
                networkInfo: metric.clientInfo.connection || {},
                appVersion: metric.clientInfo.appVersion,
              },
              create: {
                clientId: metric.metadata.clientId,
                name: `自动创建-${metric.metadata.clientId}`,
                platform: metric.metadata.platform || 'unknown',
                userAgent: metric.clientInfo.userAgent,
                language: metric.clientInfo.language,
                timezone: metric.clientInfo.timezone,
                screenInfo: metric.clientInfo.screen || {},
                deviceInfo: {
                  deviceMemory: metric.clientInfo.deviceMemory,
                  hardwareConcurrency: metric.clientInfo.hardwareConcurrency
                },
                networkInfo: metric.clientInfo.connection || {},
                appVersion: metric.clientInfo.appVersion,
                lastActiveAt: new Date(),
                totalRequests: 0,
                totalTokens: BigInt(0),
                totalCost: 0,
              },
            });
          }

          await prisma.usageStatistic.upsert({
            where: {
              date_platform_clientId_metricName: {
                date: new Date(metric.date),
                platform: metric.metadata?.platform || metric.platform,
                clientId: metric.metadata?.clientId || metric.clientId,
                metricName: metric.name,
              },
            },
            update: {
              metricValue: { increment: BigInt(metric.value) },
              metadata: metric.metadata || {},
              clientInfo: metric.clientInfo || {},
            },
            create: {
              date: new Date(metric.date),
              platform: metric.metadata?.platform || metric.platform,
              clientId: metric.metadata?.clientId || metric.clientId,
              sessionId: metric.metadata?.sessionId,
              userId: metric.metadata?.userId,
              metricName: metric.name,
              metricValue: BigInt(metric.value),
              metadata: metric.metadata || {},
              clientInfo: metric.clientInfo || {},
            },
          });
          results.metrics.success++;
        } catch (error) {
          results.metrics.failed++;
        }
      }
    }

    const response: ApiResponse = {
      success: true,
      message: '批量上报完成',
      data: results,
    };

    res.json(response);
  })
);

export default router;
