import crypto from 'crypto';

/**
 * 生成API Key
 * 格式: zw_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (32位随机字符串)
 */
export const generateApiKey = (): string => {
  const prefix = 'zw_live_';
  const randomBytes = crypto.randomBytes(16);
  const randomString = randomBytes.toString('hex');
  
  return prefix + randomString;
};

/**
 * 验证API Key格式
 */
export const validateApiKeyFormat = (apiKey: string): boolean => {
  const pattern = /^zw_live_[a-f0-9]{32}$/;
  return pattern.test(apiKey);
};

/**
 * 生成测试用的API Key
 */
export const generateTestApiKey = (): string => {
  const prefix = 'zw_test_';
  const randomBytes = crypto.randomBytes(16);
  const randomString = randomBytes.toString('hex');
  
  return prefix + randomString;
};

/**
 * 检查API Key是否为测试Key
 */
export const isTestApiKey = (apiKey: string): boolean => {
  return apiKey.startsWith('zw_test_');
};

/**
 * 掩码显示API Key（用于前端显示）
 */
export const maskApiKey = (apiKey: string): string => {
  if (apiKey.length <= 12) {
    return apiKey;
  }
  
  const prefix = apiKey.substring(0, 8);
  const suffix = apiKey.substring(apiKey.length - 4);
  const masked = '*'.repeat(apiKey.length - 12);
  
  return prefix + masked + suffix;
};
