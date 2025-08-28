/**
 * 占卜管理系统 - 客户端 SDK 示例
 * 
 * 这个 SDK 封装了所有公开 API 接口，方便客户端调用
 */

class DivinationAPI {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'https://zwam.vryo.de/api';
    this.apiKey = options.apiKey || '';
    this.clientId = options.clientId || this.generateClientId();
    this.timeout = options.timeout || 30000;
    
    if (!this.apiKey) {
      throw new Error('API Key 是必需的');
    }
    
    console.log(`🆔 客户端ID: ${this.clientId}`);
  }

  /**
   * 生成客户端ID
   */
  generateClientId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    return `cl_${timestamp}_${random}`;
  }

  /**
   * 获取客户端ID
   */
  getClientId() {
    return this.clientId;
  }

  /**
   * 设置客户端ID
   */
  setClientId(clientId) {
    this.clientId = clientId;
    console.log(`🆔 客户端ID已更新: ${this.clientId}`);
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

  /**
   * 记录API调用日志
   * @param {Object} logData - 日志数据
   * @returns {Promise<Object>} 记录结果
   */
  async logApiCall(logData) {
    // 自动添加客户端ID
    const dataWithClientId = {
      ...logData,
      clientId: logData.clientId || this.clientId
    };
    return await this.request('POST', '/public/usage/log', dataWithClientId);
  }

  /**
   * 上报使用指标
   * @param {string} date - 日期
   * @param {string} platform - 平台类型
   * @param {Array} metrics - 指标数组
   * @returns {Promise<Object>} 上报结果
   */
  async reportMetrics(date, platform, metrics) {
    return await this.request('POST', '/public/usage/metrics', {
      date,
      platform,
      clientId: this.clientId,
      metrics
    });
  }

  /**
   * 批量上报使用数据
   * @param {Array} logs - API调用日志数组
   * @param {Array} metrics - 使用指标数组
   * @returns {Promise<Object>} 批量上报结果
   */
  async batchReport(logs = [], metrics = []) {
    // 为所有日志和指标添加客户端ID
    const logsWithClientId = logs.map(log => ({
      ...log,
      clientId: log.clientId || this.clientId
    }));
    
    const metricsWithClientId = metrics.map(metric => ({
      ...metric,
      clientId: metric.clientId || this.clientId
    }));
    
    return await this.request('POST', '/public/usage/batch', {
      logs: logsWithClientId,
      metrics: metricsWithClientId
    });
  }

  /**
   * 使用统计助手类 - 自动收集和上报数据
   */
  createUsageTracker(options = {}) {
    return new UsageTracker(this, {
      ...options,
      clientId: options.clientId || this.clientId
    });
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

    // 测试使用统计功能
    console.log('\n📊 测试使用统计功能...');
    const tracker = api.createUsageTracker({
      platform: 'web',
      userId: 'test-user-123',
      clientId: 'cl_demo_12345678',  // 演示用的客户端ID
      batchSize: 3
    });

    // 模拟API调用记录
    tracker.trackApiCall({
      modelId: 1,
      requestId: 'req-001',
      tokensUsed: 150,
      cost: 0.003,
      responseTimeMs: 1200,
      status: 'success'
    });

    tracker.trackApiCall({
      modelId: 1,
      requestId: 'req-002',
      tokensUsed: 200,
      cost: 0.004,
      responseTimeMs: 980,
      status: 'success'
    });

    // 模拟使用指标记录
    tracker.trackMetric('api_calls', 2);
    tracker.trackMetric('total_tokens', 350);
    tracker.trackMetric('total_cost', 0.007);

    // 等待一段时间让数据上报
    console.log('等待数据上报...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 手动上报剩余数据
    await tracker.flush();
    
    // 清理
    tracker.destroy();
    console.log('✅ 使用统计测试完成');

  } catch (error) {
    console.error('❌ 示例执行失败:', error.message);
  }
}

// 如果在 Node.js 环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DivinationAPI, UsageTracker };
  
  // 运行示例
  if (require.main === module) {
    example();
  }
}

/**
 * 使用统计追踪器
 */
class UsageTracker {
  constructor(api, options = {}) {
    this.api = api;
    this.platform = options.platform || 'web';
    this.userId = options.userId || null;
    this.clientId = options.clientId || api.getClientId();
    this.batchSize = options.batchSize || 10;
    this.reportInterval = options.reportInterval || 60000; // 1分钟
    
    this.logs = [];
    this.metrics = new Map();
    this.timer = null;
    
    console.log(`📊 使用追踪器已启动 - 客户端ID: ${this.clientId}`);
    this.startAutoReport();
  }

  /**
   * 记录API调用
   */
  trackApiCall(data) {
    const logEntry = {
      ...data,
      userId: data.userId || this.userId,
      clientId: data.clientId || this.clientId,
      platform: data.platform || this.platform,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(logEntry);
    
    // 达到批量大小时立即上报
    if (this.logs.length >= this.batchSize) {
      this.flushLogs();
    }
  }

  /**
   * 记录使用指标
   */
  trackMetric(name, value, metadata = {}) {
    const today = new Date().toISOString().split('T')[0];
    const key = `${today}-${this.clientId}-${name}`;
    
    if (this.metrics.has(key)) {
      this.metrics.get(key).value += value;
    } else {
      this.metrics.set(key, {
        date: today,
        name,
        value,
        clientId: this.clientId,
        metadata
      });
    }
  }

  /**
   * 立即上报所有数据
   */
  async flush() {
    await Promise.all([
      this.flushLogs(),
      this.flushMetrics()
    ]);
  }

  /**
   * 上报日志数据
   */
  async flushLogs() {
    if (this.logs.length === 0) return;
    
    try {
      const logs = [...this.logs];
      this.logs = [];
      
      await this.api.batchReport(logs, []);
      console.log(`✅ 上报 ${logs.length} 条API调用日志`);
    } catch (error) {
      console.error('❌ 上报API调用日志失败:', error.message);
      // 失败时重新加入队列
      this.logs.unshift(...logs);
    }
  }

  /**
   * 上报指标数据
   */
  async flushMetrics() {
    if (this.metrics.size === 0) return;
    
    try {
      const metrics = Array.from(this.metrics.values());
      this.metrics.clear();
      
      await this.api.batchReport([], metrics);
      console.log(`✅ 上报 ${metrics.length} 个使用指标`);
    } catch (error) {
      console.error('❌ 上报使用指标失败:', error.message);
      // 失败时重新加入队列
      metrics.forEach(metric => {
        const key = `${metric.date}-${metric.name}`;
        this.metrics.set(key, metric);
      });
    }
  }

  /**
   * 开始自动上报
   */
  startAutoReport() {
    if (this.timer) return;
    
    this.timer = setInterval(() => {
      this.flush().catch(error => {
        console.error('自动上报失败:', error.message);
      });
    }, this.reportInterval);
  }

  /**
   * 停止自动上报
   */
  stopAutoReport() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 销毁追踪器
   */
  destroy() {
    this.stopAutoReport();
    this.flush(); // 最后一次上报
  }
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  window.DivinationAPI = DivinationAPI;
  window.UsageTracker = UsageTracker;
}
