import jwt, { SignOptions } from 'jsonwebtoken';
import { AdminUser } from '@prisma/client';

const JWT_SECRET = process.env['JWT_SECRET'] || 'default-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '7d';
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] || 'default-refresh-secret-change-in-production';
const JWT_REFRESH_EXPIRES_IN = process.env['JWT_REFRESH_EXPIRES_IN'] || '30d';

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
  } as SignOptions);
};

/**
 * 生成Refresh Token（与访问Token使用不同秘钥与过期时间）
 */
export const generateRefreshToken = (user: AdminUser): string => {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> & { tokenType: 'refresh' } = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    permissions: user.permissions as string[],
    tokenType: 'refresh',
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'divination-admin',
    audience: 'divination-admin-users',
  } as SignOptions);
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
