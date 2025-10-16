/**
 * 快速更新 DeepSeek API 密钥脚本
 * 使用方法: node update-deepseek-key.js
 */

const { PrismaClient } = require('@prisma/client');
const CryptoJS = require('crypto-js');

const prisma = new PrismaClient();

// 从环境变量读取加密密钥
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'divination-admin-32-char-key-2024';

// 新的 DeepSeek API 密钥
const NEW_DEEPSEEK_KEY = 'sk-23f1735fc612481cba6bce1551d1d138';

// 加密函数
function encrypt(text) {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    throw new Error('加密失败: ' + error.message);
  }
}

async function updateDeepSeekKey() {
  try {
    console.log('🔄 开始更新 DeepSeek API 密钥...');
    console.log('📝 新密钥:', NEW_DEEPSEEK_KEY);
    
    // 1. 加密新密钥
    const encryptedKey = encrypt(NEW_DEEPSEEK_KEY);
    console.log('✅ 密钥加密完成');
    
    // 2. 查找 DeepSeek 服务商
    const deepseekProvider = await prisma.aiProvider.findFirst({
      where: {
        name: {
          equals: 'deepseek',
          mode: 'insensitive'
        }
      }
    });
    
    if (!deepseekProvider) {
      console.error('❌ 未找到 DeepSeek 服务商');
      return;
    }
    
    console.log('✅ 找到 DeepSeek 服务商 (ID:', deepseekProvider.id, ')');
    
    // 3. 更新服务商密钥
    await prisma.aiProvider.update({
      where: { id: deepseekProvider.id },
      data: { apiKeyEncrypted: encryptedKey }
    });
    console.log('✅ DeepSeek 服务商密钥已更新');
    
    // 4. 更新该服务商下所有模型的密钥
    const result = await prisma.aiModel.updateMany({
      where: { providerId: deepseekProvider.id },
      data: { apiKeyEncrypted: encryptedKey }
    });
    console.log(`✅ 已更新 ${result.count} 个 DeepSeek 模型的密钥`);
    
    console.log('🎉 DeepSeek API 密钥更新完成!');
    console.log('');
    console.log('📌 提示:');
    console.log('   1. 请重启前端占卜应用以使新密钥生效');
    console.log('   2. 可以在管理后台测试连接以验证密钥是否正确');
    
  } catch (error) {
    console.error('❌ 更新失败:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行更新
updateDeepSeekKey();
