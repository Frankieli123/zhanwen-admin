import jwt from 'jsonwebtoken';
import { AdminUser } from '@prisma/client';

const JWT_SECRET = process.env['JWT_SECRET'] || 'default-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '7d';

export interface JwtPayload {
  userId: number;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

/**
 * 生成JWT Token
 */
export const generateToken = (user: AdminUser): string => {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    permissions: user.permissions as string[],
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'divination-admin',
    audience: 'divination-admin-users',
  });
};

/**
 * 验证JWT Token
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'divination-admin',
      audience: 'divination-admin-users',
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token已过期');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token无效');
    } else {
      throw new Error('Token验证失败');
    }
  }
};

/**
 * 刷新Token
 */
export const refreshToken = (token: string): string => {
  try {
    // 验证当前token（忽略过期时间）
    const decoded = jwt.verify(token, JWT_SECRET, {
      ignoreExpiration: true,
      issuer: 'divination-admin',
      audience: 'divination-admin-users',
    }) as JwtPayload;

    // 生成新token
    const newPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    };

    return jwt.sign(newPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'divination-admin',
      audience: 'divination-admin-users',
    });
  } catch (error) {
    throw new Error('Token刷新失败');
  }
};

/**
 * 解码Token（不验证）
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * 检查Token是否即将过期（30分钟内）
 */
export const isTokenExpiringSoon = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const thirtyMinutes = 30 * 60; // 30分钟
    
    return (decoded.exp - now) < thirtyMinutes;
  } catch (error) {
    return true;
  }
};

/**
 * 获取Token剩余有效时间（秒）
 */
export const getTokenRemainingTime = (token: string): number => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp - now;
    
    return Math.max(0, remaining);
  } catch (error) {
    return 0;
  }
};
