import { AiModel, AiProvider, Prisma } from '@prisma/client';
import { encrypt, decrypt } from '@/utils/encryption';
import { createError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';
import {
  AIModelCreateRequest,
  AIModelUpdateRequest,
  PaginationQuery,
  PaginatedResponse,
} from '@/types/api.types';

export class AIModelService {
  /**
   * 获取模型列表（分页）
   */
  async getModels(query: PaginationQuery): Promise<PaginatedResponse<AiModel & { provider: AiProvider }>> {
    const {
      page = 1,
      limit = 10,
      sort = 'desc',
      search,
      category,
      status,
      provider,
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

    if (provider) {
      where.provider = {
        name: { equals: provider, mode: 'insensitive' }
      };
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
      // 当模型未设置密钥时，回退到服务商级密钥进行掩码显示
      const modelsWithMaskedKeys = models.map(model => {
        const providerEncrypted = (model as any)?.provider?.apiKeyEncrypted as string | null | undefined;
        const encrypted = model.apiKeyEncrypted || providerEncrypted || null;
        return {
          ...model,
          apiKeyEncrypted: encrypted ? this.maskApiKey(encrypted) : null,
        };
      });

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: '获取模型列表成功',
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
      logger.error('获取模型列表失败', error);
      throw createError('获取模型列表失败', 500);
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
      // 优先使用模型级密钥，若无或解密失败则回退到服务商级密钥
      const modelEncryptedRaw = model.apiKeyEncrypted as string | null | undefined;
      const providerEncryptedRaw = (model as any)?.provider?.apiKeyEncrypted as string | null | undefined;
      const modelEncrypted = typeof modelEncryptedRaw === 'string' ? modelEncryptedRaw.trim() : modelEncryptedRaw;
      const providerEncrypted = typeof providerEncryptedRaw === 'string' ? providerEncryptedRaw.trim() : providerEncryptedRaw;

      let decryptedKey: string | null = null;
      if (modelEncrypted) {
        try {
          decryptedKey = decrypt(modelEncrypted);
        } catch (decryptError) {
          logger.warn('模型级API密钥解密失败，尝试回退到服务商密钥', { modelId: id, error: decryptError });
        }
      }

      if (!decryptedKey && providerEncrypted) {
        try {
          decryptedKey = decrypt(providerEncrypted);
        } catch (decryptError) {
          logger.warn('服务商API密钥解密失败', { modelId: id, providerId: (model as any)?.providerId, error: decryptError });
        }
      }

      return {
        ...model,
        apiKeyEncrypted: decryptedKey,
      };
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
      let provider: any;
      let actualProviderId: number;

      // 标准化与校验 providerId，兼容数组、字符串、数字、多选等情况
      const rawProviderId: any = (data as any).providerId;
      if (rawProviderId === undefined || rawProviderId === null || rawProviderId === '') {
        throw createError('providerId 不能为空', 400, 'PROVIDER_ID_REQUIRED');
      }
      // 处理多选场景：如果传入数组，仅允许单个；多个直接报错
      if (Array.isArray(rawProviderId)) {
        if (rawProviderId.length !== 1) {
          throw createError('暂不支持为单个模型选择多个服务商', 400, 'MULTIPLE_PROVIDERS_NOT_SUPPORTED');
        }
        (data as any).providerId = rawProviderId[0];
      }

      // 再次读取（可能已从数组归一化）
      const normalizedProviderId: any = (data as any).providerId;

      // 处理自定义服务商
      if (normalizedProviderId === 'custom') {
        if (!data.customProviderName) {
          throw createError('自定义服务商需要服务商名称', 400, 'CUSTOM_PROVIDER_NAME_REQUIRED');
        }

        // 创建或查找自定义服务商
        provider = await prisma.aiProvider.upsert({
          where: { name: data.customProviderName.toLowerCase().replace(/\s+/g, '-') },
          update: {},
          create: {
            name: data.customProviderName.toLowerCase().replace(/\s+/g, '-'),
            displayName: data.customProviderName,
            baseUrl: data.customApiUrl || 'https://api.openai.com/v1',
            supportedModels: [],
            isActive: true,
          },
        });
        actualProviderId = provider.id;
      } else {
        // 兼容字符串或数字：优先按ID尝试，其次按名称（不区分大小写）
        const tryFindById = async (idVal: any) => {
          const idNum = typeof idVal === 'string' ? Number(idVal) : idVal;
          if (Number.isInteger(idNum) && idNum > 0) {
            return prisma.aiProvider.findUnique({ where: { id: idNum } });
          }
          return null;
        };
        const tryFindByName = async (nameVal: any) => {
          if (typeof nameVal === 'string') {
            const name = nameVal.trim();
            if (name.includes(',')) {
              throw createError('暂不支持为单个模型选择多个服务商', 400, 'MULTIPLE_PROVIDERS_NOT_SUPPORTED');
            }
            return prisma.aiProvider.findUnique({ where: { name: name.toLowerCase() } });
          }
          return null;
        };

        // 先按ID找，找不到再按名称找
        provider = await tryFindById(normalizedProviderId);
        if (!provider) {
          provider = await tryFindByName(normalizedProviderId);
        }

        if (!provider) {
          throw createError('AI服务商不存在', 404, 'PROVIDER_NOT_FOUND');
        }
        actualProviderId = provider.id;
      }

      // 检查模型名称是否已存在（同一服务商下）
      const existingModel = await prisma.aiModel.findUnique({
        where: {
          providerId_name: {
            providerId: actualProviderId,
            name: data.name,
          },
        },
      });

      if (existingModel) {
        throw createError('该服务商下已存在同名模型', 409, 'MODEL_NAME_EXISTS');
      }

      // 加密API密钥；若未提供，则继承服务商级密钥（支持apiKey和apiKeyEncrypted两个字段名）
      let encryptedApiKey: string | null = null;
      const newApiKey = (data as any).apiKey || data.apiKeyEncrypted;
      if (newApiKey) {
        encryptedApiKey = encrypt(newApiKey);
      } else if (provider?.apiKeyEncrypted) {
        // 直接复用服务商已加密的密钥以保持一致
        encryptedApiKey = provider.apiKeyEncrypted as string;
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
          providerId: actualProviderId,
          name: data.name,
          displayName: data.displayName || data.name,
          apiKeyEncrypted: encryptedApiKey,
          customApiUrl: data.customApiUrl,
          modelType: data.modelType || 'chat',
          parameters: data.parameters || {
            temperature: 0.7,
            max_tokens: 3000,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
          },
          role: data.role || 'secondary',
          priority: data.priority || 100,
          costPer1kTokens: data.costPer1kTokens || 0,
          contextWindow: data.contextWindow || 4000,
          isActive: data.isActive !== undefined ? data.isActive : true,
          metadata: data.metadata || {},
        },
        include: {
          provider: true,
        },
      });

      // 若本次显式提供了模型密钥，则将该密钥同步到服务商级，并（可选）后续用于其他模型继承
      const providedApiKey = (data as any).apiKey || data.apiKeyEncrypted;
      if (providedApiKey && encryptedApiKey) {
        await prisma.aiProvider.update({
          where: { id: actualProviderId },
          data: { apiKeyEncrypted: encryptedApiKey } as Prisma.AiProviderUpdateInput,
        });
      }

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

      // 加密新的API密钥（支持apiKey和apiKeyEncrypted两个字段名）
      let encryptedApiKey = existingModel.apiKeyEncrypted;
      let needSyncProviderAndModels = false;
      const newApiKey = (data as any).apiKey || data.apiKeyEncrypted;
      if (newApiKey !== undefined) {
        encryptedApiKey = newApiKey ? encrypt(newApiKey) : null;
        // 仅当提供了非空的新密钥时，同步到服务商及其下所有模型
        if (newApiKey) {
          needSyncProviderAndModels = true;
        }
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

      // 准备更新数据
      const updateData: any = {
        apiKeyEncrypted: encryptedApiKey,
        parameters: data.parameters
          ? { ...(existingModel.parameters as Record<string, any> || {}), ...data.parameters }
          : existingModel.parameters,
      };

      // 只更新提供的字段
      if (data.name !== undefined) updateData.name = data.name;
      if (data.displayName !== undefined) updateData.displayName = data.displayName;
      if (data.customApiUrl !== undefined) updateData.customApiUrl = data.customApiUrl;
      if (data.modelType !== undefined) updateData.modelType = data.modelType;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.costPer1kTokens !== undefined) {
        updateData.costPer1kTokens = typeof data.costPer1kTokens === 'string'
          ? parseFloat(data.costPer1kTokens)
          : data.costPer1kTokens;
      }
      if (data.contextWindow !== undefined) updateData.contextWindow = data.contextWindow;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;

      const updatedModel = await prisma.aiModel.update({
        where: { id },
        data: updateData,
        include: {
          provider: true,
        },
      });

      // 同步：当模型更新了有效的新密钥时，将其写入服务商并更新该服务商下的所有模型，实现统一
      if (needSyncProviderAndModels && encryptedApiKey) {
        await prisma.$transaction([
          prisma.aiProvider.update({
            where: { id: existingModel.providerId },
            data: { apiKeyEncrypted: encryptedApiKey } as Prisma.AiProviderUpdateInput,
          }),
          prisma.aiModel.updateMany({
            where: { providerId: existingModel.providerId },
            data: { apiKeyEncrypted: encryptedApiKey },
          }),
        ]);
      }

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
   * 测试内容：
   * 1. API可达性 - 检查能否连接到AI服务商的API服务器
   * 2. 认证验证 - 验证配置的API密钥是否有效
   * 3. 模型可用性 - 确认指定的模型是否可以正常调用
   * 4. 响应时间 - 测量API响应速度
   */
  async testModelConnection(id: number): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
    modelId?: number;
    modelName?: string;
    providerName?: string;
  }> {
    try {
      const model = await this.getModelById(id);

      // 不在此处提前返回；即使当前对象上未携带明文密钥，也允许进入实际测试，
      // 在 performActualAPITest 中会尝试模型级明文或回退解密服务商级密钥。

      const startTime = Date.now();

      // 实际的API连接测试
      try {
        await this.performActualAPITest(model);
        const responseTime = Date.now() - startTime;

        logger.info('AI模型连接测试成功', {
          modelId: id,
          name: model.name,
          provider: (model as any)?.provider?.displayName || model.provider.name,
          responseTime,
        });

        return {
          success: true,
          message: `模型 ${model.name} 连接测试成功`,
          modelId: model.id,
          modelName: model.name,
          providerName: (model as any)?.provider?.displayName || model?.provider?.name,
          responseTime,
        };
      } catch (apiError: any) {
        const responseTime = Date.now() - startTime;

        logger.warn('AI模型连接测试失败', {
          modelId: id,
          name: model.name,
          provider: (model as any)?.provider?.displayName || model.provider.name,
          error: apiError.message,
          responseTime,
        });

        return {
          success: false,
          message: `模型 ${model.name} 连接测试失败：${apiError?.message || apiError}`,
          modelId: model.id,
          modelName: model.name,
          providerName: (model as any)?.provider?.displayName || model?.provider?.name,
          responseTime,
        };
      }
    } catch (error) {
      logger.error('AI模型连接测试异常', error);
      return {
        success: false,
        message: '连接测试失败，请检查模型配置',
      };
    }
  }

  /**
   * 执行实际的API测试
   */
  private async performActualAPITest(model: any): Promise<void> {
    const providerName = String(
      (model as any)?.provider?.providerType || (model as any)?.provider?.name || ''
    ).toLowerCase();
    let apiKey: string | null = null;
    const modelKeyRaw = (model?.apiKeyEncrypted ?? null) as string | null;
    const modelKey = typeof modelKeyRaw === 'string' ? modelKeyRaw.trim() : modelKeyRaw;
    if (modelKey) {
      apiKey = modelKey; // getModelById 已尝试解密
    }
    if (!apiKey) {
      // 运行期兜底：尝试从服务商级密钥解密
      const provEncRaw = (model as any)?.provider?.apiKeyEncrypted as string | null | undefined;
      const provEnc = typeof provEncRaw === 'string' ? provEncRaw.trim() : provEncRaw;
      if (provEnc) {
        try {
          apiKey = decrypt(provEnc) || null;
        } catch {
          // ignore decrypt error, will throw not configured below
        }
      }
    }
    if (!apiKey || String(apiKey).trim() === '') {
      throw new Error('API密钥未配置');
    }

    // 计算基础地址（模型自定义优先，其次服务商）
    const base = String((model as any)?.customApiUrl || model?.provider?.baseUrl || '');

    // 构建目标URL（OpenAI兼容：/v1/chat/completions；Anthropic：/v1/messages）
    const buildChatUrl = (prov: string, b: string) => {
      if (!b) return prov === 'deepseek' ? 'https://api.deepseek.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
      let full = b.trim();
      if (/\/v1\/chat\/completions\/?$/i.test(full) || /\/chat\/completions\/?$/i.test(full)) return full;
      if (/\/v1\/?$/i.test(full)) return `${full.replace(/\/+$/,'')}/chat/completions`;
      const slash = full.endsWith('/') ? '' : '/';
      if (prov === 'deepseek') return `${full}${slash}chat/completions`;
      return `${full}${slash}v1/chat/completions`;
    };

    const buildAnthropicUrl = (b: string) => {
      if (!b) return 'https://api.anthropic.com/v1/messages';
      let full = b.trim();
      if (/\/v1\/messages\/?$/i.test(full) || /\/messages\/?$/i.test(full)) return full;
      if (/\/v1\/?$/i.test(full)) return `${full.replace(/\/+$/,'')}/messages`;
      const slash = full.endsWith('/') ? '' : '/';
      return `${full}${slash}v1/messages`;
    };

    // 统一 12 秒超时
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      if (providerName === 'anthropic') {
        const url = buildAnthropicUrl(base);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        };
        const body = {
          model: model.name,
          max_tokens: 1,
          messages: [
            { role: 'user', content: 'ping' }
          ]
        } as any;

        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(`HTTP ${resp.status}: ${resp.statusText} ${text}`.trim());
        }
        const data: any = await resp.json().catch(() => ({} as any));
        const ok = (typeof data?.id === 'string' && data.id) || Array.isArray(data?.content);
        if (!ok) {
          throw new Error('返回格式错误');
        }
        return;
      }

      // OpenAI 兼容路径（包括 deepseek、自定义、ai-wave 等）
      const url = buildChatUrl(providerName, base);
      // 处理 gpt-5 家族：gpt-5(-minimal|-low|-medium|-high) => model=gpt-5 + reasoning.effort
      const originalModelName = String(model.name || '');
      let targetModel = originalModelName;
      let reasoningEffort: 'minimal' | 'low' | 'medium' | 'high' | undefined;
      const g5 = originalModelName.match(/^gpt-5(?:-(minimal|low|medium|high))?$/i);
      if (g5) {
        targetModel = 'gpt-5';
        if (g5[1]) reasoningEffort = g5[1].toLowerCase() as any;
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      };
      const body: any = {
        model: targetModel,
        messages: [ { role: 'user', content: 'ping' } ],
        stream: false,
        temperature: 0,
        max_tokens: 1
      };
      if (reasoningEffort) {
        body.reasoning = { effort: reasoningEffort };
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}: ${resp.statusText} ${text}`.trim());
      }
      const data: any = await resp.json().catch(() => ({} as any));
      const choicesOk = Array.isArray(data?.choices) && data.choices.length > 0;
      const idOk = typeof data?.id === 'string' && !!data.id;
      if (!(choicesOk || idOk)) {
        throw new Error('返回格式错误');
      }
      return;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 测试DeepSeek API连接
   */
  private async testDeepSeekAPI(model: any): Promise<void> {
    // 这里可以实现真实的DeepSeek API测试
    // 发送一个简单的测试请求
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));

    // 模拟API密钥验证
    if (!model.apiKeyEncrypted || model.apiKeyEncrypted.length < 10) {
      throw new Error('API密钥无效或格式错误');
    }

    // 模拟网络连接测试
    if (Math.random() < 0.05) {
      throw new Error('无法连接到DeepSeek API服务器');
    }
  }

  /**
   * 测试OpenAI API连接
   */
  private async testOpenAIAPI(model: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 150));

    if (Math.random() < 0.05) {
      throw new Error('OpenAI API配额不足或密钥无效');
    }
  }

  /**
   * 测试Anthropic API连接
   */
  private async testAnthropicAPI(model: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 120 + Math.random() * 180));

    if (Math.random() < 0.05) {
      throw new Error('Anthropic API访问被拒绝');
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
   * 获取当前活跃的主模型配置
   */
  async getActiveModel(): Promise<(AiModel & { provider: AiProvider }) | null> {
    try {
      const activeModel = await prisma.aiModel.findFirst({
        where: {
          isActive: true,
          role: 'primary',
        },
        include: {
          provider: true,
        },
        orderBy: {
          priority: 'asc', // 优先级数字越小越优先
        },
      });

      if (activeModel && activeModel.apiKeyEncrypted) {
        try {
          const decryptedKey = decrypt(activeModel.apiKeyEncrypted);
          return {
            ...activeModel,
            apiKeyEncrypted: decryptedKey,
          };
        } catch (decryptError) {
          logger.warn('主模型API密钥解密失败', { modelId: activeModel.id, error: decryptError });
          return {
            ...activeModel,
            apiKeyEncrypted: null,
          };
        }
      }

      return activeModel;
    } catch (error) {
      logger.error('获取活跃主模型失败', error);
      throw createError('获取活跃主模型失败', 500);
    }
  }

  /**
   * 获取备用模型列表（按优先级排序）
   */
  async getBackupModels(): Promise<Array<AiModel & { provider: AiProvider }>> {
    try {
      const backupModels = await prisma.aiModel.findMany({
        where: {
          isActive: true,
          role: 'secondary',
        },
        include: {
          provider: true,
        },
        orderBy: {
          priority: 'asc',
        },
      });

      // 解密API密钥
      return backupModels.map(model => {
        if (model.apiKeyEncrypted) {
          try {
            const decryptedKey = decrypt(model.apiKeyEncrypted);
            return {
              ...model,
              apiKeyEncrypted: decryptedKey,
            };
          } catch (decryptError) {
            logger.warn('备用模型API密钥解密失败', { modelId: model.id, error: decryptError });
            return {
              ...model,
              apiKeyEncrypted: null,
            };
          }
        }
        return model;
      });
    } catch (error) {
      logger.error('获取备用模型列表失败', error);
      throw createError('获取备用模型列表失败', 500);
    }
  }

  /**
   * 获取完整的AI配置（主模型 + 备用模型）
   */
  async getAIConfiguration(): Promise<{
    primary: (AiModel & { provider: AiProvider }) | null;
    backups: Array<AiModel & { provider: AiProvider }>;
    hasValidConfig: boolean;
  }> {
    try {
      const [primary, backups] = await Promise.all([
        this.getActiveModel(),
        this.getBackupModels(),
      ]);

      const hasValidConfig = !!(primary && primary.apiKeyEncrypted);

      return {
        primary,
        backups,
        hasValidConfig,
      };
    } catch (error) {
      logger.error('获取AI配置失败', error);
      throw createError('获取AI配置失败', 500);
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
 