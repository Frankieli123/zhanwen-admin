import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '@/utils/jwt';
import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';

// 扩展Request接口，添加用户信息
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT认证中间件
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: '访问被拒绝，需要认证token',
        code: 'NO_TOKEN'
      });
      return;
    }

    // 验证token
    const decoded = verifyToken(token);
    
    // 检查用户是否仍然存在且激活
    const user = await prisma.adminUser.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: '用户账户已被禁用',
        code: 'USER_DISABLED'
      });
      return;
    }

    // 将用户信息添加到请求对象
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions as string[],
    };

    next();
  } catch (error: any) {
    logger.error('认证失败', error);
    
    res.status(401).json({
      success: false,
      message: error.message || '认证失败',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * 权限检查中间件工厂
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '用户未认证',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    // 超级管理员和admin拥有所有权限
    if (req.user.role === 'super_admin' || req.user.role === 'admin') {
      next();
      return;
    }

    // 检查用户是否有指定权限
    if (!req.user.permissions.includes(permission)) {
      logger.warn(`用户 ${req.user.username} 尝试访问需要权限 ${permission} 的资源`);
      
      res.status(403).json({
        success: false,
        message: '权限不足',
        code: 'INSUFFICIENT_PERMISSIONS',
        required_permission: permission
      });
      return;
    }

    next();
  };
};

/**
 * 角色检查中间件工厂
 */
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '用户未认证',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`用户 ${req.user.username} (角色: ${req.user.role}) 尝试访问需要角色 ${allowedRoles.join(', ')} 的资源`);
      
      res.status(403).json({
        success: false,
        message: '角色权限不足',
        code: 'INSUFFICIENT_ROLE',
        required_roles: allowedRoles,
        user_role: req.user.role
      });
      return;
    }

    next();
  };
};

/**
 * 可选认证中间件（不强制要求认证）
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      
      const user = await prisma.adminUser.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          permissions: true,
          isActive: true,
        }
      });

      if (user && user.isActive) {
        req.user = {
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions as string[],
        };
      }
    }

    next();
  } catch (error) {
    // 可选认证失败时不阻止请求，继续执行
    next();
  }
};

/**
 * 检查用户是否可以访问特定资源
 */
export const canAccessResource = (
  req: Request,
  resourceOwnerId?: number
): boolean => {
  if (!req.user) {
    return false;
  }

  // 超级管理员可以访问所有资源
  if (req.user.role === 'super_admin') {
    return true;
  }

  // 管理员可以访问大部分资源
  if (req.user.role === 'admin') {
    return true;
  }

  // 如果指定了资源所有者，检查是否为资源所有者
  if (resourceOwnerId !== undefined) {
    return req.user.userId === resourceOwnerId;
  }

  return false;
};
