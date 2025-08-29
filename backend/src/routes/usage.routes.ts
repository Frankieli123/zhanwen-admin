import { Router } from 'express';
import Joi from 'joi';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  getApiLogs,
  getUsageMetrics,
  getClientStats,
  getRealtimeStats,
  getErrorAnalysis,
  getPerformanceMetrics,
  getEndpointStats,
  getGeoAnalysis,
  getDeviceAnalysis,
  getMetricsData,
  exportUsageReport,
} from '../controllers/usage.controller';

const router = Router();

// 统一应用JWT认证
router.use(authenticateToken);

// /usage/logs
router.get(
  '/usage/logs',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      apiKeyId: Joi.number().integer().positive().optional(),
      clientId: Joi.string().trim().max(100).optional(),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
      period: Joi.string().optional(), // 添加period参数支持
      groupBy: Joi.string().optional(), // 添加groupBy参数支持
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sortBy: Joi.string().valid('createdAt', 'responseTimeMs', 'status', 'id').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    }).options({ allowUnknown: true }) // 允许未知参数
  }),
  getApiLogs
);

// /usage/metrics
router.get(
  '/usage/metrics',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      apiKeyId: Joi.number().integer().positive().optional(),
      clientId: Joi.string().trim().max(100).optional(),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
      period: Joi.string().optional(),
      groupBy: Joi.string().valid('hour', 'day', 'week', 'month').default('day'),
    }).options({ allowUnknown: true }) // 允许未知参数（例如 period）
  }),
  getUsageMetrics
);

// /usage/clients
router.get(
  '/usage/clients',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      apiKeyId: Joi.number().integer().positive().optional(),
      period: Joi.number().integer().min(1).default(30), // 以天为单位
      top: Joi.number().integer().min(1).max(100).default(10),
    })
  }),
  getClientStats
);

// /usage/realtime
router.get(
  '/usage/realtime',
  requirePermission('analytics:read'),
  getRealtimeStats
);

// /usage/errors
router.get(
  '/usage/errors',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      apiKeyId: Joi.number().integer().positive().optional(),
      period: Joi.number().integer().min(1).default(7),
      groupBy: Joi.string().valid('status', 'endpoint', 'client').default('status'),
    })
  }),
  getErrorAnalysis
);

// /usage/performance
router.get(
  '/usage/performance',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      apiKeyId: Joi.number().integer().positive().optional(),
      period: Joi.number().integer().min(1).default(7),
      percentiles: Joi.alternatives().try(
        Joi.array().items(Joi.number().min(1).max(100)),
        Joi.string()
      ).optional(),
    })
  }),
  getPerformanceMetrics
);

// /usage/endpoints
router.get(
  '/usage/endpoints',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      apiKeyId: Joi.number().integer().positive().optional(),
      period: Joi.number().integer().min(1).default(7),
      top: Joi.number().integer().min(1).max(100).default(10),
    })
  }),
  getEndpointStats
);

// /usage/geo
router.get(
  '/usage/geo',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      apiKeyId: Joi.number().integer().positive().optional(),
      period: Joi.number().integer().min(1).default(7),
    })
  }),
  getGeoAnalysis
);

// /usage/devices
router.get(
  '/usage/devices',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      apiKeyId: Joi.number().integer().positive().optional(),
      period: Joi.number().integer().min(1).default(7),
    })
  }),
  getDeviceAnalysis
);

// /usage/metrics-data
router.get(
  '/usage/metrics-data',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      apiKeyId: Joi.number().integer().positive().optional(),
      clientId: Joi.string().trim().max(100).optional(),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
      metricName: Joi.string().trim().max(100).optional(),
      limit: Joi.number().integer().min(1).max(1000).default(100),
      groupBy: Joi.string().valid('hour', 'day', 'week', 'month').optional(),
    }).options({ allowUnknown: true })
  }),
  getMetricsData
);

// /usage/export
router.get(
  '/usage/export',
  requirePermission('analytics:read'),
  validate({
    query: Joi.object({
      type: Joi.string().valid('summary', 'logs', 'metrics').default('summary'),
      format: Joi.string().valid('json', 'csv', 'pdf').default('json'),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
      apiKeyId: Joi.number().integer().positive().optional(),
      groupBy: Joi.string().valid('hour', 'day', 'week', 'month').optional(),
    })
  }),
  exportUsageReport
);

export default router;
