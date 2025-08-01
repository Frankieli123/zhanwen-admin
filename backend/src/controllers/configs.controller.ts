import { Request, Response } from 'express';
import { AppConfigService } from '@/services/app-config.service';
import { asyncHandler } from '@/middleware/error.middleware';
import { ApiResponse, PaginationQuery } from '@/types/api.types';

const appConfigService = new AppConfigService();

/**
 * @swagger
 * components:
 *   schemas:
 *     AppConfig:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         platform:
 *           type: string
 *           enum: [web, ios, android, wechat]
 *         configKey:
 *           type: string
 *         configValue:
 *           type: object
 *         dataType:
 *           type: string
 *           enum: [json, string, number, boolean]
 *         category:
 *           type: string
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/configs:
 *   get:
 *     summary: 获取应用配置列表
 *     tags: [App Configs]
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
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [web, ios, android, wechat]
 *         description: 平台筛选
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 分类筛选
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
export const getAppConfigs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query: PaginationQuery = {
    page: parseInt(req.query['page'] as string) || 1,
    limit: parseInt(req.query['limit'] as string) || 10,
    sort: (req.query['sort'] as 'asc' | 'desc') || 'desc',
    search: req.query['search'] as string,
    status: req.query['status'] as string,
    category: req.query['category'] as string,
    platform: req.query['platform'] as string,
  };

  const result = await appConfigService.getConfigs(query);
  
  res.json(result);
});

/**
 * @swagger
 * /api/configs/{id}:
 *   get:
 *     summary: 获取应用配置详情
 *     tags: [App Configs]
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
 *         description: 配置不存在
 */
export const getAppConfigById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const config = await appConfigService.getConfigById(id);
  
  const response: ApiResponse = {
    success: true,
    message: '获取应用配置详情成功',
    data: config,
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/configs/platform/{platform}:
 *   get:
 *     summary: 获取平台的所有活跃配置
 *     tags: [App Configs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [web, ios, android, wechat]
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getPlatformConfigs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const platform = req.params['platform'] || '';
  const configs = await appConfigService.getPlatformConfigs(platform);
  
  const response: ApiResponse = {
    success: true,
    message: '获取平台配置成功',
    data: configs,
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/configs:
 *   post:
 *     summary: 创建应用配置
 *     tags: [App Configs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platform
 *               - configKey
 *               - configValue
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [web, ios, android, wechat]
 *               configKey:
 *                 type: string
 *               configValue:
 *                 type: object
 *               dataType:
 *                 type: string
 *                 enum: [json, string, number, boolean]
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               isSensitive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: 创建成功
 */
export const createAppConfig = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const config = await appConfigService.createConfig(req.body, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: '应用配置创建成功',
    data: config,
  };
  
  res.status(201).json(response);
});

/**
 * @swagger
 * /api/configs/{id}:
 *   put:
 *     summary: 更新应用配置
 *     tags: [App Configs]
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
export const updateAppConfig = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const config = await appConfigService.updateConfig(id, req.body, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: '应用配置更新成功',
    data: config,
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/configs/{id}:
 *   delete:
 *     summary: 删除应用配置
 *     tags: [App Configs]
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
export const deleteAppConfig = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  await appConfigService.deleteConfig(id, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: '应用配置删除成功',
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/configs/batch:
 *   delete:
 *     summary: 批量删除应用配置
 *     tags: [App Configs]
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
export const batchDeleteAppConfigs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body;
  await appConfigService.batchDeleteConfigs(ids, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: '应用配置批量删除成功',
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/configs/batch/status:
 *   put:
 *     summary: 批量更新配置状态
 *     tags: [App Configs]
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
 *               - isActive
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 批量更新成功
 */
export const batchUpdateConfigStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ids, isActive } = req.body;
  await appConfigService.batchUpdateStatus(ids, isActive, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: '配置状态批量更新成功',
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/configs/{id}/copy:
 *   post:
 *     summary: 复制配置到其他平台
 *     tags: [App Configs]
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
 *             required:
 *               - targetPlatform
 *             properties:
 *               targetPlatform:
 *                 type: string
 *                 enum: [web, ios, android, wechat]
 *     responses:
 *       201:
 *         description: 复制成功
 */
export const copyConfigToPlatform = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const { targetPlatform } = req.body;
  const config = await appConfigService.copyConfigToPlatform(id, targetPlatform, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: '配置复制成功',
    data: config,
  };
  
  res.status(201).json(response);
});

/**
 * @swagger
 * /api/configs/categories:
 *   get:
 *     summary: 获取配置分类列表
 *     tags: [App Configs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getConfigCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const categories = await appConfigService.getCategories();
  
  const response: ApiResponse = {
    success: true,
    message: '获取配置分类成功',
    data: categories,
  };
  
  res.json(response);
});
