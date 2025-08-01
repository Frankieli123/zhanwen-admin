import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env['PORT'] || 3001;

// 基础中间件
app.use(helmet());
app.use(cors({
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 100次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use('/api/', limiter);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env['NODE_ENV'] || 'development',
    }
  });
});

// 基础API路由
app.get('/api', (_req, res) => {
  res.json({
    success: true,
    message: '占卜应用管理后台API',
    data: {
      version: '1.0.0',
      endpoints: [
        'GET /health - 健康检查',
        'POST /auth/login - 用户登录',
        'GET /api/ai-models - AI模型列表',
        'GET /api/prompts - 提示词模板列表',
        'GET /api/configs - 应用配置列表',
      ]
    }
  });
});

// 测试数据库连接
app.get('/api/test-db', async (_req, res) => {
  try {
    await prisma.$connect();
    const userCount = await prisma.adminUser.count();
    const modelCount = await prisma.aiModel.count();
    const templateCount = await prisma.promptTemplate.count();
    const configCount = await prisma.appConfig.count();
    
    res.json({
      success: true,
      message: '数据库连接正常',
      data: {
        connected: true,
        counts: {
          users: userCount,
          aiModels: modelCount,
          promptTemplates: templateCount,
          appConfigs: configCount,
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '数据库连接失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 404处理
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    code: 'ROUTE_NOT_FOUND'
  });
});

// 错误处理
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('服务器错误:', error);
  
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || '服务器内部错误',
    code: error.code || 'INTERNAL_ERROR'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 占卜应用管理后台API服务启动成功`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${process.env['NODE_ENV'] || 'development'}`);
  console.log(`📋 API文档: http://localhost:${PORT}/api`);
  console.log(`❤️  健康检查: http://localhost:${PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});
