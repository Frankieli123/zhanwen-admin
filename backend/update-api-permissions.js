const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateApiPermissions() {
  try {
    console.log('更新API Key权限配置...\n');
    
    // 获取所有API Key
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        isActive: true,
      }
    });

    console.log(`找到 ${apiKeys.length} 个活跃的API Key\n`);

    for (const apiKey of apiKeys) {
      // 检查是否已有usage:write权限
      if (!apiKey.permissions.includes('usage:write')) {
        const updatedPermissions = [...apiKey.permissions, 'usage:write'];
        
        await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: {
            permissions: updatedPermissions
          }
        });

        console.log(`✅ 已为API Key "${apiKey.name}" 添加 usage:write 权限`);
        console.log(`   权限列表: ${updatedPermissions.join(', ')}`);
      } else {
        console.log(`✓ API Key "${apiKey.name}" 已有 usage:write 权限`);
      }
    }

    console.log('\n权限更新完成！');

  } catch (error) {
    console.error('更新权限失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateApiPermissions();
