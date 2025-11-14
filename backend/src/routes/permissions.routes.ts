import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateToken, requirePermission } from '@/middleware/auth.middleware';
import { successResponse } from '@/utils/response';

const router = Router();

// 所有路由均需要JWT认证
router.use(authenticateToken);

// 运行时扫描 routes 目录，收集 requirePermission/requireApiPermission 的字符串字面量
function collectPermissions() {
  const jwtSet = new Set<string>();
  const apiKeySet = new Set<string>();

  const candidateDirs = new Set<string>([
    // 当前文件所在目录（开发: src/routes，生产: dist/routes）
    path.resolve(__dirname),
    // 兼容通过进程工作目录定位（开发环境）
    path.resolve(process.cwd(), 'src', 'routes'),
    // 兼容生产编译输出目录
    path.resolve(process.cwd(), 'dist', 'routes'),
  ]);

  const exts = new Set(['.ts', '.js', '.mjs', '.cjs']);

  const listFiles = (dir: string) => {
    const results: string[] = [];
    try {
      if (!fs.existsSync(dir)) return results;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // 仅递归 routes 子目录
          results.push(...listFiles(full));
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (exts.has(ext)) results.push(full);
        }
      }
    } catch {
      // 忽略不可读目录/文件
    }
    return results;
  };

  const jwtRegex = /requirePermission\s*\(\s*['"`]([^-'"`]+)['"`]\s*\)/g;
  const apiRegex = /requireApiPermission\s*\(\s*['"`]([^-'"`]+)['"`]\s*\)/g;
  const publicRegex = /authPublicAccess\s*\(\s*['"`]([^-'"`]+)['"`]\s*\)/g;

  for (const dir of candidateDirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      const files = listFiles(dir);
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          let m: RegExpExecArray | null;
          while ((m = jwtRegex.exec(content)) !== null) {
            const p = m[1].trim();
            if (p) jwtSet.add(p);
          }
          while ((m = apiRegex.exec(content)) !== null) {
            const p = m[1].trim();
            if (p) apiKeySet.add(p);
          }
          while ((m = publicRegex.exec(content)) !== null) {
            const p = m[1].trim();
            if (p) apiKeySet.add(p);
          }
        } catch {
          // 单文件读取失败忽略
        }
      }
    } catch {
      // 单目录读取失败忽略
    }
  }

  const jwt = Array.from(jwtSet).sort();
  const apiKey = Array.from(apiKeySet).sort();
  const all = Array.from(new Set([...jwt, ...apiKey])).sort();

  return { all, jwt, apiKey };
}

/**
 * GET /api/permissions
 * 说明：返回系统中当前使用到的全部权限字符串，包含 JWT 路由权限与 API Key 路由权限分类
 * 权限：需要具备 api_keys:read（通常拥有 API Key 管理权限的管理员）
 */
router.get('/permissions', requirePermission('api_keys:read'), (_req, res) => {
  const result = collectPermissions();
  return res.json(successResponse('权限列表获取成功', result));
});

export default router;
