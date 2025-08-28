const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestApiKey() {
  try {
    console.log('初始化数据库...');
    
    // 1. 创建管理员用户
    const adminPasswordHash = await bcrypt.hash('admin123456', 10);
    const adminUser = await prisma.adminUser.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@divination.com',
        passwordHash: adminPasswordHash,
        fullName: '系统管理员',
        role: 'super_admin',
        permissions: [
          'ai_models:read', 'ai_models:create', 'ai_models:update', 'ai_models:delete',
          'prompts:read', 'prompts:create', 'prompts:update', 'prompts:delete',
          'configs:read', 'configs:create', 'configs:update', 'configs:delete',
          'api_keys:read', 'api_keys:create', 'api_keys:update', 'api_keys:delete'
        ],
        isActive: true,
      },
    });
    console.log('✅ 创建管理员用户:', adminUser.username);
    
    // 2. 创建测试API密钥
    const apiKey = 'zw_live_6d917c603d06d2a85b3ce4ff9b9c79f9';
    
    const existing = await prisma.apiKey.findFirst({
      where: { key: apiKey }
    });
    
    if (existing) {
      console.log('API密钥已存在，更新权限...');
      const updated = await prisma.apiKey.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          permissions: ['usage:write', 'usage:read'],
          expiresAt: null
        }
      });
      console.log('✅ 更新成功:', updated.name);
    } else {
      console.log('创建新的API密钥...');
      const created = await prisma.apiKey.create({
        data: {
          name: '测试API密钥',
          key: apiKey,
          permissions: ['usage:write', 'usage:read'],
          isActive: true,
          description: '用于测试的API密钥',
          expiresAt: null
        }
      });
      console.log('✅ 创建成功:', created.name);
    }
    
  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestApiKey();
