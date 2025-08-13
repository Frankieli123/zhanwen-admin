import CryptoJS from 'crypto-js';
import bcrypt from 'bcryptjs';

const ENCRYPTION_KEY = process.env['ENCRYPTION_KEY'] || 'default-32-character-key-change-me';

/**
 * 加密敏感数据（如API密钥）
 */
export const encrypt = (text: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    throw new Error('加密失败');
  }
};

/**
 * 解密敏感数据
 */
export const decrypt = (encryptedText: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error('解密结果为空');
    }

    return decrypted;
  } catch (error) {
    throw new Error('解密失败');
  }
};

/**
 * 哈希密码
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error('密码哈希失败');
  }
};

/**
 * 验证密码
 */
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    const isValid = await bcrypt.compare(password, hashedPassword);
    return isValid;
  } catch (error) {
    throw new Error('密码验证失败');
  }
};

/**
 * 生成随机字符串
 */
export const generateRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

/**
 * 生成API密钥
 */
export const generateApiKey = (): string => {
  const prefix = 'sk-';
  const randomPart = generateRandomString(48);
  return prefix + randomPart;
};

/**
 * 验证加密密钥强度
 */
export const validateEncryptionKey = (key: string): boolean => {
  // 密钥应该至少32个字符
  if (key.length < 32) {
    return false;
  }
  
  // 检查是否包含字母和数字
  const hasLetter = /[a-zA-Z]/.test(key);
  const hasNumber = /[0-9]/.test(key);
  
  return hasLetter && hasNumber;
};
