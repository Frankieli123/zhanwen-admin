// 简单的API测试
const https = require('https');
const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  try {
    // 测试健康检查
    console.log('测试健康检查...');
    const health = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    });
    console.log('健康检查结果:', health);

    // 测试API日志上报
    console.log('\n测试API日志上报...');
    const logData = {
      modelId: 1,
      requestId: `test_${Date.now()}`,
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
        timezone: "Asia/Shanghai"
      }
    };

    const logResult = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/public/usage/log',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key-12345'
      }
    }, logData);
    console.log('API日志上报结果:', logResult);

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

test();
