import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

/**
 * 操作日志中间件
 */
export const auditLog = (action: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 保存原始的 res.json 方法
    const originalJson = res.json;
    let responseData: any;
    let oldValues: any;

    // 如果是更新或删除操作，先获取原始数据
    if ((action === 'update' || action === 'delete') && req.params.id) {
      try {
        const resourceId = parseInt(req.params.id);
        
        // 根据资源类型获取原始数据
        switch (resourceType) {
          case 'ai_model':
            oldValues = await prisma.aiModel.findUnique({
              where: { id: resourceId }
            });
            break;
          case 'prompt_template':
            oldValues = await prisma.promptTemplate.findUnique({
              where: { id: resourceId }
            });
            break;
          case 'app_config':
            oldValues = await prisma.appConfig.findUnique({
              where: { id: resourceId }
            });
            break;
          case 'hexagram_data':
            oldValues = await prisma.hexagramData.findUnique({
              where: { id: resourceId }
            });
            break;
          case 'admin_user':
            oldValues = await prisma.adminUser.findUnique({
              where: { id: resourceId },
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                permissions: true,
                isActive: true,
                // 不记录密码哈希
              }
            });
            break;
        }
      } catch (error) {
        logger.warn('获取原始数据失败', { error, resourceType, resourceId: req.params.id });
      }
    }

    // 重写 res.json 方法以捕获响应数据
    res.json = function(data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // 继续执行下一个中间件
    next();

    // 在响应完成后记录操作日志
    res.on('finish', async () => {
      try {
        // 只记录成功的操作
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          const logData = {
            userId: req.user.userId,
            action,
            resourceType,
            resourceId: req.params.id || responseData?.data?.id?.toString(),
            oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
            newValues: action === 'delete' ? null : (req.body || null),
            ipAddress: getClientIp(req),
            userAgent: req.get('User-Agent') || null,
          };

          await prisma.operationLog.create({
            data: logData
          });

          logger.info('操作日志记录', {
            user: req.user.username,
            action,
            resourceType,
            resourceId: logData.resourceId,
            ip: logData.ipAddress,
          });
        }
      } catch (error) {
        logger.error('记录操作日志失败', error);
      }
    });
  };
};

/**
 * 获取客户端IP地址
 */
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIp = req.headers['x-real-ip'] as string;
  const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return remoteAddress || 'unknown';
};

/**
 * 批量操作日志中间件
 */
export const batchAuditLog = (action: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json;
    let responseData: any;

    // 重写 res.json 方法
    res.json = function(data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    next();

    // 在响应完成后记录批量操作日志
    res.on('finish', async () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          const ids = req.body.ids || [];
          
          if (Array.isArray(ids) && ids.length > 0) {
            const logData = {
              userId: req.user.userId,
              action: `batch_${action}`,
              resourceType,
              resourceId: ids.join(','),
              oldValues: null,
              newValues: { ids, data: req.body.data },
              ipAddress: getClientIp(req),
              userAgent: req.get('User-Agent') || null,
            };

            await prisma.operationLog.create({
              data: logData
            });

            logger.info('批量操作日志记录', {
              user: req.user.username,
              action: `batch_${action}`,
              resourceType,
              count: ids.length,
              ip: logData.ipAddress,
            });
          }
        }
      } catch (error) {
        logger.error('记录批量操作日志失败', error);
      }
    });
  };
};

/**
 * 敏感操作日志中间件（如密码修改、权限变更等）
 */
export const sensitiveAuditLog = (action: string, description?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json;
    let responseData: any;

    res.json = function(data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    next();

    res.on('finish', async () => {
      try {
        if (req.user) {
          const logData = {
            userId: req.user.userId,
            action: `sensitive_${action}`,
            resourceType: 'security',
            resourceId: req.params.id || req.user.userId.toString(),
            oldValues: null,
            newValues: {
              description: description || action,
              success: res.statusCode >= 200 && res.statusCode < 300,
              statusCode: res.statusCode,
            },
            ipAddress: getClientIp(req),
            userAgent: req.get('User-Agent') || null,
          };

          await prisma.operationLog.create({
            data: logData
          });

          // 敏感操作总是记录警告级别日志
          logger.warn('敏感操作执行', {
            user: req.user.username,
            action,
            description,
            success: res.statusCode >= 200 && res.statusCode < 300,
            ip: logData.ipAddress,
          });
        }
      } catch (error) {
        logger.error('记录敏感操作日志失败', error);
      }
    });
  };
};
