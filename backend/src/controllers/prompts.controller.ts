import { Request, Response } from 'express';
import { PromptTemplateService } from '@/services/prompt-template.service';
import { asyncHandler } from '@/middleware/error.middleware';
import { ApiResponse, PaginationQuery } from '@/types/api.types';

const promptTemplateService = new PromptTemplateService();

/**
 * @swagger
 * components:
 *   schemas:
 *     PromptTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [system, user, format]
 *         category:
 *           type: string
 *         status:
 *           type: string
 *           enum: [draft, active, deprecated]
 *         version:
 *           type: integer
 */

/**
 * @swagger
 * /api/prompts:
 *   get:
 *     summary: 获取提示词模板列表
 *     tags: [Prompt Templates]
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
 *         name: category
 *         schema:
 *           type: string
 *         description: 分类筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, deprecated]
 *         description: 状态筛选
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getPromptTemplates = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query: PaginationQuery = {
    page: parseInt(req.query['page'] as string) || 1,
    limit: parseInt(req.query['limit'] as string) || 10,
    sort: (req.query['sort'] as 'asc' | 'desc') || 'desc',
    search: req.query['search'] as string,
    status: req.query['status'] as string,
    category: req.query['category'] as string,
  };

  const result = await promptTemplateService.getTemplates(query);
  
  res.json(result);
});

/**
 * @swagger
 * /api/prompts/{id}:
 *   get:
 *     summary: 获取提示词模板详情
 *     tags: [Prompt Templates]
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
 *         description: 模板不存在
 */
export const getPromptTemplateById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const template = await promptTemplateService.getTemplateById(id);
  
  const response: ApiResponse = {
    success: true,
    message: '获取提示词模板详情成功',
    data: template,
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/prompts:
 *   post:
 *     summary: 创建提示词模板
 *     tags: [Prompt Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [system, user, format]
 *               category:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *               userPromptTemplate:
 *                 type: string
 *               formatInstructions:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
export const createPromptTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const template = await promptTemplateService.createTemplate(req.body, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: '提示词模板创建成功',
    data: template,
  };
  
  res.status(201).json(response);
});

/**
 * @swagger
 * /api/prompts/{id}:
 *   put:
 *     summary: 更新提示词模板
 *     tags: [Prompt Templates]
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
export const updatePromptTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const template = await promptTemplateService.updateTemplate(id, req.body, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: '提示词模板更新成功',
    data: template,
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/prompts/{id}:
 *   delete:
 *     summary: 删除提示词模板
 *     tags: [Prompt Templates]
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
export const deletePromptTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  await promptTemplateService.deleteTemplate(id, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: '提示词模板删除成功',
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/prompts/batch:
 *   delete:
 *     summary: 批量删除提示词模板
 *     tags: [Prompt Templates]
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
export const batchDeletePromptTemplates = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body;
  await promptTemplateService.batchDeleteTemplates(ids, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: '提示词模板批量删除成功',
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/prompts/{id}/activate:
 *   post:
 *     summary: 激活提示词模板
 *     tags: [Prompt Templates]
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
 *         description: 激活成功
 */
export const activatePromptTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const template = await promptTemplateService.activateTemplate(id, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: '提示词模板激活成功',
    data: template,
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/prompts/{name}/versions:
 *   get:
 *     summary: 获取模板版本历史
 *     tags: [Prompt Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 获取成功
 */
export const getPromptTemplateVersions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const name = req.params['name'] || '';
  const versions = await promptTemplateService.getTemplateVersions(name);
  
  const response: ApiResponse = {
    success: true,
    message: '获取模板版本历史成功',
    data: versions,
  };
  
  res.json(response);
});

/**
 * @swagger
 * /api/prompts/{id}/duplicate:
 *   post:
 *     summary: 复制提示词模板
 *     tags: [Prompt Templates]
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
 *               - newName
 *             properties:
 *               newName:
 *                 type: string
 *     responses:
 *       201:
 *         description: 复制成功
 */
export const duplicatePromptTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const { newName } = req.body;
  const template = await promptTemplateService.duplicateTemplate(id, newName, req.user!.userId);
  
  const response: ApiResponse = {
    success: true,
    message: '提示词模板复制成功',
    data: template,
  };
  
  res.status(201).json(response);
});

/**
 * @swagger
 * /api/prompts/{id}/stats:
 *   get:
 *     summary: 获取提示词模板使用统计
 *     tags: [Prompt Templates]
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
export const getPromptTemplateStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params['id'] || '0');
  const stats = await promptTemplateService.getTemplateStats(id);
  
  const response: ApiResponse = {
    success: true,
    message: '获取模板统计成功',
    data: stats,
  };
  
  res.json(response);
});
