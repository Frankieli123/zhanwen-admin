const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAIModels() {
  try {
    console.log('检查AI模型配置...\n');
    
    // 获取所有AI模型
    const models = await prisma.aiModel.findMany({
      include: {
        provider: true
      }
    });
    
    console.log(`找到 ${models.length} 个AI模型:`);
    
    models.forEach((model, index) => {
      console.log(`\n模型 ${index + 1}:`);
      console.log(`  名称: ${model.name}`);
      console.log(`  显示名称: ${model.displayName}`);
      console.log(`  角色: ${model.role}`);
      console.log(`  激活状态: ${model.isActive ? '已激活' : '未激活'}`);
      console.log(`  API密钥: ${model.apiKeyEncrypted ? '已配置' : '未配置'}`);
      console.log(`  服务商: ${model.provider?.displayName || '未知'}`);
      console.log(`  优先级: ${model.priority}`);
    });
    
    // 检查主模型
    const primaryModel = await prisma.aiModel.findFirst({
      where: {
        role: 'primary',
        isActive: true
      },
      include: {
        provider: true
      }
    });
    
    if (primaryModel) {
      console.log('\n当前主模型:');
      console.log(`  ${primaryModel.displayName} (${primaryModel.name})`);
      console.log(`  API密钥状态: ${primaryModel.apiKeyEncrypted ? '已配置' : '未配置'}`);
    } else {
      console.log('\n警告: 没有配置主模型！');
    }
    
  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAIModels();
