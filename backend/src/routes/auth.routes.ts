import { Router } from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, hashPassword } from '@/utils/encryption';
import { generateToken, verifyToken } from '@/utils/jwt';
import { asyncHandler, createError } from '@/middleware/error.middleware';
import { validate } from '@/middleware/validation.middleware';
import { authenticateToken } from '@/middleware/auth.middleware';
import { sensitiveAuditLog } from '@/middleware/audit.middleware';
import { authValidation } from '@/middleware/validation.middleware';
import { logger } from '@/utils/logger';
import { ApiResponse, LoginResponse } from '@/types/api.types';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               remember:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 用户名或密码错误
 */
router.post(
  '/login',
  validate(authValidation.login),
  sensitiveAuditLog('login', '用户登录'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username, email, password, remember } = req.body;

    // 支持用户名或邮箱登录
    const loginField = username || email;

    // 查找用户 - 同时支持用户名和邮箱
    const user = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: loginField },
          { email: loginField },
        ],
      },
    });

    if (!user) {
      throw createError('用户名或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw createError('账户已被禁用', 401, 'ACCOUNT_DISABLED');
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw createError('用户名或密码错误', 401, 'INVALID_CREDENTIALS');
    }

    // 更新最后登录时间
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 生成JWT token
    const token = generateToken(user);

    const loginResponse: LoginResponse = {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || user.username,
        role: user.role,
        permissions: user.permissions as string[],
      },
      expiresIn: process.env['JWT_EXPIRES_IN'] || '7d',
    };

    const response: ApiResponse<LoginResponse> = {
      success: true,
      message: '登录成功',
      data: loginResponse,
    };

    logger.info('用户登录成功', {
      userId: user.id,
      username: user.username,
      ip: req.ip,
    });

    res.json(response);
  })
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 用户登出
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 */
router.post(
  '/logout',
  authenticateToken,
  sensitiveAuditLog('logout', '用户登出'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // 在实际应用中，可以将token加入黑名单
    // 这里只是简单返回成功响应

    logger.info('用户登出', {
      userId: req.user?.userId,
      username: req.user?.username,
    });

    const response: ApiResponse = {
      success: true,
      message: '登出成功',
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.adminUser.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw createError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: '获取用户信息成功',
      data: user,
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: 修改密码
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: 密码修改成功
 */
router.put(
  '/change-password',
  authenticateToken,
  validate(authValidation.changePassword),
  sensitiveAuditLog('change_password', '修改密码'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    // 获取用户当前密码
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw createError('用户不存在', 404, 'USER_NOT_FOUND');
    }

    // 验证当前密码
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw createError('当前密码错误', 400, 'INVALID_CURRENT_PASSWORD');
    }

    // 哈希新密码
    const newPasswordHash = await hashPassword(newPassword);

    // 更新密码
    await prisma.adminUser.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    logger.info('用户密码修改成功', {
      userId,
      username: req.user?.username,
    });

    const response: ApiResponse = {
      success: true,
      message: '密码修改成功',
    };

    res.json(response);
  })
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: 刷新Token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token刷新成功
 */
router.post(
  '/refresh',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.adminUser.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user || !user.isActive) {
      throw createError('用户不存在或已被禁用', 401, 'USER_INVALID');
    }

    // 生成新的token
    const newToken = generateToken(user);

    const response: ApiResponse = {
      success: true,
      message: 'Token刷新成功',
      data: {
        token: newToken,
        expiresIn: process.env['JWT_EXPIRES_IN'] || '7d',
      },
    };

    res.json(response);
  })
);

export default router;
