import { Router } from 'express';
import {
  getAIModels,
  getAIModelById,
  createAIModel,
  updateAIModel,
  deleteAIModel,
  batchDeleteAIModels,
  testAIModelConnection,
  getAIModelStats,
  getAIProviders,
  getActiveAIProviders,
  getAIProviderById,
  getActiveAIConfiguration,
  getPrimaryAIModel,
  fetchModels,
  testAPIConnection,
} from '@/controllers/ai-models.controller';
import { authenticateToken, requirePermission } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { auditLog, batchAuditLog } from '@/middleware/audit.middleware';
import { aiModelValidation, paginationValidation, commonValidations } from '@/middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// AI模型路由
router.get(
  '/ai-models',
  requirePermission('ai_models:read'),
  validate(paginationValidation),
  getAIModels
);

// 获取当前活跃AI配置
router.get(
  '/ai-models/active',
  requirePermission('ai_models:read'),
  getActiveAIConfiguration
);

// 获取当前主模型
router.get(
  '/ai-models/primary',
  requirePermission('ai_models:read'),
  getPrimaryAIModel
);

router.get(
  '/ai-models/:id',
  requirePermission('ai_models:read'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  getAIModelById
);

router.post(
  '/ai-models',
  requirePermission('ai_models:create'),
  validate(aiModelValidation.create),
  auditLog('create', 'ai_model'),
  createAIModel
);

router.put(
  '/ai-models/:id',
  requirePermission('ai_models:update'),
  validate(aiModelValidation.update),
  auditLog('update', 'ai_model'),
  updateAIModel
);

router.delete(
  '/ai-models/:id',
  requirePermission('ai_models:delete'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  auditLog('delete', 'ai_model'),
  deleteAIModel
);

router.delete(
  '/ai-models/batch',
  requirePermission('ai_models:delete'),
  validate({
    body: Joi.object({
      ids: Joi.array().items(commonValidations.id).min(1).required(),
    }),
  }),
  batchAuditLog('delete', 'ai_model'),
  batchDeleteAIModels
);

router.post(
  '/ai-models/:id/test',
  requirePermission('ai_models:read'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  testAIModelConnection
);

router.get(
  '/ai-models/:id/stats',
  requirePermission('ai_models:read'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
    query: Joi.object({
      days: Joi.number().integer().min(1).max(365).default(30),
    }),
  }),
  getAIModelStats
);

// AI提供商路由
router.get(
  '/ai-providers',
  requirePermission('ai_models:read'),
  validate(paginationValidation),
  getAIProviders
);

router.get(
  '/ai-providers/active',
  requirePermission('ai_models:read'),
  getActiveAIProviders
);

router.get(
  '/ai-providers/:id',
  requirePermission('ai_models:read'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  getAIProviderById
);

// 拉取模型列表
router.post(
  '/ai-models/fetch-models',
  requirePermission('ai_models:create'),
  validate({
    body: Joi.object({
      provider: Joi.string().required(),
      apiKey: Joi.string().required(),
      apiUrl: Joi.string().uri().optional(),
    }),
  }),
  fetchModels
);

// 测试API连接
router.post(
  '/ai-models/test-connection',
  requirePermission('ai_models:create'),
  validate({
    body: Joi.object({
      provider: Joi.string().required(),
      apiKey: Joi.string().required(),
      apiUrl: Joi.string().uri().optional(),
    }),
  }),
  testAPIConnection
);

export default router;
