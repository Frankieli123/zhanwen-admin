import { Router } from 'express';
import {
  getAppConfigs,
  getAppConfigById,
  getPlatformConfigs,
  createAppConfig,
  updateAppConfig,
  deleteAppConfig,
  batchDeleteAppConfigs,
  batchUpdateConfigStatus,
  copyConfigToPlatform,
  getConfigCategories,
} from '@/controllers/configs.controller';
import { authenticateToken, requirePermission } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { auditLog, batchAuditLog } from '@/middleware/audit.middleware';
import { appConfigValidation, paginationValidation, commonValidations } from '@/middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 应用配置路由
router.get(
  '/configs',
  requirePermission('configs:read'),
  validate({
    query: Joi.object({
      ...paginationValidation.query.describe().keys,
      platform: commonValidations.platform.optional(),
    }),
  }),
  getAppConfigs
);

router.get(
  '/configs/categories',
  requirePermission('configs:read'),
  getConfigCategories
);

router.get(
  '/configs/platform/:platform',
  requirePermission('configs:read'),
  validate({
    params: Joi.object({
      platform: commonValidations.platform.required(),
    }),
  }),
  getPlatformConfigs
);

router.get(
  '/configs/:id',
  requirePermission('configs:read'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  getAppConfigById
);

router.post(
  '/configs',
  requirePermission('configs:create'),
  validate(appConfigValidation.create),
  auditLog('create', 'app_config'),
  createAppConfig
);

router.put(
  '/configs/:id',
  requirePermission('configs:update'),
  validate(appConfigValidation.update),
  auditLog('update', 'app_config'),
  updateAppConfig
);

router.delete(
  '/configs/:id',
  requirePermission('configs:delete'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  auditLog('delete', 'app_config'),
  deleteAppConfig
);

router.delete(
  '/configs/batch',
  requirePermission('configs:delete'),
  validate({
    body: Joi.object({
      ids: Joi.array().items(commonValidations.id).min(1).required(),
    }),
  }),
  batchAuditLog('delete', 'app_config'),
  batchDeleteAppConfigs
);

router.put(
  '/configs/batch/status',
  requirePermission('configs:update'),
  validate({
    body: Joi.object({
      ids: Joi.array().items(commonValidations.id).min(1).required(),
      isActive: Joi.boolean().required(),
    }),
  }),
  batchAuditLog('update_status', 'app_config'),
  batchUpdateConfigStatus
);

router.post(
  '/configs/:id/copy',
  requirePermission('configs:create'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
    body: Joi.object({
      targetPlatform: commonValidations.platform.required(),
    }),
  }),
  auditLog('copy', 'app_config'),
  copyConfigToPlatform
);

export default router;
