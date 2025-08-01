import { Router } from 'express';
import aiModelsRoutes from './ai-models.routes';
import promptsRoutes from './prompts.routes';
import configsRoutes from './configs.routes';
// import hexagramsRoutes from './hexagrams.routes';
// import analyticsRoutes from './analytics.routes';

const router = Router();

// 挂载各个模块的路由
router.use(aiModelsRoutes);
router.use(promptsRoutes);
router.use(configsRoutes);
// router.use(hexagramsRoutes);
// router.use(analyticsRoutes);

export default router;
