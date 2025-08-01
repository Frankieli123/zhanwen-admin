import { Router } from 'express';
import { 
  getHexagrams,
  getHexagramById,
  createHexagram,
  updateHexagram,
  deleteHexagram,
  batchDeleteHexagrams
} from '../controllers/hexagrams.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import { validate, paginationValidation, commonValidations } from '../middleware/validation.middleware';
import { auditLog } from '../middleware/audit.middleware';
import Joi from 'joi';

const router = Router();

// 应用认证中间件
router.use(authenticateToken);

// 卦象数据路由
router.get(
  '/hexagrams',
  requirePermission('hexagrams:read'),
  validate({
    query: Joi.object({
      ...paginationValidation.query.describe().keys,
      element: Joi.string().valid('wood', 'fire', 'earth', 'metal', 'water').optional(),
      isActive: Joi.boolean().optional(),
    }),
  }),
  getHexagrams
);

router.get(
  '/hexagrams/:id',
  requirePermission('hexagrams:read'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  getHexagramById
);

router.post(
  '/hexagrams',
  requirePermission('hexagrams:create'),
  validate({
    body: Joi.object({
      name: Joi.string().min(1).max(50).required(),
      element: Joi.string().valid('wood', 'fire', 'earth', 'metal', 'water').required(),
      description: Joi.string().optional(),
      interpretation: Joi.string().optional(),
      favorableActions: Joi.array().items(Joi.string()).optional(),
      unfavorableActions: Joi.array().items(Joi.string()).optional(),
      timeInfo: Joi.object().optional(),
      directionInfo: Joi.object().optional(),
      resolutionMethods: Joi.array().items(Joi.string()).optional(),
      metadata: Joi.object().optional(),
      isActive: Joi.boolean().default(true),
    }),
  }),
  auditLog('create', 'hexagram'),
  createHexagram
);

router.put(
  '/hexagrams/:id',
  requirePermission('hexagrams:update'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
    body: Joi.object({
      name: Joi.string().min(1).max(50).optional(),
      element: Joi.string().valid('wood', 'fire', 'earth', 'metal', 'water').optional(),
      description: Joi.string().optional(),
      interpretation: Joi.string().optional(),
      favorableActions: Joi.array().items(Joi.string()).optional(),
      unfavorableActions: Joi.array().items(Joi.string()).optional(),
      timeInfo: Joi.object().optional(),
      directionInfo: Joi.object().optional(),
      resolutionMethods: Joi.array().items(Joi.string()).optional(),
      metadata: Joi.object().optional(),
      isActive: Joi.boolean().optional(),
    }),
  }),
  auditLog('update', 'hexagram'),
  updateHexagram
);

router.delete(
  '/hexagrams/:id',
  requirePermission('hexagrams:delete'),
  validate({
    params: Joi.object({
      id: commonValidations.id,
    }),
  }),
  auditLog('delete', 'hexagram'),
  deleteHexagram
);

router.delete(
  '/hexagrams',
  requirePermission('hexagrams:delete'),
  validate({
    body: Joi.object({
      ids: Joi.array().items(commonValidations.id).min(1).required(),
    }),
  }),
  auditLog('batch_delete', 'hexagram'),
  batchDeleteHexagrams
);

export default router;
