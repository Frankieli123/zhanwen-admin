const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkApiKey() {
  try {
    console.log('检查API密钥...');
    
    const apiKey = 'zw_live_6d917c603d06d2a85b3ce4ff9b9c79f9';
    
    const result = await prisma.apiKey.findFirst({
      where: {
        key: apiKey,
        isActive: true
      }
    });
    
    if (result) {
      console.log('找到API密钥:', {
        id: result.id,
        name: result.name,
        permissions: result.permissions,
        isActive: result.isActive,
        expiresAt: result.expiresAt
      });
    } else {
      console.log('未找到API密钥');
      
      // 查看所有API密钥
      const allKeys = await prisma.apiKey.findMany({
        select: {
          id: true,
          name: true,
          key: true,
          isActive: true,
          permissions: true
        }
      });
      console.log('数据库中的所有API密钥:', allKeys);
    }
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApiKey();
