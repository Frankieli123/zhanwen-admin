// 首先加载环境变量，必须在任何其他导入之前
import dotenv from 'dotenv';
dotenv.config();

// 验证关键环境变量
const requiredEnvVars = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ 缺少必需的环境变量:', missingVars.join(', '));
  console.error('请检查 .env 文件是否存在并包含所有必需的环境变量');
  process.exit(1);
}

// 进一步校验 ENCRYPTION_KEY 强度（至少32位，且包含字母与数字）
const encryptionKey = process.env['ENCRYPTION_KEY'] as string;
const hasLetter = /[a-zA-Z]/.test(encryptionKey);
const hasNumber = /[0-9]/.test(encryptionKey);
if (encryptionKey.length < 32 || !hasLetter || !hasNumber) {
  console.error('❌ ENCRYPTION_KEY 强度不足：至少32位且需包含字母与数字');
  process.exit(1);
}

console.log('✅ 环境变量验证通过');
console.log('🔐 加密密钥长度:', process.env.ENCRYPTION_KEY?.length);
console.log('🌍 当前环境:', process.env.NODE_ENV || 'development');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

// 初始化全局Prisma实例
import '@/lib/prisma';

import { errorHandler, notFoundHandler } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import apiRoutes from '@/routes/api.routes';
import authRoutes from '@/routes/auth.routes';
import publicRoutes from '@/routes/public.routes';

const app = express();
const PORT = process.env['PORT'] || 3001;

// 信任代理设置（用于处理反向代理的头部信息）
// 设置为1，因为Coolify部署环境通常有一个反向代理
app.set('trust proxy', 1);

// Swagger配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '占卜应用管理后台API',
      version: '1.0.0',
      description: '占卜应用管理后台的RESTful API文档',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: '开发环境',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// 基础中间件
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  credentials: true,
}));

// 请求日志
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// 请求解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 限流
const limiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15分钟
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'), // 限制每个IP 100次请求
  message: {
    error: '请求过于频繁，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // 自定义keyGenerator，安全地处理IP地址，去除端口号
  // 参考: https://github.com/express-rate-limit/express-rate-limit/wiki/Troubleshooting-Proxy-Issues
  keyGenerator: (request, _response) => {
    if (!request.ip) {
      logger.warn('Warning: request.ip is missing!');
      return request.socket.remoteAddress || 'unknown';
    }

    // 去除端口号，防止通过更改端口绕过限流
    const cleanIp = request.ip.replace(/:\d+[^:]*$/, '');
    logger.debug(`Rate limit key: ${cleanIp} (original: ${request.ip})`);
    return cleanIp;
  },
});

// 只对公开接口施加限流，管理端不做限流
app.use('/public', limiter);

// API文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));



// 健康检查
app.get('/health', async (_req, res) => {
  try {
    // 检查数据库连接
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: '服务运行正常',
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        database: 'connected',
      }
    });
  } catch (error) {
    logger.error('健康检查失败', error);
    res.status(503).json({
      success: false,
      message: '服务不可用',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    });
  }
});

// 数据库连接状态监控端点
app.get('/api/db-status', async (_req, res) => {
  try {
    const { prisma } = await import('@/lib/prisma');
    const startTime = Date.now();

    // 执行简单查询测试连接
    await prisma.$queryRaw`SELECT 1`;
    const queryTime = Date.now() - startTime;

    // 获取数据库统计信息
    const [userCount, modelCount, templateCount] = await Promise.all([
      prisma.adminUser.count(),
      prisma.aiModel.count(),
      prisma.promptTemplate.count(),
    ]);

    res.json({
      success: true,
      message: '数据库连接正常',
      data: {
        status: 'connected',
        queryTime: `${queryTime}ms`,
        timestamp: new Date().toISOString(),
        statistics: {
          users: userCount,
          aiModels: modelCount,
          promptTemplates: templateCount,
        }
      }
    });
  } catch (error) {
    logger.error('数据库状态检查失败', error);
    res.status(503).json({
      success: false,
      message: '数据库连接失败',
      data: {
        status: 'disconnected',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    });
  }
});

// 代理配置测试端点（仅在开发环境启用）
if (process.env['NODE_ENV'] === 'development') {
  app.get('/debug/ip', (request, response) => {
    response.json({
      ip: request.ip,
      ips: request.ips,
      'x-forwarded-for': request.headers['x-forwarded-for'],
      'x-real-ip': request.headers['x-real-ip'],
      remoteAddress: request.socket.remoteAddress,
      socket: {
        remoteAddress: request.socket.remoteAddress,
      },
    });
  });
}

// 路由
app.use('/auth', authRoutes);
app.use('/', publicRoutes);     // 公开API路由（使用API Key认证）- 必须在前面
app.use('/api', apiRoutes);     // 管理API路由（使用JWT认证）

// 静态文件服务 - 服务前端构建文件
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// SPA 路由回退 - 所有非 API 路由都返回 index.html
app.get('*', (req, res, next) => {
  // 跳过 API 路由和静态资源
  if (req.path.startsWith('/api') ||
      req.path.startsWith('/auth') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/api-docs') ||
      req.path.includes('.')) {
    return next();
  }

  // 返回前端应用的 index.html
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

// 错误处理中间件
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务器
const server = app.listen(PORT, () => {
  logger.info(`🚀 服务器启动成功`);
  logger.info(`📍 端口: ${PORT}`);
  logger.info(`🌍 环境: ${process.env['NODE_ENV'] || 'development'}`);
  logger.info(`📚 API文档: http://localhost:${PORT}/api-docs`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，开始优雅关闭...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，开始优雅关闭...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

export default app;
