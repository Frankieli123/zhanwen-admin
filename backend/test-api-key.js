const axios = require('axios');

// 测试 API Key 功能
async function testApiKey() {
  const baseURL = 'http://localhost:3001/api';
  const apiKey = 'zw_live_ed2257f4b4184d0f6960c6d0a006d26e';

  console.log('🔑 测试 API Key 功能...');
  console.log('API Key:', apiKey);
  console.log('Base URL:', baseURL);
  console.log('');

  // 测试配置接口
  try {
    console.log('📋 测试获取配置接口...');
    const configResponse = await axios.get(`${baseURL}/public/configs/web`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 配置接口测试成功');
    console.log('响应数据:', JSON.stringify(configResponse.data, null, 2));
  } catch (error) {
    console.log('❌ 配置接口测试失败');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('错误信息:', error.response.data);
    } else {
      console.log('网络错误:', error.message);
    }
  }

  console.log('');

  // 测试 AI 模型接口
  try {
    console.log('🤖 测试获取 AI 模型接口...');
    const aiResponse = await axios.get(`${baseURL}/public/ai-models/active`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ AI 模型接口测试成功');
    console.log('响应数据:', JSON.stringify(aiResponse.data, null, 2));
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

  // 测试提示词接口
  try {
    console.log('💡 测试获取提示词接口...');
    const promptResponse = await axios.get(`${baseURL}/public/prompts/active`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 提示词接口测试成功');
    console.log('响应数据:', JSON.stringify(promptResponse.data, null, 2));
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

  // 测试无效 API Key
  try {
    console.log('🚫 测试无效 API Key...');
    const invalidResponse = await axios.get(`${baseURL}/public/configs/web`, {
      headers: {
        'X-API-Key': 'invalid-key',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('❌ 应该返回 401 错误，但请求成功了');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ 无效 API Key 正确返回 401 错误');
      console.log('错误信息:', error.response.data);
    } else {
      console.log('❌ 无效 API Key 测试失败');
      console.log('错误:', error.message);
    }
  }

  console.log('');
  console.log('🎉 API Key 功能测试完成');
}

// 运行测试
testApiKey().catch(console.error);
