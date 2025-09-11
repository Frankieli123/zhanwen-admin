require('ts-node/register');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function createAdmin() {
  try {
    console.log('创建管理员账号...');
    
    // 生成密码哈希
    const passwordHash = await bcrypt.hash('a3865373', 10);
    
    // 创建管理员用户
    const adminUser = await prisma.adminUser.upsert({
      where: { username: 'a3180623' },
      update: {
        passwordHash: passwordHash,
        isActive: true,
        role: 'super_admin',
        permissions: [
          'ai_models:read', 'ai_models:create', 'ai_models:update', 'ai_models:delete',
          'prompts:read', 'prompts:create', 'prompts:update', 'prompts:delete',
          'configs:read', 'configs:create', 'configs:update', 'configs:delete',
          'hexagrams:read', 'hexagrams:create', 'hexagrams:update', 'hexagrams:delete',
          'analytics:read', 'users:read', 'users:create', 'users:update', 'users:delete',
          'api_keys:read', 'api_keys:create', 'api_keys:update', 'api_keys:delete'
        ],
      },
      create: {
        username: 'a3180623',
        email: 'a3180623@admin.com',
        passwordHash: passwordHash,
        fullName: '系统管理员',
        role: 'super_admin',
        permissions: [
          'ai_models:read', 'ai_models:create', 'ai_models:update', 'ai_models:delete',
          'prompts:read', 'prompts:create', 'prompts:update', 'prompts:delete',
          'configs:read', 'configs:create', 'configs:update', 'configs:delete',
          'hexagrams:read', 'hexagrams:create', 'hexagrams:update', 'hexagrams:delete',
          'analytics:read', 'users:read', 'users:create', 'users:update', 'users:delete',
          'api_keys:read', 'api_keys:create', 'api_keys:update', 'api_keys:delete'
        ],
        isActive: true,
      },
    });

    console.log('✅ 管理员账号创建/更新成功:');
    console.log('   用户名: a3180623');
    console.log('   密码: a3865373');
    console.log('   邮箱: a3180623@admin.com');
    console.log('   角色: super_admin');

  } catch (error) {
    console.error('❌ 创建管理员账号失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
