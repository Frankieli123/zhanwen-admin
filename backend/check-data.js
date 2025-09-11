const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('🔍 检查数据库数据...\n');
    
    // 检查管理员用户
    const adminUsers = await prisma.adminUser.findMany();
    console.log(`👥 管理员用户: ${adminUsers.length} 条记录`);
    adminUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.fullName}) - ${user.role}`);
    });
    
    // 检查AI模型
    const aiModels = await prisma.aiModel.findMany();
    console.log(`\n🤖 AI模型: ${aiModels.length} 条记录`);
    aiModels.forEach(model => {
      console.log(`  - ${model.name} (${model.displayName}) - ${model.status}`);
    });
    
    // 检查AI服务商
    const aiProviders = await prisma.aiProvider.findMany();
    console.log(`\n🏢 AI服务商: ${aiProviders.length} 条记录`);
    aiProviders.forEach(provider => {
      console.log(`  - ${provider.name} (${provider.displayName}) - ${provider.status}`);
    });
    
    // 检查提示词模板
    const promptTemplates = await prisma.promptTemplate.findMany();
    console.log(`\n📝 提示词模板: ${promptTemplates.length} 条记录`);
    promptTemplates.forEach(template => {
      console.log(`  - ${template.name} (${template.category}) - ${template.status}`);
    });
    
    // 检查应用配置
    const appConfigs = await prisma.appConfig.findMany();
    console.log(`\n⚙️ 应用配置: ${appConfigs.length} 条记录`);
    appConfigs.forEach(config => {
      console.log(`  - ${config.key} = ${config.value}`);
    });
    
  } catch (error) {
    console.error('❌ 数据库查询错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
