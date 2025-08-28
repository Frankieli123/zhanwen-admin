const axios = require('axios');

async function testAPI() {
  try {
    // 测试健康检查
    console.log('测试健康检查...');
    const healthRes = await axios.get('http://localhost:3001/health');
    console.log('✅ 健康检查:', healthRes.data);

    // 测试API日志上报
    console.log('\n测试API日志上报...');
    const logData = {
      modelId: 1,
      requestId: `test_req_${Date.now()}`,
      tokensUsed: 100,
      cost: 0.002,
      responseTimeMs: 800,
      status: "success",
      userId: "test-user",
      platform: "web",
      clientId: "test-client-001",
      sessionId: "test-session-001",
      timestamp: new Date().toISOString(),
      metadata: { test: true },
      clientInfo: {
        platform: "web",
        userAgent: "Test Agent",
        language: "zh-CN",
        timezone: "Asia/Shanghai",
        screen: { width: 1920, height: 1080 },
        deviceMemory: 8,
        hardwareConcurrency: 4,
        appVersion: "1.0.0"
      }
    };

    const logRes = await axios.post('http://localhost:3001/public/usage/log', logData, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key-12345'
      }
    });
    console.log('✅ API日志上报:', logRes.data);

    // 测试指标上报
    console.log('\n测试指标上报...');
    const metricsData = {
      date: new Date().toISOString().split('T')[0],
      platform: "web",
      clientId: "test-client-001",
      metrics: [{
        name: "api_calls",
        value: 1,
        metadata: {
          clientId: "test-client-001",
          sessionId: "test-session-001",
          userId: "test-user"
        },
        clientInfo: logData.clientInfo
      }]
    };

    const metricsRes = await axios.post('http://localhost:3001/public/usage/metrics', metricsData, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key-12345'
      }
    });
    console.log('✅ 指标上报:', metricsRes.data);

    // 测试批量上报
    console.log('\n测试批量上报...');
    const batchData = {
      logs: [logData],
      metrics: [{
        date: new Date().toISOString().split('T')[0],
        name: "batch_test",
        value: 1,
        metadata: {
          clientId: "test-client-001",
          sessionId: "test-session-001"
        },
        clientInfo: logData.clientInfo
      }]
    };

    const batchRes = await axios.post('http://localhost:3001/public/usage/batch', batchData, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key-12345'
      }
    });
    console.log('✅ 批量上报:', batchRes.data);

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testAPI();
