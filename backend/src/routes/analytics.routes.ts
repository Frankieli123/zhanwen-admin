import { Router } from 'express';
import { 
  getAnalyticsOverview,
  getUsageStatistics,
  getModelPerformance,
  getHexagramStatistics
} from '../controllers/analytics.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// 应用认证中间件
router.use(authenticateToken);

// 数据分析路由
router.get(
  '/analytics/overview',
  requirePermission('analytics:read'),
  getAnalyticsOverview
);

router.get(
  '/analytics/usage',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
      period: Joi.string().valid('day', 'week', 'month', 'year').default('month'),
    }),
  }),
  getUsageStatistics
);

router.get(
  '/analytics/models',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
    }),
  }),
  getModelPerformance
);

router.get(
  '/analytics/hexagrams',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
    }),
  }),
  getHexagramStatistics
);

export default router;
