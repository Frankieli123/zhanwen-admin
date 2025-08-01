import { Request, Response } from 'express';
import { AIModelService } from '@/services/ai-model.service';
import { AIProviderService } from '@/services/ai-provider.service';
import { asyncHandler } from '@/middleware/error.middleware';
import { ApiResponse, PaginationQuery } from '@/types/api.types';

const aiModelService = new AIModelService();
const aiProviderService = new AIProviderService();

/**
 * @swagger
 * components:
 *   schemas:
 *     AIModel:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         displayName:
 *           type: string
 *         modelType:
 *           type: string
 *           enum: [chat, completion, embedding]
 *         role:
 *           type: string
 *           enum: [primary, secondary, disabled]
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/ai-models:
 *   get:
 *     summary: 获取AI模型列表
 *     tags: [AI Models]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: 状态筛选
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getAIModels = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query: PaginationQuery = {
    page: parseInt(req.query['page'] as string) || 1,
    limit: parseInt(req.query['limit'] as string) || 10,
    sort: (req.query['sort'] as 'asc' | 'desc') || 'desc',
    search: req.query['search'] as string,
    status: req.query['status'] as string,
    category: req.query['category'] as string,
  };

  const result = await aiModelService.getModels(query);
  
  res.json(result);
});

/**
 * @swagger
 * /api/ai-models/{id}:
 *   get:
 *     summary: 获取AI模型详情
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 模型不存在
 */
export const getAIModelById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const model = await aiModelService.getModelById(id);
  
  const response: ApiResponse = {
    success: true,
    message: '获取AI模型详情成功',
    data: model,
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/ai-models:
 *   post:
 *     summary: 创建AI模型
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - name
 *               - displayName
 *             properties:
 *               providerId:
 *                 type: integer
 *               name:
 *                 type: string
 *               displayName:
 *                 type: string
 *               apiKeyEncrypted:
 *                 type: string
 *               modelType:
 *                 type: string
 *                 enum: [chat, completion, embedding]
 *               parameters:
 *                 type: object
 *               role:
 *                 type: string
 *                 enum: [primary, secondary, disabled]
 *     responses:
 *       201:
 *         description: 创建成功
 */
export const createAIModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const model = await aiModelService.createModel(req.body, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: 'AI模型创建成功',
    data: model,
  };
  
  res.status(201).json(response);
});

/**
 * @swagger
 * /api/ai-models/{id}:
 *   put:
 *     summary: 更新AI模型
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 更新成功
 */
export const updateAIModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const model = await aiModelService.updateModel(id, req.body, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: 'AI模型更新成功',
    data: model,
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/ai-models/{id}:
 *   delete:
 *     summary: 删除AI模型
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
export const deleteAIModel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  await aiModelService.deleteModel(id, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: 'AI模型删除成功',
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/ai-models/batch:
 *   delete:
 *     summary: 批量删除AI模型
 *     tags: [AI Models]
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
 *     responses:
 *       200:
 *         description: 批量删除成功
 */
export const batchDeleteAIModels = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body;
  await aiModelService.batchDeleteModels(ids, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: 'AI模型批量删除成功',
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/ai-models/{id}/test:
 *   post:
 *     summary: 测试AI模型连接
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 测试完成
 */
export const testAIModelConnection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const result = await aiModelService.testModelConnection(id);
  
  const response: ApiResponse = {
    success: true,
    message: '连接测试完成',
    data: result,
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/ai-models/{id}/stats:
 *   get:
 *     summary: 获取AI模型使用统计
 *     tags: [AI Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getAIModelStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const days = parseInt(req.query['days'] as string) || 30;
  const stats = await aiModelService.getModelStats(id, days);
  
  const response: ApiResponse = {
    success: true,
    message: '获取模型统计成功',
    data: stats,
  };
  
  res.json(response);
});

// AI提供商相关控制器方法

/**
 * @swagger
 * /api/ai-providers:
 *   get:
 *     summary: 获取AI提供商列表
 *     tags: [AI Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getAIProviders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query: PaginationQuery = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
    sort: (req.query.sort as 'asc' | 'desc') || 'desc',
    search: req.query.search as string,
    status: req.query.status as string,
  };

  const result = await aiProviderService.getProviders(query);
  res.json(result);
});

/**
 * @swagger
 * /api/ai-providers/active:
 *   get:
 *     summary: 获取活跃的AI提供商列表
 *     tags: [AI Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getActiveAIProviders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const providers = await aiProviderService.getActiveProviders();
  
  const response: ApiResponse = {
    success: true,
    message: '获取活跃提供商列表成功',
    data: providers,
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/ai-providers/{id}:
 *   get:
 *     summary: 获取AI提供商详情
 *     tags: [AI Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getAIProviderById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const provider = await aiProviderService.getProviderById(id);
  
  const response: ApiResponse = {
    success: true,
    message: '获取AI提供商详情成功',
    data: provider,
  };
  
  res.json(response);
});
