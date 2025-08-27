import { aiModelsAPI } from '../utils/api';

// AI配置接口定义
export interface AIModelConfig {
  id: number;
  name: string;
  displayName: string;
  apiKeyEncrypted: string | null;
  modelType: string;
  parameters: {
    temperature: number;
    max_tokens: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
    stream?: boolean;
  };
  role: 'primary' | 'secondary' | 'disabled';
  priority: number;
  costPer1kTokens: number;
  contextWindow: number;
  isActive: boolean;
  provider: {
    id: number;
    name: string;
    displayName: string;
    baseUrl: string;
    apiUrl?: string;
    supportedModels: string[];
  };
}

export interface AIConfiguration {
  primary: AIModelConfig | null;
  backups: AIModelConfig[];
  hasValidConfig: boolean;
}

// AI配置缓存
class AIConfigCache {
  private cache: AIConfiguration | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  isValid(): boolean {
    return this.cache !== null && (Date.now() - this.lastFetch) < this.CACHE_DURATION;
  }

  get(): AIConfiguration | null {
    return this.isValid() ? this.cache : null;
  }

  set(config: AIConfiguration): void {
    this.cache = config;
    this.lastFetch = Date.now();
  }

  clear(): void {
    this.cache = null;
    this.lastFetch = 0;
  }
}

const configCache = new AIConfigCache();

/**
 * AI配置服务
 */
export class AIConfigService {
  /**
   * 获取当前活跃的AI配置
   */
  static async getActiveConfiguration(useCache: boolean = true): Promise<AIConfiguration> {
    try {
      // 检查缓存
      if (useCache) {
        const cached = configCache.get();
        if (cached) {
          console.log('AIConfigService: 使用缓存的配置');
          return cached;
        }
      }

      console.log('AIConfigService: 从服务器获取配置');
      const response = await aiModelsAPI.getActiveConfiguration();
      
      if (response.success && response.data) {
        const config: AIConfiguration = response.data;
        configCache.set(config);
        return config;
      } else {
        throw new Error(response.message || '获取AI配置失败');
      }
    } catch (error) {
      console.error('AIConfigService: 获取AI配置失败', error);
      throw error;
    }
  }

  /**
   * 获取当前主模型
   */
  static async getPrimaryModel(): Promise<AIModelConfig | null> {
    try {
      const response = await aiModelsAPI.getPrimaryModel();
      
      if (response.success && response.data) {
        return response.data;
      } else if (response.status === 404) {
        return null;
      } else {
        throw new Error(response.message || '获取主模型失败');
      }
    } catch (error) {
      console.error('AIConfigService: 获取主模型失败', error);
      throw error;
    }
  }

  /**
   * 获取用于API调用的配置
   */
  static async getAPIConfig(): Promise<{
    apiUrl: string;
    apiKey: string;
    model: string;
    parameters: any;
  } | null> {
    try {
      const config = await this.getActiveConfiguration();
      
      if (!config.hasValidConfig || !config.primary) {
        console.warn('AIConfigService: 没有有效的AI配置');
        return null;
      }

      const primary = config.primary;
      
      return {
        apiUrl: primary.provider.apiUrl || primary.provider.baseUrl,
        apiKey: primary.apiKeyEncrypted || '',
        model: primary.name,
        parameters: primary.parameters,
      };
    } catch (error) {
      console.error('AIConfigService: 获取API配置失败', error);
      return null;
    }
  }

  /**
   * 清除配置缓存
   */
  static clearCache(): void {
    configCache.clear();
    console.log('AIConfigService: 配置缓存已清除');
    
    // 触发缓存清除事件，通知其他组件
    window.dispatchEvent(new CustomEvent('ai-config-cache-cleared'));
  }

  /**
   * 强制刷新配置（忽略缓存）
   */
  static async forceRefresh(): Promise<AIConfiguration> {
    configCache.clear();
    return this.getActiveConfiguration(false);
  }

  /**
   * 检查配置是否有效
   */
  static async validateConfiguration(): Promise<boolean> {
    try {
      const config = await this.getActiveConfiguration(false); // 不使用缓存
      return config.hasValidConfig;
    } catch (error) {
      console.error('AIConfigService: 配置验证失败', error);
      return false;
    }
  }

  /**
   * 获取模型选择策略（主模型 + 备用模型）
   */
  static async getModelSelectionStrategy(): Promise<{
    models: AIModelConfig[];
    strategy: 'priority' | 'fallback';
  }> {
    try {
      const config = await this.getActiveConfiguration();
      const models: AIModelConfig[] = [];
      
      if (config.primary) {
        models.push(config.primary);
      }
      
      // 按优先级排序备用模型
      const sortedBackups = config.backups.sort((a, b) => a.priority - b.priority);
      models.push(...sortedBackups);
      
      return {
        models: models.filter(model => model.apiKeyEncrypted), // 只返回有API密钥的模型
        strategy: models.length > 1 ? 'fallback' : 'priority',
      };
    } catch (error) {
      console.error('AIConfigService: 获取模型选择策略失败', error);
      return { models: [], strategy: 'priority' };
    }
  }
}

// 导出默认实例
export default AIConfigService;
