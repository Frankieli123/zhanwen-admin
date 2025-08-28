import { randomBytes } from 'crypto';

/**
 * 生成唯一的客户端ID
 * 格式: cl_[timestamp]_[random]
 */
export function generateClientId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex');
  return `cl_${timestamp}_${random}`;
}

/**
 * 验证客户端ID格式
 */
export function validateClientId(clientId: string): boolean {
  const pattern = /^cl_[a-z0-9]+_[a-f0-9]{16}$/;
  return pattern.test(clientId);
}

/**
 * 从客户端ID中提取创建时间
 */
export function extractTimestampFromClientId(clientId: string): Date | null {
  try {
    const parts = clientId.split('_');
    if (parts.length !== 3 || parts[0] !== 'cl') {
      return null;
    }
    
    const timestamp = parseInt(parts[1], 36);
    return new Date(timestamp);
  } catch {
    return null;
  }
}
