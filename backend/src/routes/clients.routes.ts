import { Router } from 'express';
import {
  getClients,
  createClient,
  getClientById,
  updateClient,
  deleteClient,
  getClientStats,
  regenerateClientId,
} from '../controllers/clients.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// 应用认证中间件
router.use(authenticateToken);

// 获取客户端列表
router.get(
  '/clients',
  requirePermission('clients:read'),
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      platform: Joi.string().valid('web', 'ios', 'android', 'wechat').optional(),
      isActive: Joi.boolean().optional(),
    }),
  }),
  getClients
);

// 创建客户端
router.post(
  '/clients',
  requirePermission('clients:write'),
  validate({
    body: Joi.object({
      name: Joi.string().required().max(100),
      description: Joi.string().optional().max(500),
      platform: Joi.string().valid('web', 'ios', 'android', 'wechat').required(),
      version: Joi.string().optional().max(50),
      owner: Joi.string().optional().max(100),
      contactEmail: Joi.string().email().optional(),
      apiKeyId: Joi.number().integer().optional(),
    }),
  }),
  createClient
);

// 获取客户端详情
router.get(
  '/clients/:id',
  requirePermission('clients:read'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().required(),
    }),
  }),
  getClientById
);

// 更新客户端
router.put(
  '/clients/:id',
  requirePermission('clients:write'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().required(),
    }),
    body: Joi.object({
      name: Joi.string().optional().max(100),
      description: Joi.string().optional().max(500),
      platform: Joi.string().valid('web', 'ios', 'android', 'wechat').optional(),
      version: Joi.string().optional().max(50),
      owner: Joi.string().optional().max(100),
      contactEmail: Joi.string().email().optional(),
      isActive: Joi.boolean().optional(),
      apiKeyId: Joi.number().integer().optional(),
    }),
  }),
  updateClient
);

// 删除客户端
router.delete(
  '/clients/:id',
  requirePermission('clients:delete'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().required(),
    }),
  }),
  deleteClient
);

// 获取客户端统计
router.get(
  '/clients/:clientId/stats',
  requirePermission('clients:read'),
  validate({
    params: Joi.object({
      clientId: Joi.string().required(),
    }),
    query: Joi.object({
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
    }),
  }),
  getClientStats
);

// 重新生成客户端ID
router.post(
  '/clients/:id/regenerate-id',
  requirePermission('clients:write'),
  validate({
    params: Joi.object({
      id: Joi.number().integer().required(),
    }),
  }),
  regenerateClientId
);

export default router;
