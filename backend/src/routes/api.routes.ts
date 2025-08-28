import { Router } from 'express';
import aiModelsRoutes from './ai-models.routes';
import promptsRoutes from './prompts.routes';
import configsRoutes from './configs.routes';
import hexagramsRoutes from './hexagrams.routes';
import analyticsRoutes from './analytics.routes';
import apiKeysRoutes from './apiKeys.routes';
import usageRoutes from './usage.routes';

const router = Router();

// 挂载各个模块的路由（这些都需要JWT认证）
router.use(aiModelsRoutes);
router.use(promptsRoutes);
router.use(configsRoutes);
router.use(hexagramsRoutes);
router.use(analyticsRoutes);
router.use(apiKeysRoutes);
router.use(usageRoutes);

export default router;
