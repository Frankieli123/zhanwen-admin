/**
 * 占卜管理系统 - 客户端 SDK 示例
 * 
 * 这个 SDK 封装了所有公开 API 接口，方便客户端调用
 */

class DivinationAPI {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'https://zwam.vryo.de/api';
    this.apiKey = options.apiKey || '';
    this.timeout = options.timeout || 30000;
    
    if (!this.apiKey) {
      throw new Error('API Key 是必需的');
    }
  }

  /**
   * 发送 HTTP 请求的通用方法
   */
  async request(method, url, data = null, params = {}) {
    const config = {
      method,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    };

    // 构建完整 URL
    const fullURL = new URL(url, this.baseURL);
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        fullURL.searchParams.append(key, params[key]);
      }
    });

    // 添加请求体
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(fullURL.toString(), config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API 请求失败:', error);
      throw error;
    }
  }

  /**
   * 获取平台配置
   * @param {string} platform - 平台类型 (web, ios, android, wechat)
   * @param {string} category - 配置分类 (可选)
   * @returns {Promise<Object>} 配置数据
   */
  async getConfigs(platform, category = null) {
    const params = category ? { category } : {};
    return await this.request('GET', `/public/configs/${platform}`, null, params);
  }

  /**
   * 获取特定配置项
   * @param {string} platform - 平台类型
   * @param {string} key - 配置键名
   * @returns {Promise<string|null>} 配置值
   */
  async getConfigValue(platform, key) {
    const response = await this.getConfigs(platform);
    const config = response.data.find(item => item.configKey === key);
    return config ? config.configValue : null;
  }

  /**
   * 获取所有活跃的 AI 模型
   * @returns {Promise<Object>} AI 模型列表
   */
  async getActiveAIModels() {
    return await this.request('GET', '/public/ai-models/active');
  }

  /**
   * 获取主要 AI 模型
   * @returns {Promise<Object>} 主要 AI 模型
   */
  async getPrimaryAIModel() {
    return await this.request('GET', '/public/ai-models/primary');
  }

  /**
   * 获取活跃的提示词模板
   * @param {string} type - 模板类型 (可选)
   * @returns {Promise<Object>} 提示词模板列表
   */
  async getActivePrompts(type = null) {
    const params = type ? { type } : {};
    return await this.request('GET', '/public/prompts/active', null, params);
  }

  /**
   * 获取特定类型的提示词模板
   * @param {string} type - 模板类型
   * @param {string} name - 模板名称 (可选)
   * @returns {Promise<Object|null>} 提示词模板
   */
  async getPromptTemplate(type, name = null) {
    const response = await this.getActivePrompts(type);
    if (name) {
      const template = response.data.find(item => item.name === name);
      return template || null;
    }
    return response.data[0] || null; // 返回第一个模板
  }

  /**
   * 批量获取应用初始化数据
   * @param {string} platform - 平台类型
   * @returns {Promise<Object>} 包含配置、AI模型、提示词的完整数据
   */
  async getAppInitData(platform) {
    try {
      const [configs, aiModels, prompts] = await Promise.all([
        this.getConfigs(platform),
        this.getActiveAIModels(),
        this.getActivePrompts()
      ]);

      return {
        success: true,
        data: {
          configs: configs.data,
          aiModels: aiModels.data,
          prompts: prompts.data,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 健康检查 - 验证 API Key 是否有效
   * @returns {Promise<boolean>} API Key 是否有效
   */
  async healthCheck() {
    try {
      await this.getConfigs('web');
      return true;
    } catch (error) {
      console.warn('API Key 健康检查失败:', error.message);
      return false;
    }
  }
}

// 使用示例
async function example() {
  // 初始化 SDK
  const api = new DivinationAPI({
    apiKey: 'zw_live_ed2257f4b4184d0f6960c6d0a006d26e'
  });

  try {
    // 健康检查
    console.log('🔍 检查 API Key 有效性...');
    const isHealthy = await api.healthCheck();
    console.log('API Key 状态:', isHealthy ? '✅ 有效' : '❌ 无效');

    if (!isHealthy) {
      throw new Error('API Key 无效，请检查配置');
    }

    // 获取 Web 平台配置
    console.log('\n📋 获取 Web 平台配置...');
    const webConfigs = await api.getConfigs('web');
    console.log('配置数量:', webConfigs.data.length);
    webConfigs.data.forEach(config => {
      console.log(`- ${config.configKey}: ${config.configValue}`);
    });

    // 获取特定配置值
    console.log('\n🔧 获取应用名称...');
    const appName = await api.getConfigValue('web', 'app_name');
    console.log('应用名称:', appName);

    // 获取 AI 模型
    console.log('\n🤖 获取 AI 模型...');
    const aiModels = await api.getActiveAIModels();
    console.log('AI 模型数量:', aiModels.data.length);
    aiModels.data.forEach(model => {
      console.log(`- ${model.displayName} (${model.name})`);
    });

    // 获取主要 AI 模型
    console.log('\n⭐ 获取主要 AI 模型...');
    const primaryModel = await api.getPrimaryAIModel();
    console.log('主要模型:', primaryModel.data.displayName);

    // 获取提示词模板
    console.log('\n💡 获取提示词模板...');
    const prompts = await api.getActivePrompts();
    console.log('提示词模板数量:', prompts.data.length);
    prompts.data.forEach(prompt => {
      console.log(`- ${prompt.name} (${prompt.type})`);
    });

    // 批量获取初始化数据
    console.log('\n🚀 获取应用初始化数据...');
    const initData = await api.getAppInitData('web');
    if (initData.success) {
      console.log('初始化数据获取成功');
      console.log('- 配置项:', initData.data.configs.length, '个');
      console.log('- AI 模型:', initData.data.aiModels.length, '个');
      console.log('- 提示词模板:', initData.data.prompts.length, '个');
    }

  } catch (error) {
    console.error('❌ 示例执行失败:', error.message);
  }
}

// 如果在 Node.js 环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DivinationAPI;
  
  // 运行示例
  if (require.main === module) {
    example();
  }
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  window.DivinationAPI = DivinationAPI;
}
