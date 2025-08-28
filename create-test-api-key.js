require('dotenv').config({ path: './backend/.env' });
const { PrismaClient } = require('@prisma/client');

async function createTestApiKey() {
  const prisma = new PrismaClient();
  
  try {
    // 检查是否已存在测试API Key
    const existingKey = await prisma.apiKey.findUnique({
      where: { key: 'test-api-key-12345' }
    });
    
    if (existingKey) {
      console.log('✅ 测试API Key已存在:', existingKey);
      return;
    }
    
    // 创建测试API Key
    const apiKey = await prisma.apiKey.create({
      data: {
        name: '测试API Key',
        key: 'test-api-key-12345',
        permissions: [
          'configs:read',
          'ai_models:read', 
          'prompts:read',
          'hexagrams:read',
          'usage:write'
        ],
        isActive: true,
        description: '用于测试的API Key'
      }
    });
    
    console.log('✅ 测试API Key创建成功:', apiKey);
    
  } catch (error) {
    console.error('❌ 创建测试API Key失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestApiKey();
