import { Router } from 'express';
import {
  getPromptTemplates,
  getPromptTemplateById,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  batchDeletePromptTemplates,
  activatePromptTemplate,
  getPromptTemplateVersions,
  duplicatePromptTemplate,
  getPromptTemplateStats,
} from '@/controllers/prompts.controller';
import { authenticateToken, requirePermission } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { auditLog, batchAuditLog, sensitiveAuditLog } from '@/middleware/audit.middleware';
import { promptTemplateValidation, paginationValidation, commonValidations } from '@/middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 提示词模板路由
router.get(
  '/prompts',
  requirePermission('prompts:read'),
  validate(paginationValidation),
  getPromptTemplates
);

router.get(
  '/prompts/:id',
  requirePermission('prompts:read'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  getPromptTemplateById
);

router.post(
  '/prompts',
  requirePermission('prompts:create'),
  validate(promptTemplateValidation.create),
  auditLog('create', 'prompt_template'),
  createPromptTemplate
);

router.put(
  '/prompts/:id',
  requirePermission('prompts:update'),
  validate(promptTemplateValidation.update),
  auditLog('update', 'prompt_template'),
  updatePromptTemplate
);

router.delete(
  '/prompts/:id',
  requirePermission('prompts:delete'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  auditLog('delete', 'prompt_template'),
  deletePromptTemplate
);

router.delete(
  '/prompts/batch',
  requirePermission('prompts:delete'),
  validate({
    body: Joi.object({
      ids: Joi.array().items(commonValidations.id).min(1).required(),
    }),
  }),
  batchAuditLog('delete', 'prompt_template'),
  batchDeletePromptTemplates
);

router.post(
  '/prompts/:id/activate',
  requirePermission('prompts:update'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  sensitiveAuditLog('activate_template', '激活提示词模板'),
  activatePromptTemplate
);

router.get(
  '/prompts/:name/versions',
  requirePermission('prompts:read'),
  validate({
    params: Joi.object({
      name: Joi.string().trim().min(1).max(100).required(),
    }),
  }),
  getPromptTemplateVersions
);

router.post(
  '/prompts/:id/duplicate',
  requirePermission('prompts:create'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
    body: Joi.object({
      newName: commonValidations.name,
    }),
  }),
  auditLog('duplicate', 'prompt_template'),
  duplicatePromptTemplate
);

router.get(
  '/prompts/:id/stats',
  requirePermission('prompts:read'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  getPromptTemplateStats
);

export default router;
