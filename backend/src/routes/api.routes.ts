import { Router } from 'express';
import aiModelsRoutes from './ai-models.routes';
import promptTextsRoutes from './prompt-texts.routes';
import analyticsRoutes from './analytics.routes';
import usageRoutes from './usage.routes';
import apiKeysRoutes from './apiKeys.routes';
import permissionsRoutes from './permissions.routes';

const router = Router();

// 挂载各个模块的路由（这些都需要JWT认证）
router.use(aiModelsRoutes);
router.use(promptTextsRoutes);
router.use(analyticsRoutes);
router.use(usageRoutes);
router.use(apiKeysRoutes);
router.use(permissionsRoutes);

export default router;
