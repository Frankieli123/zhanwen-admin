import { logger } from '@/utils/logger';
import { createError } from '@/middleware/error.middleware';
import { buildGeminiModelsUrl } from '@/utils/aiApiUrl';

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  type?: string;
}

export interface FetchModelsRequest {
  provider: string;
  apiKey: string;
  apiUrl?: string;
}

export class ModelFetcherService {
  /**
   * 拉取指定供应商的模型列表
   */
  static async fetchModels(request: FetchModelsRequest): Promise<ModelInfo[]> {
    const { provider, apiKey, apiUrl } = request;

    // 验证必要参数
    if (!provider || !apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      throw new Error('供应商和API密钥不能为空');
    }

    try {
      switch (provider.toLowerCase()) {
        case 'openai':
          return await this.fetchOpenAIModels(apiKey, apiUrl);
        case 'deepseek':
          return await this.fetchDeepSeekModels(apiKey, apiUrl);
        case 'anthropic':
          return await this.fetchAnthropicModels(apiKey, apiUrl);
        case 'gemini':
          return await this.fetchGeminiModels(apiKey, apiUrl);
        case 'ai-wave':
          // AI-WAVE 为 OpenAI 兼容接口
          return await this.fetchOpenAIModels(apiKey, apiUrl);
        case 'custom':
          // 自定义服务商使用OpenAI兼容的API
          return await this.fetchOpenAIModels(apiKey, apiUrl);
        default:
          // 未知服务商也尝试使用OpenAI兼容的API
          return await this.fetchOpenAIModels(apiKey, apiUrl);
      }
    } catch (error) {
      logger.error('拉取模型列表失败', { provider, error });
      if (error instanceof Error && error.message.includes('不支持的供应商')) {
        throw error;
      }
      throw createError('拉取模型列表失败，请检查API密钥和网络连接', 500);
    }
  }

  /**
   * 拉取Open模型列表
   */
  private static async fetchOpenAIModels(apiKey: string, customApiUrl?: string): Promise<ModelInfo[]> {
    let baseUrl = customApiUrl || 'https://api.openai.com/v1';

    // 如果自定义URL不包含/v1，自动添加
    if (customApiUrl && !customApiUrl.includes('/v1')) {
      baseUrl = `${customApiUrl}/v1`;
    }

    const url = `${baseUrl}/models`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OpenAI兼容API调用失败', {
          status: response.status,
          statusText: response.statusText,
          url,
          errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const models = data.data || [];

      return models
        .filter((model: any) => model.id && !model.id.includes('whisper') && !model.id.includes('tts'))
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          type: 'chat',
        }))
        .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));
    } catch (error) {
      logger.error('拉取OpenAI模型失败', error);
      throw createError('拉取OpenAI模型失败，请检查API密钥和网络连接', 500);
    }
  }

  /**
   * 拉取DeepSeek模型列表
   */
  private static async fetchDeepSeekModels(apiKey: string, customApiUrl?: string): Promise<ModelInfo[]> {
    const baseUrl = customApiUrl || 'https://api.deepseek.com/v1';
    const url = `${baseUrl}/models`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('DeepSeek API调用失败', {
          status: response.status,
          statusText: response.statusText,
          url,
          errorText,
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as any;
      logger.info('DeepSeek API调用成功', { url, modelsCount: data.data?.length || 0 });
      const models = data.data || [];

      return models
        .filter((model: any) => model.id)
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          description: `DeepSeek ${model.id}`,
          type: 'chat',
        }))
        .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));
    } catch (error) {
      logger.error('拉取DeepSeek模型失败', error);
      throw createError('拉取DeepSeek模型失败，请检查API密钥和网络连接', 500);
    }
  }

  /**
   * 拉取Anthropic模型列表（Claude）
   */
  private static async fetchAnthropicModels(apiKey: string, customApiUrl?: string): Promise<ModelInfo[]> {
    // Anthropic没有公开的模型列表API，返回已知的模型
    const knownModels = [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'claude-3-5-sonnet-20241022',
        description: 'Claude 3.5 Sonnet (Latest)',
        contextWindow: 200000,
        type: 'chat',
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'claude-3-5-haiku-20241022',
        description: 'Claude 3.5 Haiku (Latest)',
        contextWindow: 200000,
        type: 'chat',
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'claude-3-opus-20240229',
        description: 'Claude 3 Opus',
        contextWindow: 200000,
        type: 'chat',
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'claude-3-sonnet-20240229',
        description: 'Claude 3 Sonnet',
        contextWindow: 200000,
        type: 'chat',
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'claude-3-haiku-20240307',
        description: 'Claude 3 Haiku',
        contextWindow: 200000,
        type: 'chat',
      },
    ];

    return knownModels;
  }

  /**
   * 拉取 Gemini 模型列表
   */
  private static async fetchGeminiModels(apiKey: string, customApiUrl?: string): Promise<ModelInfo[]> {
    const baseUrl = customApiUrl || 'https://generativelanguage.googleapis.com';
    const url = buildGeminiModelsUrl(baseUrl);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API调用失败', {
          status: response.status,
          statusText: response.statusText,
          url,
          errorText,
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const models = Array.isArray(data?.models) ? data.models : [];

      return models
        .filter((m: any) => m && (m.name || m.id))
        .filter((m: any) => {
          const methods = m?.supportedGenerationMethods;
          return Array.isArray(methods) ? methods.includes('generateContent') : true;
        })
        .map((m: any) => {
          const raw = String(m.name || m.id);
          const id = raw.toLowerCase().startsWith('models/') ? raw.slice('models/'.length) : raw;
          return {
            id,
            name: id,
            description: (m.displayName || m.description || undefined) as any,
            type: 'chat',
          } as ModelInfo;
        })
        .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));
    } catch (error) {
      logger.error('拉取Gemini模型失败', error);
      throw createError('拉取Gemini模型失败，请检查API密钥和网络连接', 500);
    }
  }

  /**
   * 测试API连接
   */
  static async testConnection(request: FetchModelsRequest): Promise<boolean> {
    try {
      // 验证参数
      if (!request.apiKey || typeof request.apiKey !== 'string' || request.apiKey.trim() === '') {
        logger.error('测试连接失败：API Key 为空');
        return false;
      }

      const models = await this.fetchModels(request);
      const isConnected = models.length > 0;

      logger.info('API连接测试结果', {
        provider: request.provider,
        connected: isConnected,
        modelCount: models.length
      });

      return isConnected;
    } catch (error) {
      logger.error('API连接测试失败', {
        provider: request.provider,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}
