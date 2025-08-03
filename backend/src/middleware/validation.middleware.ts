import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from './error.middleware';

/**
 * 验证中间件工厂
 */
export const validate = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // 验证请求体
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // 验证查询参数
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // 验证路径参数
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    if (errors.length > 0) {
      const validationError = createError(
        '请求参数验证失败',
        400,
        'VALIDATION_ERROR',
        { errors }
      );
      next(validationError);
      return;
    }

    next();
  };
};

// 常用验证规则
export const commonValidations = {
  id: Joi.number().integer().positive().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().trim().max(100),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(50).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500),
  status: Joi.string().valid('active', 'inactive', 'draft', 'deprecated'),
  platform: Joi.string().valid('web', 'ios', 'android', 'wechat'),
  role: Joi.string().valid('super_admin', 'admin', 'editor', 'viewer'),
};

// AI模型验证规则
export const aiModelValidation = {
  create: {
    body: Joi.object({
      providerId: Joi.alternatives().try(
        commonValidations.id,
        Joi.string().valid('custom')
      ),
      name: commonValidations.name,
      displayName: commonValidations.name.optional(),
      apiKeyEncrypted: Joi.string().optional(),
      customApiUrl: Joi.string().uri().optional(),
      customProviderName: Joi.string().optional(),
      modelType: Joi.string().valid('chat', 'completion', 'embedding').default('chat'),
      parameters: Joi.object({
        temperature: Joi.number().min(0).max(2).default(0.7),
        max_tokens: Joi.number().integer().min(1).max(8000).default(3000),
        top_p: Joi.number().min(0).max(1).default(1.0),
        frequency_penalty: Joi.number().min(-2).max(2).default(0),
        presence_penalty: Joi.number().min(-2).max(2).default(0),
      }).default({}),
      role: Joi.string().valid('primary', 'secondary', 'disabled').default('secondary'),
      priority: Joi.number().integer().min(1).max(1000).default(100),
      costPer1kTokens: Joi.number().min(0).default(0),
      contextWindow: Joi.number().integer().min(1).max(32000).default(4000),
      isActive: Joi.boolean().default(true),
      metadata: Joi.object().default({}),
    }),
  },
  update: {
    params: Joi.object({
      id: commonValidations.id,
    }),
    body: Joi.object({
      providerId: Joi.alternatives().try(
        commonValidations.id,
        Joi.string().valid('custom')
      ).optional(),
      name: commonValidations.name.optional(),
      displayName: commonValidations.name.optional(),
      apiKeyEncrypted: Joi.string().optional(),
      customApiUrl: Joi.string().uri().optional(),
      customProviderName: Joi.string().optional(),
      modelType: Joi.string().valid('chat', 'completion', 'embedding').optional(),
      parameters: Joi.object({
        temperature: Joi.number().min(0).max(2),
        max_tokens: Joi.number().integer().min(1).max(8000),
        top_p: Joi.number().min(0).max(1),
        frequency_penalty: Joi.number().min(-2).max(2),
        presence_penalty: Joi.number().min(-2).max(2),
      }).optional(),
      role: Joi.string().valid('primary', 'secondary', 'disabled').optional(),
      priority: Joi.number().integer().min(1).max(1000).optional(),
      costPer1kTokens: Joi.alternatives().try(
        Joi.number().min(0),
        Joi.string().pattern(/^\d+(\.\d+)?$/).custom((value) => parseFloat(value))
      ).optional(),
      contextWindow: Joi.number().integer().min(1).max(32000).optional(),
      isActive: Joi.boolean().optional(),
      metadata: Joi.object().optional(),
    }),
  },
};

// 提示词模板验证规则
export const promptTemplateValidation = {
  create: {
    body: Joi.object({
      name: commonValidations.name,
      type: Joi.string().valid('system', 'user', 'format').required(),
      category: Joi.string().trim().max(50).default('general'),
      systemPrompt: Joi.string().trim().max(5000).optional(),
      userPromptTemplate: Joi.string().trim().max(5000).optional(),
      formatInstructions: Joi.string().trim().max(2000).optional(),
      variables: Joi.array().items(Joi.string()).default([]),
      description: commonValidations.description.optional(),
      tags: Joi.array().items(Joi.string().trim().max(50)).default([]),
    }),
  },
  update: {
    params: Joi.object({
      id: commonValidations.id,
    }),
    body: Joi.object({
      name: commonValidations.name.optional(),
      type: Joi.string().valid('system', 'user', 'format').optional(),
      category: Joi.string().trim().max(50).optional(),
      systemPrompt: Joi.string().trim().max(5000).optional(),
      userPromptTemplate: Joi.string().trim().max(5000).optional(),
      formatInstructions: Joi.string().trim().max(2000).optional(),
      variables: Joi.array().items(Joi.string()).optional(),
      status: Joi.string().valid('draft', 'active', 'deprecated').optional(),
      description: commonValidations.description.optional(),
      tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
    }),
  },
};

// 应用配置验证规则
export const appConfigValidation = {
  create: {
    body: Joi.object({
      platform: commonValidations.platform.required(),
      configKey: Joi.string().trim().min(1).max(100).required(),
      configValue: Joi.any().required(),
      dataType: Joi.string().valid('json', 'string', 'number', 'boolean').default('json'),
      category: Joi.string().trim().max(50).default('general'),
      description: commonValidations.description.optional(),
      isSensitive: Joi.boolean().default(false),
      validationRules: Joi.object().default({}),
    }),
  },
  update: {
    params: Joi.object({
      id: commonValidations.id,
    }),
    body: Joi.object({
      configValue: Joi.any().optional(),
      dataType: Joi.string().valid('json', 'string', 'number', 'boolean').optional(),
      category: Joi.string().trim().max(50).optional(),
      description: commonValidations.description.optional(),
      isActive: Joi.boolean().optional(),
      isSensitive: Joi.boolean().optional(),
      validationRules: Joi.object().optional(),
    }),
  },
};

// 分页查询验证规则
export const paginationValidation = {
  query: Joi.object({
    page: commonValidations.page,
    limit: commonValidations.limit,
    sort: commonValidations.sort,
    search: commonValidations.search.optional(),
    category: Joi.string().trim().max(50).optional(),
    status: commonValidations.status.optional(),
    platform: commonValidations.platform.optional(),
  }),
};

// 用户认证验证规则
export const authValidation = {
  login: {
    body: Joi.object({
      username: commonValidations.username.optional(),
      email: commonValidations.email.optional(),
      password: commonValidations.password,
      remember: Joi.boolean().default(false),
    }).or('username', 'email'), // 至少需要用户名或邮箱其中一个
  },
  register: {
    body: Joi.object({
      username: commonValidations.username,
      email: commonValidations.email,
      password: commonValidations.password,
      fullName: commonValidations.name,
      role: commonValidations.role.default('admin'),
    }),
  },
  changePassword: {
    body: Joi.object({
      currentPassword: commonValidations.password,
      newPassword: commonValidations.password,
      confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
    }),
  },
};
