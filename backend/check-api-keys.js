const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkApiKeys() {
  try {
    console.log('检查数据库中的AI模型API密钥配置...\n');
    
    const models = await prisma.aiModel.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        apiKeyEncrypted: true,
        role: true,
        provider: {
          select: {
            name: true,
            displayName: true,
          }
        }
      }
    });

    console.log(`找到 ${models.length} 个活跃的AI模型:\n`);
    
    models.forEach(model => {
      console.log(`模型ID: ${model.id}`);
      console.log(`名称: ${model.name}`);
      console.log(`显示名称: ${model.displayName}`);
      console.log(`角色: ${model.role}`);
      console.log(`服务商: ${model.provider.displayName}`);
      console.log(`API密钥: ${model.apiKeyEncrypted ? '已配置 (长度: ' + model.apiKeyEncrypted.length + ')' : '未配置'}`);
      if (model.apiKeyEncrypted) {
        console.log(`API密钥前缀: ${model.apiKeyEncrypted.substring(0, 10)}...`);
      }
      console.log('---');
    });

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApiKeys();
