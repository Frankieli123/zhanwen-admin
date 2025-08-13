import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/lib/prisma';

// 防抖更新缓存，避免频繁数据库写入
const updateQueue = new Map<number, NodeJS.Timeout>();

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: number;
        name: string;
        permissions: string[];
      };
    }
  }
}

/**
 * API Key 认证中间件
 * 用于应用端调用 API 时的认证
 */
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        message: '缺少 API Key',
        code: 'NO_API_KEY'
      });
      return;
    }

    // 验证 API Key
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        key: apiKey,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (!apiKeyRecord) {
      res.status(401).json({
        success: false,
        message: 'API Key 无效或已过期',
        code: 'INVALID_API_KEY'
      });
      return;
    }

    // 将应用信息添加到请求对象
    req.apiKey = {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      permissions: apiKeyRecord.permissions
    };

    // 异步更新使用统计（防抖模式，不阻塞请求）
    debouncedUpdateApiKeyUsage(apiKeyRecord.id);

    next();
  } catch (error) {
    console.error('API Key 认证失败:', error);
    res.status(500).json({
      success: false,
      message: '认证服务错误',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

/**
 * 防抖更新 API Key 使用统计（高并发优化）
 * 同一个 API Key 在短时间内的多次调用会被合并为一次数据库更新
 */
function debouncedUpdateApiKeyUsage(apiKeyId: number): void {
  // 清除之前的定时器
  const existingTimer = updateQueue.get(apiKeyId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // 设置新的定时器，500ms 后执行更新
  const timer = setTimeout(async () => {
    try {
      await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 }
        }
      });
      updateQueue.delete(apiKeyId);
    } catch (error) {
      console.error('更新API Key使用统计失败:', error);
      updateQueue.delete(apiKeyId);
    }
  }, 500); // 500ms 防抖延迟

  updateQueue.set(apiKeyId, timer);
}

/**
 * 检查 API 权限
 */
export const requireApiPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey?.permissions.includes(permission)) {
      res.status(403).json({
        success: false,
        message: '权限不足',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }
    next();
  };
};
