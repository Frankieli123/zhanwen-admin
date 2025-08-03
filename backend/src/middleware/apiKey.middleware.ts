import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // 异步更新使用统计（不阻塞请求）
    updateApiKeyUsage(apiKeyRecord.id).catch((error: any) => {
      console.error('更新API Key使用统计失败:', error);
    });

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
 * 异步更新 API Key 使用统计
 */
async function updateApiKeyUsage(apiKeyId: number): Promise<void> {
  try {
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 }
      }
    });
  } catch (error) {
    console.error('更新API Key使用统计失败:', error);
    // 不抛出错误，避免影响主要业务流程
  }
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
