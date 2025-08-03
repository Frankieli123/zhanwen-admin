import { Router, Request, Response } from 'express';
import {
  getApiKeys,
  getApiKeyById,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  regenerateApiKey,
  batchDeleteApiKeys,
} from '@/controllers/apiKeys.controller';
import { authenticateToken, requirePermission } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { auditLog, batchAuditLog } from '@/middleware/audit.middleware';
import { paginationValidation, commonValidations } from '@/middleware/validation.middleware';
import { asyncHandler } from '@/middleware/async.middleware';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '@/types/api.types';
import Joi from 'joi';

const prisma = new PrismaClient();

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// API Key 验证规则
const apiKeyValidation = {
  create: {
    body: Joi.object({
      name: Joi.string().min(1).max(100).required().messages({
        'string.empty': 'API Key名称不能为空',
        'string.max': 'API Key名称不能超过100个字符',
        'any.required': 'API Key名称是必填项',
      }),
      permissions: Joi.array().items(Joi.string()).default([]).messages({
        'array.base': '权限必须是数组格式',
      }),
      description: Joi.string().max(500).optional().allow('').messages({
        'string.max': '描述不能超过500个字符',
      }),
      expiresAt: Joi.date().optional().allow(null).messages({
        'date.base': '过期时间格式不正确',
      }),
    }),
  },
  update: {
    body: Joi.object({
      name: Joi.string().min(1).max(100).optional().messages({
        'string.empty': 'API Key名称不能为空',
        'string.max': 'API Key名称不能超过100个字符',
      }),
      permissions: Joi.array().items(Joi.string()).optional().messages({
        'array.base': '权限必须是数组格式',
      }),
      description: Joi.string().max(500).optional().allow('').messages({
        'string.max': '描述不能超过500个字符',
      }),
      isActive: Joi.boolean().optional().messages({
        'boolean.base': '状态必须是布尔值',
      }),
      expiresAt: Joi.date().optional().allow(null).messages({
        'date.base': '过期时间格式不正确',
      }),
    }),
  },
};

/**
 * @swagger
 * /api-keys:
 *   get:
 *     summary: 获取API Key列表
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/api-keys',
  requirePermission('api_keys:read'),
  validate(paginationValidation),
  getApiKeys
);

/**
 * @swagger
 * /api-keys/{id}:
 *   get:
 *     summary: 获取API Key详情
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: API Key ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: API Key不存在
 */
router.get(
  '/api-keys/:id',
  requirePermission('api_keys:read'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  getApiKeyById
);

/**
 * @swagger
 * /api-keys:
 *   post:
 *     summary: 创建API Key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: API Key名称
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 权限列表
 *               description:
 *                 type: string
 *                 description: 描述
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: 过期时间
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post(
  '/api-keys',
  requirePermission('api_keys:create'),
  validate(apiKeyValidation.create),
  auditLog('create', 'api_key'),
  createApiKey
);

/**
 * @swagger
 * /api-keys/{id}:
 *   put:
 *     summary: 更新API Key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: API Key ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: API Key名称
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 权限列表
 *               description:
 *                 type: string
 *                 description: 描述
 *               isActive:
 *                 type: boolean
 *                 description: 是否启用
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: 过期时间
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: API Key不存在
 */
router.put(
  '/api-keys/:id',
  requirePermission('api_keys:update'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
    ...apiKeyValidation.update,
  }),
  auditLog('update', 'api_key'),
  updateApiKey
);

/**
 * @swagger
 * /api-keys/{id}:
 *   delete:
 *     summary: 删除API Key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: API Key ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: API Key不存在
 */
router.delete(
  '/api-keys/:id',
  requirePermission('api_keys:delete'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  auditLog('delete', 'api_key'),
  deleteApiKey
);

/**
 * @swagger
 * /api-keys/{id}/regenerate:
 *   post:
 *     summary: 重新生成API Key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: API Key ID
 *     responses:
 *       200:
 *         description: 重新生成成功
 *       404:
 *         description: API Key不存在
 */
router.post(
  '/api-keys/:id/regenerate',
  requirePermission('api_keys:update'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  auditLog('regenerate', 'api_key'),
  regenerateApiKey
);

/**
 * @swagger
 * /api-keys/batch:
 *   delete:
 *     summary: 批量删除API Key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: API Key ID列表
 *     responses:
 *       200:
 *         description: 批量删除成功
 */
router.delete(
  '/api-keys/batch',
  requirePermission('api_keys:delete'),
  validate({
    body: Joi.object({
      ids: Joi.array().items(commonValidations.id).min(1).required().messages({
        'array.min': '至少选择一个API Key',
        'any.required': 'API Key ID列表是必填项',
      }),
    }),
  }),
  batchAuditLog('batch_delete', 'api_key'),
  batchDeleteApiKeys
);

/**
 * @swagger
 * /api-keys/usage-stats:
 *   get:
 *     summary: 获取API Key使用统计
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: 统计天数
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get(
  '/api-keys/usage-stats',
  requirePermission('api_keys:read'),
  validate({
    query: Joi.object({
      days: Joi.number().integer().min(1).max(365).default(30),
    }),
  }),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { days = 30 } = req.query as { days?: string };
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    // 获取所有API Key的基本统计
    const apiKeys = await prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        usageCount: true,
        lastUsedAt: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        usageCount: 'desc'
      }
    });

    // 计算总体统计
    const totalUsage = apiKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
    const activeKeys = apiKeys.filter(key => key.isActive).length;
    const recentlyUsedKeys = apiKeys.filter(key =>
      key.lastUsedAt && key.lastUsedAt >= startDate
    ).length;

    const response: ApiResponse = {
      success: true,
      message: '获取API Key使用统计成功',
      data: {
        summary: {
          totalKeys: apiKeys.length,
          activeKeys,
          recentlyUsedKeys,
          totalUsage,
          averageUsage: apiKeys.length > 0 ? Math.round(totalUsage / apiKeys.length) : 0,
        },
        apiKeys: apiKeys.map(key => ({
          id: key.id,
          name: key.name,
          usageCount: key.usageCount || 0,
          lastUsedAt: key.lastUsedAt,
          isActive: key.isActive,
          createdAt: key.createdAt,
          daysSinceCreated: Math.floor(
            (new Date().getTime() - key.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          ),
          daysSinceLastUsed: key.lastUsedAt ? Math.floor(
            (new Date().getTime() - key.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24)
          ) : null,
        })),
        period: {
          days: Number(days),
          startDate,
          endDate: new Date(),
        }
      },
    };

    res.json(response);
  })
);

export default router;
