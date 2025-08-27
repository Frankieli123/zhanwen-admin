const axios = require('axios');

async function testApiKeyFix() {
  const baseURL = 'https://zwam.vryo.de/api';
  const apiKey = 'zw_live_ed2257f4b4184d0f6960c6d0a006d26e';

  console.log('🔧 测试 API KEY 修复...');
  console.log('API Key:', apiKey);
  console.log('Base URL:', baseURL);
  console.log('');

  // 测试配置接口
  try {
    console.log('📋 测试获取配置接口...');
    const response = await axios.get(`${baseURL}/public/configs/web`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ 配置接口测试成功');
    console.log('状态码:', response.status);
    console.log('数据条数:', response.data.data?.length || 0);
    if (response.data.data && response.data.data.length > 0) {
      console.log('示例配置:', response.data.data[0]);
    }
  } catch (error) {
    console.log('❌ 配置接口测试失败');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('错误信息:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('连接被拒绝 - 服务器可能未启动');
    } else {
      console.log('网络错误:', error.message);
    }
  }

  console.log('');

  // 测试 AI 模型接口
  try {
    console.log('🤖 测试获取 AI 模型接口...');
    const response = await axios.get(`${baseURL}/public/ai-models/active`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ AI 模型接口测试成功');
    console.log('状态码:', response.status);
    console.log('模型数量:', response.data.data?.length || 0);
  } catch (error) {
    console.log('❌ AI 模型接口测试失败');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('错误信息:', error.response.data);
    } else {
      console.log('网络错误:', error.message);
    }
  }

  console.log('');

  // 测试主要 AI 模型接口
  try {
    console.log('⭐ 测试获取主要 AI 模型接口...');
    const response = await axios.get(`${baseURL}/public/ai-models/primary`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ 主要 AI 模型接口测试成功');
    console.log('状态码:', response.status);
    console.log('主要模型:', response.data.data?.displayName || '未找到');
  } catch (error) {
    console.log('❌ 主要 AI 模型接口测试失败');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('错误信息:', error.response.data);
    } else {
      console.log('网络错误:', error.message);
    }
  }

  console.log('');

  // 测试提示词接口
  try {
    console.log('💡 测试获取提示词接口...');
    const response = await axios.get(`${baseURL}/public/prompts/active`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ 提示词接口测试成功');
    console.log('状态码:', response.status);
    console.log('提示词数量:', response.data.data?.length || 0);
  } catch (error) {
    console.log('❌ 提示词接口测试失败');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('错误信息:', error.response.data);
    } else {
      console.log('网络错误:', error.message);
    }
  }

  console.log('');
  console.log('🎉 API KEY 修复测试完成');
}

// 运行测试
testApiKeyFix().catch(console.error);
