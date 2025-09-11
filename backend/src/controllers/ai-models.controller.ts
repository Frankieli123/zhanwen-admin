import { Request, Response } from 'express';
import { AIModelService } from '@/services/ai-model.service';
import { AIProviderService } from '@/services/ai-provider.service';
import { ModelFetcherService } from '@/services/model-fetcher.service';
import { asyncHandler } from '@/middleware/error.middleware';
import { ApiResponse, PaginationQuery } from '@/types/api.types';
import { ensureStandardResponse } from '@/utils/response';

const aiModelService = new AIModelService();
const aiProviderService = new AIProviderService();

// 统一构建完整的模型调用 API URL（与 public.routes.ts 保持一致，并避免重复追加）
function buildFullApiUrl(providerName: string, baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  let full = baseUrl.trim();
  if (/\/v1\/chat\/completions\/?$/.test(full) || /\/chat\/completions\/?$/.test(full)) {
    return full;
  }
  const endsWithSlash = full.endsWith('/');
  if (providerName === 'deepseek') {
    return endsWithSlash ? full + 'chat/completions' : full + '/chat/completions';
  }
  if (full.endsWith('/v1')) {
    return full + '/chat/completions';
  }
  if (endsWithSlash) {
    return full + 'v1/chat/completions';
  }
  return full + '/v1/chat/completions';
}

/**
 * @swagger
 * components:
 *   schemas:
 *     AIModel:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         displayName:
 *           type: string
 *         modelType:
 *           type: string
 *           enum: [chat, completion, embedding]
 *         role:
 *           type: string
 *           enum: [primary, secondary, disabled]
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/ai-models:
 *   get:
 *     summary: 获取模型列表
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: 状态筛选
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *         description: 供应商筛选
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getAIModels = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query: PaginationQuery = {
    page: parseInt(req.query['page'] as string) || 1,
    limit: parseInt(req.query['limit'] as string) || 10,
    sort: (req.query['sort'] as 'asc' | 'desc') || 'desc',
    search: req.query['search'] as string,
    status: req.query['status'] as string,
    category: req.query['category'] as string,
    provider: req.query['provider'] as string,
  };

  const result = await aiModelService.getModels(query);
  
  // 确保返回标准格式
  res.json(ensureStandardResponse(result, '获取模型列表成功'));
});

/**
 * @swagger
 * /api/ai-models/{id}:
 *   get:
 *     summary: 获取AI模型详情
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 模型不存在
 */
export const getAIModelById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const model = await aiModelService.getModelById(id);
  
  const response: ApiResponse = {
    success: true,
    message: '获取AI模型详情成功',
    data: model,
  };
  
  res.json(ensureStandardResponse(response, '获取AI模型详情成功'));
});

/**
 * @swagger
 * /api/ai-models:
 *   post:
 *     summary: 创建AI模型
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - name
 *               - displayName
 *             properties:
 *               providerId:
 *                 type: integer
 *               name:
 *                 type: string
 *               displayName:
 *                 type: string
 *               apiKeyEncrypted:
 *                 type: string
 *               modelType:
 *                 type: string
 *                 enum: [chat, completion, embedding]
 *               parameters:
 *                 type: object
 *               role:
 *                 type: string
 *                 enum: [primary, secondary, disabled]
 *     responses:
 *       201:
 *         description: 创建成功
 */
export const createAIModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const model = await aiModelService.createModel(req.body, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: 'AI模型创建成功',
    data: model,
  };
  
  res.status(201).json(ensureStandardResponse(response, 'AI模型创建成功'));
});

/**
 * @swagger
 * /api/ai-models/{id}:
 *   put:
 *     summary: 更新AI模型
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 更新成功
 */
export const updateAIModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const model = await aiModelService.updateModel(id, req.body, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: 'AI模型更新成功',
    data: model,
  };
  
  res.json(ensureStandardResponse(response, 'AI模型更新成功'));
});

/**
 * @swagger
 * /api/ai-models/{id}:
 *   delete:
 *     summary: 删除AI模型
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
export const deleteAIModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  await aiModelService.deleteModel(id, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: 'AI模型删除成功',
  };
  
  res.json(ensureStandardResponse(response, 'AI模型删除成功'));
});

/**
 * @swagger
 * /api/ai-models/batch:
 *   delete:
 *     summary: 批量删除AI模型
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: 批量删除成功
 */
export const batchDeleteAIModels = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body;
  await aiModelService.batchDeleteModels(ids, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: 'AI模型批量删除成功',
  };
  
  res.json(ensureStandardResponse(response, 'AI模型批量删除成功'));
});

/**
 * @swagger
 * /api/ai-models/{id}/test:
 *   post:
 *     summary: 测试AI模型连接
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 测试完成
 */
export const testAIModelConnection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const result = await aiModelService.testModelConnection(id);
  
  const response: ApiResponse = {
    success: true,
    message: '连接测试完成',
    data: result,
  };
  
  res.json(ensureStandardResponse(response, '连接测试完成'));
});

/**
 * @swagger
 * /api/ai-models/{id}/stats:
 *   get:
 *     summary: 获取AI模型使用统计
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getAIModelStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const days = parseInt(req.query['days'] as string) || 30;
  const stats = await aiModelService.getModelStats(id, days);
  
  const response: ApiResponse = {
    success: true,
    message: '获取模型统计成功',
    data: stats,
  };
  
  res.json(ensureStandardResponse(response, '获取模型统计成功'));
});

// AI服务商相关控制器方法

/**
 * @swagger
 * /api/ai-providers:
 *   get:
 *     summary: 获取AI服务商列表
 *     tags: [AI Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getAIProviders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query: PaginationQuery = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
    sort: (req.query.sort as 'asc' | 'desc') || 'desc',
    search: req.query.search as string,
    status: req.query.status as string,
  };

  const result = await aiProviderService.getProviders(query);
  res.json(result);
});

/**
 * @swagger
 * /api/ai-providers/active:
 *   get:
 *     summary: 获取活跃的AI服务商列表
 *     tags: [AI Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getActiveAIProviders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const providers = await aiProviderService.getActiveProviders();

  // 仅对具备更高权限的用户返回明文密钥
  const user = req.user;
  console.log('🔍 用户权限检查:', { user: user ? { role: user.role, permissions: user.permissions } : null });
  const canReturnPlain = !!user && (
    user.role === 'super_admin' ||
    user.role === 'admin' ||
    (Array.isArray(user.permissions) && (
      user.permissions.includes('ai_models:update') ||
      user.permissions.includes('ai_models:create')
    ))
  );
  console.log('🔑 是否返回明文密钥:', canReturnPlain);

  let data: any = providers;
  if (canReturnPlain) {
    data = await Promise.all(
      providers.map(async (p: any) => {
        console.log(`🔍 正在解密服务商 ${p.name} (ID: ${p.id}) 的密钥...`);
        const key = await aiProviderService.getDecryptedApiKeyById(p.id);
        console.log(`🔑 服务商 ${p.name} 解密结果:`, key ? '有密钥' : '无密钥');
        return { ...p, apiKeyDecrypted: key || null };
      })
    );
  }

  const response: ApiResponse = {
    success: true,
    message: '获取活跃服务商列表成功',
    data,
  };

  res.json(response);
});

/**
 * @swagger
 * /api/ai-providers/{id}:
 *   get:
 *     summary: 获取AI服务商详情
 *     tags: [AI Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getAIProviderById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const provider = await aiProviderService.getProviderById(id);

  // 仅对具备更高权限的用户返回明文密钥，用于前端自动回填
  const user = req.user;
  const canReturnPlain = !!user && (
    user.role === 'super_admin' ||
    user.role === 'admin' ||
    (Array.isArray(user.permissions) && (
      user.permissions.includes('ai_models:update') ||
      user.permissions.includes('ai_models:create')
    ))
  );

  let data: any = provider;
  if (canReturnPlain) {
    const key = await aiProviderService.getDecryptedApiKeyById(id);
    data = { ...(provider as any), apiKeyDecrypted: key || null };
  }

  const response: ApiResponse = {
    success: true,
    message: '获取AI服务商详情成功',
    data,
  };

  res.json(response);
});

/**
 * @swagger
 * /api/ai-providers:
 *   post:
 *     summary: 创建AI服务商
 *     tags: [AI Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - displayName
 *               - baseUrl
 *             properties:
 *               name:
 *                 type: string
 *               displayName:
 *                 type: string
 *               baseUrl:
 *                 type: string
 *               authType:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: 创建成功
 */
export const createAIProvider = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const provider = await aiProviderService.createProvider(req.body, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: 'AI服务商创建成功',
    data: provider,
  };
  
  res.status(201).json(response);
});

/**
 * @swagger
 * /api/ai-providers/{id}:
 *   put:
 *     summary: 更新AI服务商
 *     tags: [AI Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               baseUrl:
 *                 type: string
 *               authType:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               supportedModels:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 type: object
 *               apiKeyEncrypted:
 *                 type: string
 *                 description: 明文传入，服务端加密保存；传空字符串清空密钥
 *     responses:
 *       200:
 *         description: 更新成功
 */
export const updateAIProvider = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const provider = await aiProviderService.updateProvider(id, req.body, req.user!.userId);

  const response: ApiResponse = {
    success: true,
    message: 'AI服务商更新成功',
    data: provider,
  };

  res.json(response);
});

/**
 * @swagger
 * /api/ai-providers/{id}:
 *   delete:
 *     summary: 删除AI服务商
 *     tags: [AI Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
export const deleteAIProvider = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  await aiProviderService.deleteProvider(id, req.user!.userId);

  const response: ApiResponse = {
    success: true,
    message: 'AI服务商删除成功',
  };

  res.json(response);
});

/**
 * @swagger
 * /api/ai-models/active:
 *   get:
 *     summary: 获取当前活跃的AI模型配置
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     primary:
 *                       $ref: '#/components/schemas/AIModel'
 *                     backups:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AIModel'
 *                     hasValidConfig:
 *                       type: boolean
 */
export const getActiveAIConfiguration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const configuration = await aiModelService.getAIConfiguration();
  // 为 primary 和 backups 注入完整的 provider.apiUrl，避免前端仅拿到 baseUrl
  const mapWithApiUrl = (model: any) =>
    model
      ? {
          ...model,
          provider: {
            ...model.provider,
            apiUrl: buildFullApiUrl(model.provider.name, (model as any).customApiUrl || model.provider.baseUrl),
          },
        }
      : null;

  const data = {
    primary: mapWithApiUrl(configuration.primary),
    backups: Array.isArray(configuration.backups) ? configuration.backups.map(mapWithApiUrl) : [],
    hasValidConfig: configuration.hasValidConfig,
  };

  const response: ApiResponse = {
    success: true,
    message: '获取活跃AI配置成功',
    data,
  };

  res.json(response);
});

/**
 * @swagger
 * /api/ai-models/primary:
 *   get:
 *     summary: 获取当前主模型
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 未找到活跃的主模型
 */
export const getPrimaryAIModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const primaryModel = await aiModelService.getActiveModel();

  if (!primaryModel) {
    const response: ApiResponse = {
      success: false,
      message: '未找到活跃的主模型',
      data: null,
    };
    res.status(404).json(response);
    return;
  }

  // 注入完整的 provider.apiUrl，保持与公开接口一致
  const modelWithApiUrl = {
    ...primaryModel,
    provider: {
      ...primaryModel.provider,
      apiUrl: buildFullApiUrl(primaryModel.provider.name, (primaryModel as any).customApiUrl || primaryModel.provider.baseUrl),
    },
  } as any;

  const response: ApiResponse = {
    success: true,
    message: '获取主模型成功',
    data: modelWithApiUrl,
  };

  res.json(response);
});

/**
 * @swagger
 * /api/ai-models/fetch-models:
 *   post:
 *     summary: 拉取指定供应商的模型列表
 *     tags: [AI Models]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *             properties:
 *               provider:
 *                 type: string
 *                 description: 供应商名称
 *               apiKey:
 *                 type: string
 *                 description: API密钥
 *               apiUrl:
 *                 type: string
 *                 description: 自定义API地址
 *     responses:
 *       200:
 *         description: 拉取成功
 */
export const fetchModels = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { provider, apiKey, apiUrl } = req.body;

  if (!provider) {
    const response: ApiResponse = {
      success: false,
      message: '供应商不能为空',
    };
    res.status(400).json(response);
    return;
  }

  // 规范化服务商名称
  const normalizedProvider = String(provider).trim().toLowerCase();

  // 若未显式提供 apiKey，回退到服务商级密钥
  let finalApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!finalApiKey) {
    const fallback = await aiProviderService.getDecryptedApiKeyByName(normalizedProvider);
    finalApiKey = fallback ? fallback.trim() : '';
  }

  if (!finalApiKey) {
    const response: ApiResponse = {
      success: false,
      message: '未提供API密钥，且该供应商未配置可用密钥',
    };
    res.status(400).json(response);
    return;
  }

  // 计算最终 API 地址：优先请求体，其次服务商配置
  let finalApiUrl: string | undefined = typeof apiUrl === 'string' && apiUrl.trim() ? apiUrl.trim() : undefined;
  if (!finalApiUrl) {
    const basic = await aiProviderService.getProviderBasicByName(normalizedProvider);
    if (basic?.baseUrl) finalApiUrl = basic.baseUrl;
  }

  const models = await ModelFetcherService.fetchModels({
    provider: normalizedProvider,
    apiKey: finalApiKey,
    apiUrl: finalApiUrl,
  });

  const response: ApiResponse = {
    success: true,
    message: '拉取模型列表成功',
    data: models,
  };

  res.json(response);
});

/**
 * @swagger
 * /api/ai-models/test-connection:
 *   post:
 *     summary: 测试API连接
 *     tags: [AI Models]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *             properties:
 *               provider:
 *                 type: string
 *                 description: 供应商名称
 *               apiKey:
 *                 type: string
 *                 description: API密钥
 *               apiUrl:
 *                 type: string
 *                 description: 自定义API地址
 *     responses:
 *       200:
 *         description: 测试结果
 */
export const testAPIConnection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { provider, apiKey, apiUrl } = req.body;

  // 验证供应商
  if (!provider) {
    const response: ApiResponse = {
      success: false,
      message: '供应商不能为空',
    };
    res.status(400).json(response);
    return;
  }

  // 计算最终使用的 API Key：优先请求体，其次服务商级
  let finalApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!finalApiKey) {
    const fallback = await aiProviderService.getDecryptedApiKeyByName(provider);
    finalApiKey = fallback ? fallback.trim() : '';
  }

  if (!finalApiKey) {
    const response: ApiResponse = {
      success: false,
      message: '未提供API密钥，且该供应商未配置可用密钥',
    };
    res.status(400).json(response);
    return;
  }

  const isConnected = await ModelFetcherService.testConnection({
    provider,
    apiKey: finalApiKey,
    apiUrl,
  });

  const response: ApiResponse = {
    success: isConnected,
    message: isConnected ? 'API连接测试成功' : 'API连接测试失败',
    data: { connected: isConnected },
  };

  res.json(response);
});
