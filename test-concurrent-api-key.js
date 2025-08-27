const axios = require('axios');

/**
 * 测试多个客户端同时使用同一个 API KEY 的并发情况
 */
async function testConcurrentApiKeyUsage() {
  const baseURL = 'https://zwam.vryo.de/api';
  const apiKey = 'zw_live_ed2257f4b4184d0f6960c6d0a006d26e';
  
  console.log('🚀 开始并发 API KEY 测试...');
  console.log('API Key:', apiKey);
  console.log('Base URL:', baseURL);
  console.log('');

  // 测试配置
  const CONCURRENT_REQUESTS = 50; // 并发请求数
  const TOTAL_BATCHES = 3; // 批次数
  
  console.log(`📊 测试配置:`);
  console.log(`- 并发请求数: ${CONCURRENT_REQUESTS}`);
  console.log(`- 批次数: ${TOTAL_BATCHES}`);
  console.log(`- 总请求数: ${CONCURRENT_REQUESTS * TOTAL_BATCHES}`);
  console.log('');

  // 创建请求函数
  const makeRequest = async (requestId, endpoint) => {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${baseURL}${endpoint}`, {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const duration = Date.now() - startTime;
      return {
        requestId,
        endpoint,
        success: true,
        status: response.status,
        duration,
        dataLength: response.data.data?.length || 0
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        requestId,
        endpoint,
        success: false,
        status: error.response?.status || 0,
        error: error.response?.data?.message || error.message,
        duration
      };
    }
  };

  // 测试不同的接口
  const endpoints = [
    '/public/configs/web',
    '/public/ai-models/active',
    '/public/ai-models/primary',
    '/public/prompts/active',
    '/public/hexagrams/all'
  ];

  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  const results = [];

  // 执行批次测试
  for (let batch = 1; batch <= TOTAL_BATCHES; batch++) {
    console.log(`🔄 执行第 ${batch} 批次测试...`);
    
    const batchStartTime = Date.now();
    const promises = [];

    // 创建并发请求
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      const endpoint = endpoints[i % endpoints.length];
      const requestId = `batch${batch}-req${i + 1}`;
      promises.push(makeRequest(requestId, endpoint));
      totalRequests++;
    }

    // 等待所有请求完成
    const batchResults = await Promise.all(promises);
    const batchDuration = Date.now() - batchStartTime;
    
    // 统计结果
    const batchSuccessful = batchResults.filter(r => r.success).length;
    const batchFailed = batchResults.filter(r => !r.success).length;
    
    successfulRequests += batchSuccessful;
    failedRequests += batchFailed;
    results.push(...batchResults);

    console.log(`✅ 第 ${batch} 批次完成:`);
    console.log(`   - 成功: ${batchSuccessful}/${CONCURRENT_REQUESTS}`);
    console.log(`   - 失败: ${batchFailed}/${CONCURRENT_REQUESTS}`);
    console.log(`   - 耗时: ${batchDuration}ms`);
    console.log(`   - 平均响应时间: ${Math.round(batchResults.reduce((sum, r) => sum + r.duration, 0) / batchResults.length)}ms`);
    console.log('');

    // 批次间稍作停顿
    if (batch < TOTAL_BATCHES) {
      console.log('⏳ 等待 2 秒后继续下一批次...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 最终统计
  console.log('📈 最终测试结果:');
  console.log('================');
  console.log(`总请求数: ${totalRequests}`);
  console.log(`成功请求: ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(1)}%)`);
  console.log(`失败请求: ${failedRequests} (${((failedRequests / totalRequests) * 100).toFixed(1)}%)`);
  
  if (successfulRequests > 0) {
    const successfulResults = results.filter(r => r.success);
    const avgResponseTime = Math.round(successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length);
    const minResponseTime = Math.min(...successfulResults.map(r => r.duration));
    const maxResponseTime = Math.max(...successfulResults.map(r => r.duration));
    
    console.log(`平均响应时间: ${avgResponseTime}ms`);
    console.log(`最快响应时间: ${minResponseTime}ms`);
    console.log(`最慢响应时间: ${maxResponseTime}ms`);
  }

  // 错误分析
  if (failedRequests > 0) {
    console.log('');
    console.log('❌ 错误分析:');
    const errorTypes = {};
    results.filter(r => !r.success).forEach(r => {
      const errorKey = `${r.status}: ${r.error}`;
      errorTypes[errorKey] = (errorTypes[errorKey] || 0) + 1;
    });
    
    Object.entries(errorTypes).forEach(([error, count]) => {
      console.log(`   - ${error}: ${count} 次`);
    });
  }

  // 接口性能分析
  console.log('');
  console.log('📊 接口性能分析:');
  endpoints.forEach(endpoint => {
    const endpointResults = results.filter(r => r.endpoint === endpoint && r.success);
    if (endpointResults.length > 0) {
      const avgTime = Math.round(endpointResults.reduce((sum, r) => sum + r.duration, 0) / endpointResults.length);
      const successRate = ((endpointResults.length / results.filter(r => r.endpoint === endpoint).length) * 100).toFixed(1);
      console.log(`   ${endpoint}: ${avgTime}ms 平均响应, ${successRate}% 成功率`);
    }
  });

  console.log('');
  console.log('🎉 并发测试完成!');
  
  // 结论
  if (successfulRequests / totalRequests >= 0.95) {
    console.log('✅ 结论: API KEY 并发处理良好，成功率 >= 95%');
  } else if (successfulRequests / totalRequests >= 0.90) {
    console.log('⚠️  结论: API KEY 并发处理基本正常，成功率 >= 90%');
  } else {
    console.log('❌ 结论: API KEY 并发处理存在问题，成功率 < 90%');
  }
}

// 运行测试
testConcurrentApiKeyUsage().catch(console.error);
