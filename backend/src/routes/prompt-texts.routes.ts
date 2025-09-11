import { Router } from 'express';
import Joi from 'joi';
import { prisma } from '@/lib/prisma';
import { authenticateToken, requirePermission } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';
import { ApiResponse } from '@/types/api.types';

const router = Router();

// 管理端路由：需要管理员 JWT
router.use(authenticateToken);

// 更新三段文本（允许可选修改 name 与 version）
router.put(
  '/prompt-texts/:id',
  requirePermission('prompts:update'),
  validate({
    params: Joi.object({ id: Joi.number().integer().positive().required() }),
    body: Joi.object({
      name: Joi.string().trim().min(1).max(100).optional(),
      version: Joi.string().trim().min(1).max(50).optional(),
      isActive: Joi.boolean().optional(),
      texts: Joi.object({
        system_prompt: Joi.string().allow('').max(1000).required(),
        user_intro: Joi.string().allow('').max(200).required(),
        user_guidelines: Joi.string().allow('').max(4000).required(),
      }).optional(),
    })
      .or('name', 'version', 'texts', 'isActive')
      .required(),
  }),
  async (req, res) => {
    const id = Number(req.params.id);
    const { texts, name, version, isActive } = req.body as any;

    const exists = await prisma.promptText.findFirst({ where: { id } });
    if (!exists) {
      res.status(404).json({ success: false, message: '记录不存在', code: 'PROMPT_TEXTS_NOT_FOUND' });
      return;
    }

    const dataToUpdate: any = {};
    if (texts && typeof texts === 'object') dataToUpdate.texts = texts;
    if (typeof name === 'string' && name.trim()) dataToUpdate.name = String(name).trim();
    if (typeof version === 'string' && version.trim()) dataToUpdate.version = String(version).trim();
    if (typeof isActive === 'boolean') dataToUpdate.isActive = isActive;

    try {
      const updated = await prisma.promptText.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true,
          name: true,
          version: true,
          isActive: true,
          texts: true,
          updatedAt: true,
        }
      });

      const data = {
        id: updated.id,
        name: updated.name,
        version: String(updated.version),
        active: !!updated.isActive,
        texts: {
          system_prompt: (updated as any).texts?.system_prompt ?? '',
          user_intro: (updated as any).texts?.user_intro ?? '',
          user_guidelines: (updated as any).texts?.user_guidelines ?? '',
        },
        updatedAt: updated.updatedAt.toISOString(),
      };

      const response: ApiResponse = { success: true, message: '更新成功', data };
      res.json(response);
    } catch (e: any) {
      // 唯一键冲突 (name, version)
      if (e?.code === 'P2002') {
        res.status(409).json({ success: false, message: '名称与版本已存在，请更换', code: 'PROMPT_TEXTS_DUPLICATE' });
        return;
      }
      throw e;
    }
  }
);

// 删除三段文本
router.delete(
  '/prompt-texts/:id',
  requirePermission('prompts:delete'),
  validate({
    params: Joi.object({ id: Joi.number().integer().positive().required() }),
  }),
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      const deleted = await prisma.promptText.delete({
        where: { id },
        select: { id: true, name: true, version: true },
      });
      const response: ApiResponse = {
        success: true,
        message: '删除成功',
        data: deleted,
      };
      res.json(response);
    } catch (e: any) {
      // P2025: Record not found
      res.status(404).json({ success: false, message: '记录不存在', code: 'PROMPT_TEXTS_NOT_FOUND' });
    }
  }
);

// 复制三段文本（生成新记录，默认 name 加 “-副本-时间戳”，version 继承原值，active 设为 false）
router.post(
  '/prompt-texts/:id/duplicate',
  requirePermission('prompts:create'),
  validate({
    params: Joi.object({ id: Joi.number().integer().positive().required() }),
    body: Joi.object({
      newName: Joi.string().trim().min(1).max(100).optional(),
      newVersion: Joi.string().trim().min(1).max(50).optional(),
    }).optional(),
  }),
  async (req, res) => {
    const id = Number(req.params.id);
    const body = (req.body || {}) as any;

    const source = await prisma.promptText.findFirst({ where: { id } });
    if (!source) {
      res.status(404).json({ success: false, message: '源记录不存在', code: 'PROMPT_TEXTS_NOT_FOUND' });
      return;
    }

    const baseName = body.newName && String(body.newName).trim() ? String(body.newName).trim() : `${source.name}-副本-${Date.now()}`;
    const newVersion = body.newVersion && String(body.newVersion).trim() ? String(body.newVersion).trim() : String(source.version);

    // 确保 (name, version) 唯一，若冲突则追加随机后缀
    let finalName = baseName;
    let conflict = await prisma.promptText.findFirst({ where: { name: finalName, version: newVersion } });
    if (conflict) {
      finalName = `${baseName}-${Math.floor(Math.random() * 10000)}`;
    }

    const created = await prisma.promptText.create({
      data: {
        name: finalName,
        version: newVersion,
        isActive: false,
        texts: source.texts,
        metadata: source.metadata ?? {},
      },
      select: {
        id: true,
        name: true,
        version: true,
        isActive: true,
        texts: true,
        updatedAt: true,
      },
    });

    const data = {
      id: created.id,
      name: created.name,
      version: String(created.version),
      active: !!created.isActive,
      texts: {
        system_prompt: (created as any).texts?.system_prompt ?? '',
        user_intro: (created as any).texts?.user_intro ?? '',
        user_guidelines: (created as any).texts?.user_guidelines ?? '',
      },
      updatedAt: created.updatedAt.toISOString(),
    };

    const response: ApiResponse = { success: true, message: '复制成功', data };
    res.json(response);
  }
);

export default router;
