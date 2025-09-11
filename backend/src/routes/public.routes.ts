import { Router } from 'express';
import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey, requireApiPermission } from '@/middleware/apiKey.middleware';
import { authenticateToken } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import { ApiResponse } from '@/types/api.types';
import Handlebars from 'handlebars';
import crypto from 'crypto';

const router = Router();

// 允许“管理员JWT 或 应用API Key”两种方式访问公开数据
function authPublicAccess(apiPermission: string) {
  return (req: Request, res: Response, next: any) => {
    const hasBearer = typeof req.headers.authorization === 'string' && req.headers.authorization.trim() !== ''
    if (hasBearer) {
      // 管理端登录态：使用 JWT 鉴权，放行
      return (authenticateToken as any)(req, res, next)
    }
    // 客户端：走 API Key 鉴权 + 权限校验
    ;(authenticateApiKey as any)(req, res, (err: any) => {
      if (err) return next(err)
      return (requireApiPermission(apiPermission) as any)(req, res, next)
    })
  }
}

// 统一构建完整的模型调用 API URL（兼容不同服务商，且避免重复追加）
function buildFullApiUrl(providerName: string, baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  let full = baseUrl.trim();
  // 已经是最终路径，直接返回
  if (/\/v1\/chat\/completions\/?$/.test(full) || /\/chat\/completions\/?$/.test(full)) {
    return full;
  }
  // 归一化尾部斜杠
  const endsWithSlash = full.endsWith('/');
  if (providerName === 'deepseek') {
    return endsWithSlash ? full + 'chat/completions' : full + '/chat/completions';
  }
  // OpenAI 兼容
  if (full.endsWith('/v1')) {
    return full + '/chat/completions';
  }
  if (endsWithSlash) {
    return full + 'v1/chat/completions';
  }
  return full + '/v1/chat/completions';
}

// 计算基于响应数据的弱 ETag（用于客户端缓存）
function computeETagFromData(data: any): string {
  try {
    const json = JSON.stringify(data);
    const hash = crypto.createHash('md5').update(json).digest('hex');
    return `W/"${hash}"`;
  } catch {
    // 兜底：使用时间戳，避免抛错
    return `W/"${Date.now().toString(16)}"`;
  }
}

// 为提示词三段文本计算稳定 ETag（仅基于 texts + version + active）
function computePromptTextsStableETag(data: {
  version: string | number;
  active: boolean;
  texts: { system_prompt?: string; user_intro?: string; user_guidelines?: string };
}): string {
  const payload = JSON.stringify({
    version: String(data.version),
    active: !!data.active,
    texts: {
      system_prompt: data.texts?.system_prompt ?? '',
      user_intro: data.texts?.user_intro ?? '',
      user_guidelines: data.texts?.user_guidelines ?? '',
    },
  });
  const hash = crypto.createHash('md5').update(payload).digest('hex');
  return `W/"${hash}"`;
}

// 统一设置提示词相关的响应头
function setPromptTextsCommonHeaders(res: Response, data: { updatedAt: string; version: string | number }, etag: string) {
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', new Date(data.updatedAt).toUTCString());
  res.setHeader('X-Prompt-Version', String(data.version));
  // 允许前端读取关键头
  res.setHeader('Access-Control-Expose-Headers', 'ETag, Last-Modified, X-Prompt-Version');
}

// 使用 Handlebars 渲染模板
function renderHandlebars(template: string, variables: Record<string, any>): string {
  const compiled = Handlebars.compile(template, { noEscape: false });
  return compiled(variables || {});
}

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
  authPublicAccess('configs:read'),
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
 * 提示词三段文本：列表
 * GET /public/prompt-texts
 * Query：name, version, active, page, pageSize
 */
router.get(
  '/public/prompt-texts',
  authPublicAccess('prompts:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    logger.info('[PromptTexts] list request', { query: req.query });
    const name = (req.query.name as string) || undefined;
    const version = (req.query.version as string) || undefined;
    const activeParam = (req.query.active as string) || undefined;
    const rawPage = (req.query.page as string) || '1';
    const rawSize = (req.query.pageSize as string) || '20';
    let page = parseInt(rawPage, 10);
    let pageSize = parseInt(rawSize, 10);
    if (!Number.isFinite(page) || isNaN(page) || page <= 0) page = 1;
    if (!Number.isFinite(pageSize) || isNaN(pageSize) || pageSize <= 0) pageSize = 20;
    if (pageSize > 200) pageSize = 200;

    const where: any = {};
    if (name) where.name = name;
    if (version) where.version = version;
    if (activeParam !== undefined) {
      const lowered = String(activeParam).toLowerCase();
      if (['true', '1', 'yes'].includes(lowered)) where.isActive = true;
      else if (['false', '0', 'no'].includes(lowered)) where.isActive = false;
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const rows = await prisma.promptText.findMany({
      where,
      select: {
        id: true,
        name: true,
        version: true,
        isActive: true,
        texts: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      skip,
      take,
    });

    const data = rows.map((t: any) => ({
      id: t.id,
      name: t.name,
      version: String(t.version),
      active: !!t.isActive,
      texts: {
        system_prompt: t.texts?.system_prompt ?? '',
        user_intro: t.texts?.user_intro ?? '',
        user_guidelines: t.texts?.user_guidelines ?? '',
      },
      createdAt: t.createdAt.toISOString(),
      lastUsedAt: t?.metadata?.lastUsedAt ? new Date(t.metadata.lastUsedAt).toISOString() : undefined,
      updatedAt: t.updatedAt.toISOString(),
    }));

    const response: ApiResponse = {
      success: true,
      message: '获取提示词文本列表成功',
      data,
    };

    const eTag = computeETagFromData({
      count: data.length,
      items: data.map(i => ({
        id: i.id,
        version: i.version,
        createdAt: (i as any).createdAt,
        lastUsedAt: (i as any).lastUsedAt,
        updatedAt: i.updatedAt,
      }))
    });
    if (req.headers['if-none-match'] === eTag) {
      res.status(304).end();
      return;
    }
    res.setHeader('ETag', eTag);
    res.json(response);
  })
);

/**
 * 提示词三段文本：获取活跃版本
 * GET /public/prompt-texts/active
 */
router.get(
  '/public/prompt-texts/active',
  authPublicAccess('prompts:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platform = (req.query.platform as string) || undefined;
    const scene = (req.query.scene as string) || undefined;
    const language = (req.query.lang as string) || undefined;
    const version = (req.query.version as string) || undefined;

    const where: any = { isActive: true };
    if (version) where.version = version;

    const t = await prisma.promptText.findFirst({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        version: true,
        isActive: true,
        texts: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      }
    });

    if (!t) {
      res.status(404).json({ success: false, message: '未找到激活的提示词文本', code: 'PROMPT_TEXTS_ACTIVE_NOT_FOUND' });
      return;
    }

    // 不再在读取时更新 lastUsedAt，避免造成 updatedAt 改变影响缓存

    const data = {
      id: t.id,
      name: t.name,
      version: String(t.version),
      active: !!t.isActive,
      texts: {
        system_prompt: (t as any).texts?.system_prompt ?? '',
        user_intro: (t as any).texts?.user_intro ?? '',
        user_guidelines: (t as any).texts?.user_guidelines ?? '',
      },
      createdAt: t.createdAt.toISOString(),
      lastUsedAt:
        (t as any)?.metadata?.lastUsedAt
          ? new Date((t as any).metadata.lastUsedAt).toISOString()
          : undefined,
      updatedAt: t.updatedAt.toISOString(),
    };

    const etag = computePromptTextsStableETag({ version: data.version, active: data.active, texts: data.texts });
    setPromptTextsCommonHeaders(res, { updatedAt: data.updatedAt, version: data.version }, etag);

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }

    const response: ApiResponse = { success: true, message: '获取活跃提示词文本成功', data };
    res.json(response);
  })
);

// HEAD /public/prompt-texts/active —— 返回相同的响应头，用于高效校验
router.head(
  '/public/prompt-texts/active',
  authPublicAccess('prompts:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const where: any = { isActive: true };

    const t = await prisma.promptText.findFirst({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        version: true,
        isActive: true,
        texts: true,
        updatedAt: true,
      }
    });

    if (!t) {
      res.sendStatus(404);
      return;
    }

    const data = {
      version: String(t.version),
      active: !!t.isActive,
      texts: {
        system_prompt: (t as any).texts?.system_prompt ?? '',
        user_intro: (t as any).texts?.user_intro ?? '',
        user_guidelines: (t as any).texts?.user_guidelines ?? '',
      },
      updatedAt: t.updatedAt.toISOString(),
    };

    const etag = computePromptTextsStableETag({ version: data.version, active: data.active, texts: data.texts });
    setPromptTextsCommonHeaders(res, { updatedAt: data.updatedAt, version: data.version }, etag);

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.sendStatus(304);
      return;
    }

    res.sendStatus(200);
  })
);

/**
 * 提示词三段文本：详情
 * GET /public/prompt-texts/:id
 */
router.get(
  '/public/prompt-texts/:id',
  authPublicAccess('prompts:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || isNaN(id)) {
      res.status(400).json({ success: false, message: 'ID无效', code: 'INVALID_ID' });
      return;
    }

    const t = await prisma.promptText.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        version: true,
        isActive: true,
        texts: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      }
    });

    if (!t) {
      res.status(404).json({ success: false, message: '提示词文本不存在', code: 'PROMPT_TEXTS_NOT_FOUND' });
      return;
    }

    const data = {
      id: t.id,
      name: t.name,
      version: String(t.version),
      active: !!t.isActive,
      texts: {
        system_prompt: (t as any).texts?.system_prompt ?? '',
        user_intro: (t as any).texts?.user_intro ?? '',
        user_guidelines: (t as any).texts?.user_guidelines ?? '',
      },
      createdAt: t.createdAt.toISOString(),
      lastUsedAt:
        (t as any)?.metadata?.lastUsedAt
          ? new Date((t as any).metadata.lastUsedAt).toISOString()
          : undefined,
      updatedAt: t.updatedAt.toISOString(),
    };

    const response: ApiResponse = { success: true, message: '获取提示词文本详情成功', data };
    const eTag = computeETagFromData({ id: data.id, version: data.version, updatedAt: data.updatedAt });
    if (req.headers['if-none-match'] === eTag) {
      res.status(304).end();
      return;
    }
    res.setHeader('ETag', eTag);
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
  authPublicAccess('ai_models:read'),
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
      // 优先使用每个模型的 customApiUrl，其次回退到 provider.baseUrl
      const base = (model as any).customApiUrl || model.provider.baseUrl;
      // 使用统一函数构建完整的API URL（幂等处理）
      const fullApiUrl = buildFullApiUrl(model.provider.name, base);

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
  authPublicAccess('ai_models:read'),
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

    // 过滤返回的字段，包含解密后的API密钥与完整API URL
    const filteredPrimaryModel = {
      id: primaryModel.id,
      name: primaryModel.name,
      displayName: primaryModel.displayName,
      modelType: primaryModel.modelType,
      parameters: primaryModel.parameters,
      role: primaryModel.role,
      priority: primaryModel.priority,
      contextWindow: primaryModel.contextWindow,
      provider: {
        ...primaryModel.provider,
        apiUrl: buildFullApiUrl(primaryModel.provider.name, (primaryModel as any).customApiUrl || primaryModel.provider.baseUrl), // 添加完整的API URL（优先 customApiUrl）
      },
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
  authPublicAccess('ai_models:read'),
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

    // 过滤返回的字段，包含解密后的API密钥与完整API URL
    const filteredModels = models.map(model => ({
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
        apiUrl: buildFullApiUrl(model.provider.name, (model as any).customApiUrl || model.provider.baseUrl),
      },
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
  authPublicAccess('prompts:read'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name } = req.params;

    const platform = (req.query.platform as string) || undefined;
    const scene = (req.query.scene as string) || undefined;
    const language = (req.query.lang as string) || undefined;
    const version = (req.query.version as string) || undefined;

    const where: any = { name, isActive: true };
    if (platform) where.platform = platform;
    if (scene) where.scene = scene;
    if (language) where.language = language;
    if (version) where.version = version;

    const t = await prisma.publicPrompt.findFirst({
      where,
      select: {
        id: true,
        name: true,
        version: true,
        platform: true,
        scene: true,
        language: true,
        isActive: true,
        messages: true,
        variables: true,
        updatedAt: true,
      }
    });

    if (!t) {
      res.status(404).json({
        success: false,
        message: '提示词模板不存在',
        code: 'TEMPLATE_NOT_FOUND'
      });
      return;
    }

    const vars2 = (t as any)?.variables && typeof (t as any).variables === 'object' ? (t as any).variables : {};
    const data = {
      id: t.id,
      name: t.name,
      version: String(t.version),
      platform: (t as any).platform,
      scene: (t as any).scene,
      language: (t as any).language,
      active: !!(t as any).isActive,
      messages: Array.isArray((t as any).messages) ? (t as any).messages : [],
      variables: {
        required: Array.isArray(vars2.required) ? vars2.required : [],
        optional: Array.isArray(vars2.optional) ? vars2.optional : [],
        defaults: vars2.defaults || {},
      },
      updatedAt: t.updatedAt.toISOString(),
    };

    const response: ApiResponse = {
      success: true,
      message: '获取提示词模板成功',
      data,
    };

    // ETag 缓存支持
    const eTag = computeETagFromData({ id: data.id, version: data.version, updatedAt: data.updatedAt });
    if (req.headers['if-none-match'] === eTag) {
      res.status(304).end();
      return;
    }
    res.setHeader('ETag', eTag);
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
  authPublicAccess('hexagrams:read'),
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
  authPublicAccess('hexagrams:read'),
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
