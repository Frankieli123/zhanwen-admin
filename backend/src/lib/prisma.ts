import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

// 全局Prisma实例声明
declare global {
  var __prisma: PrismaClient | undefined;
}

// 创建优化的Prisma客户端实例
function createPrismaClient(): PrismaClient {
  const prisma = new PrismaClient({
    // 数据库连接配置
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // 日志配置
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });

  // 监听数据库事件
  prisma.$on('query', (e) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('数据库查询', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    }
  });

  prisma.$on('error', (e) => {
    logger.error('数据库错误', {
      target: e.target,
      message: e.message,
    });
  });

  prisma.$on('info', (e) => {
    logger.info('数据库信息', {
      target: e.target,
      message: e.message,
    });
  });

  prisma.$on('warn', (e) => {
    logger.warn('数据库警告', {
      target: e.target,
      message: e.message,
    });
  });

  return prisma;
}

// 创建全局单例实例
const prisma = globalThis.__prisma ?? createPrismaClient();

// 在开发环境中保存到全局变量，避免热重载时重复创建
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// 连接数据库并记录连接状态
prisma.$connect()
  .then(() => {
    logger.info('数据库连接成功', {
      url: process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@'), // 隐藏密码
    });
  })
  .catch((error) => {
    logger.error('数据库连接失败', error);
  });

// 优雅关闭处理
process.on('beforeExit', async () => {
  logger.info('正在关闭数据库连接...');
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  logger.info('收到SIGINT信号，关闭数据库连接...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('收到SIGTERM信号，关闭数据库连接...');
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
export default prisma;
