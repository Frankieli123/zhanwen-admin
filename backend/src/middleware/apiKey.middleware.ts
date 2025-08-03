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

    // 更新使用统计
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 }
      }
    });

    // 将应用信息添加到请求对象
    req.apiKey = {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      permissions: apiKeyRecord.permissions
    };

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
