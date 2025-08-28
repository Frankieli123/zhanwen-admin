 import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { createError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

// 工具方法
const parseDateRange = (start?: string, end?: string): { start: Date; end: Date } => {
  const now = new Date();
  const startDate = start ? new Date(start) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const endDate = end ? new Date(end) : now;
  return { start: startDate, end: endDate };
};

const periodToMs = (days?: number) => (days && days > 0 ? days : 7) * 24 * 60 * 60 * 1000;

const safeBigIntToString = (v: any) => {
  try {
    return typeof v === 'bigint' ? v.toString() : v;
  } catch {
    return String(v);
  }
};

const getFromMeta = (meta: any, keys: string[], fallback?: any) => {
  if (!meta) return fallback;
  for (const k of keys) {
    if (meta[k] !== undefined && meta[k] !== null) return meta[k];
  }
  return fallback;
};

const deriveEndpoint = (metadata: any) => {
  return (
    getFromMeta(metadata, ['endpoint', 'path', 'url']) || '/unknown'
  );
};

const deriveMethod = (metadata: any) => {
  return (getFromMeta(metadata, ['method']) || 'GET').toString().toUpperCase();
};

const deriveStatusCode = (status?: string | null, metadata?: any): number => {
  const codeFromMeta = getFromMeta(metadata, ['statusCode', 'status_code']);
  if (codeFromMeta) return Number(codeFromMeta);
  if (!status) return 200;
  const s = String(status).toLowerCase();
  if (s === 'success' || s === 'ok') return 200;
  if (s === 'error' || s === 'fail' || s === 'failed') return 500;
  return 400;
};

const deviceFromUA = (ua?: string) => {
  if (!ua) return 'other';
  const u = ua.toLowerCase();
  if (u.includes('ipad') || u.includes('tablet')) return 'tablet';
  if (u.includes('mobile') || u.includes('iphone') || u.includes('android')) return 'mobile';
  if (u.includes('windows') || u.includes('macintosh') || u.includes('linux')) return 'desktop';
  return 'other';
};

// GET /usage/logs
export const getApiLogs = async (req: Request, res: Response) => {
  try {
    const {
      apiKeyId,
      clientId,
      startDate,
      endDate,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as any;

    const { start, end } = parseDateRange(startDate, endDate);

    const where: any = {
      createdAt: { gte: start, lte: end },
    };
    if (clientId) where.clientId = String(clientId);
    if (apiKeyId) {
      where.client = { apiKeyId: Number(apiKeyId) };
    }

    const total = await prisma.apiCallLog.count({ where });

    const logs = await prisma.apiCallLog.findMany({
      where,
      orderBy: { [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true,
        clientId: true,
        responseTimeMs: true,
        status: true,
        errorMessage: true,
        metadata: true,
        createdAt: true,
      },
    });

    const data = logs.map((log) => ({
      id: safeBigIntToString(log.id),
      timestamp: log.createdAt,
      clientId: log.clientId,
      endpoint: deriveEndpoint((log as any).metadata),
      method: deriveMethod((log as any).metadata),
      statusCode: deriveStatusCode(log.status, (log as any).metadata),
      responseTime: log.responseTimeMs ?? 0,
      metadata: {
        ip: getFromMeta((log as any).metadata, ['ip', 'ipAddress']),
        userAgent: getFromMeta((log as any).metadata, ['userAgent', 'ua']),
      },
      errorMessage: log.errorMessage || undefined,
    }));

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      message: '获取API调用日志成功',
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error) {
    logger.error('获取API调用日志失败', { error });
    throw createError('获取API调用日志失败', 500);
  }
};

// GET /usage/metrics
export const getUsageMetrics = async (req: Request, res: Response) => {
  try {
    const { apiKeyId, clientId, startDate, endDate, groupBy = 'day' } = req.query as any;
    const { start, end } = parseDateRange(startDate, endDate);

    const whereBase: any = { createdAt: { gte: start, lte: end } };
    if (clientId) whereBase.clientId = String(clientId);
    if (apiKeyId) whereBase.client = { apiKeyId: Number(apiKeyId) };

    const logs = await prisma.apiCallLog.findMany({
      where: whereBase,
      select: { createdAt: true, status: true, responseTimeMs: true, metadata: true },
      orderBy: { createdAt: 'asc' },
    });

    // 生成时间桶
    const buckets: Record<string, { time: string; requests: number; errors: number; avgResponseTime: number; _sumRt: number; _cntRt: number }>= {};
    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const y = d.getFullYear();
      const m = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      if (groupBy === 'hour') {
        return `${y}-${m}-${day} ${pad(d.getHours())}:00`;
      } else if (groupBy === 'week') {
        // 粗略以周一为起点
        const tmp = new Date(d);
        const wd = (tmp.getDay() + 6) % 7; // 周一=0
        tmp.setDate(tmp.getDate() - wd);
        return `${tmp.getFullYear()}-${pad(tmp.getMonth() + 1)}-${pad(tmp.getDate())}`;
      } else if (groupBy === 'month') {
        return `${y}-${m}`;
      }
      return `${y}-${m}-${day}`;
    };

    for (const l of logs) {
      const key = fmt(l.createdAt);
      if (!buckets[key]) buckets[key] = { time: key, requests: 0, errors: 0, avgResponseTime: 0, _sumRt: 0, _cntRt: 0 };
      buckets[key].requests += 1;
      const isError = String(l.status || '').toLowerCase() !== 'success';
      if (isError) buckets[key].errors += 1;
      if (l.responseTimeMs != null) {
        buckets[key]._sumRt += l.responseTimeMs;
        buckets[key]._cntRt += 1;
      }
    }

    const timeSeries = Object.values(buckets)
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((b) => ({
        time: b.time,
        requests: b.requests,
        errors: b.errors,
        avgResponseTime: b._cntRt ? Math.round(b._sumRt / b._cntRt) : 0,
      }));

    res.json({
      success: true,
      message: '获取使用指标成功',
      data: { timeSeries },
    });
  } catch (error) {
    logger.error('获取使用指标失败', { error });
    throw createError('获取使用指标失败', 500);
  }
};

// GET /usage/clients
export const getClientStats = async (req: Request, res: Response) => {
  try {
    const { apiKeyId, period = '30', top = '10' } = req.query as any;
    const now = Date.now();
    const start = new Date(now - periodToMs(Number(period)));

    const where: any = { createdAt: { gte: start } };
    if (apiKeyId) where.client = { apiKeyId: Number(apiKeyId) };

    const logs = await prisma.apiCallLog.findMany({
      where,
      select: { clientId: true, status: true, responseTimeMs: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const byClient: Record<string, any> = {};
    for (const l of logs) {
      if (!l.clientId) continue;
      if (!byClient[l.clientId]) byClient[l.clientId] = { requestCount: 0, errorCount: 0, sumRt: 0, cntRt: 0, lastSeen: l.createdAt };
      const c = byClient[l.clientId];
      c.requestCount += 1;
      if (String(l.status || '').toLowerCase() !== 'success') c.errorCount += 1;
      if (l.responseTimeMs != null) { c.sumRt += l.responseTimeMs; c.cntRt += 1; }
      if (l.createdAt > c.lastSeen) c.lastSeen = l.createdAt;
    }

    const clientIds = Object.keys(byClient);
    let infos: Record<string, any> = {};
    if (clientIds.length > 0) {
      const apps = await prisma.clientApp.findMany({ where: { clientId: { in: clientIds } } });
      infos = Object.fromEntries(apps.map(a => [a.clientId, { name: a.name, version: a.version }]));
    }

    const data = clientIds.map((id) => ({
      clientId: id,
      info: infos[id] || {},
      requestCount: byClient[id].requestCount,
      errorRate: byClient[id].requestCount ? Math.round((byClient[id].errorCount / byClient[id].requestCount) * 100) : 0,
      avgResponseTime: byClient[id].cntRt ? Math.round(byClient[id].sumRt / byClient[id].cntRt) : 0,
      lastSeen: byClient[id].lastSeen,
    }))
    .sort((a, b) => b.requestCount - a.requestCount)
    .slice(0, Number(top));

    res.json({ success: true, message: '获取客户端统计成功', data });
  } catch (error) {
    logger.error('获取客户端统计失败', { error });
    throw createError('获取客户端统计失败', 500);
  }
};

// GET /usage/realtime
export const getRealtimeStats = async (req: Request, res: Response) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0); // 今日

    const logsToday = await prisma.apiCallLog.findMany({
      where: { createdAt: { gte: start } },
      select: { clientId: true, status: true, responseTimeMs: true, createdAt: true },
    });

    const total = logsToday.length;
    const errors = logsToday.filter(l => String(l.status || '').toLowerCase() !== 'success').length;
    const avgRt = logsToday.filter(l => l.responseTimeMs != null).reduce((s, l) => s + (l.responseTimeMs || 0), 0) / (logsToday.filter(l => l.responseTimeMs != null).length || 1);
    const activeClients = new Set(logsToday.map(l => l.clientId).filter(Boolean)).size;

    // 同期增长（与昨天对比）
    const yesterdayStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(start.getTime() - 1);
    const yCount = await prisma.apiCallLog.count({ where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } } });
    const growth = yCount === 0 ? 100 : Math.round(((total - yCount) / yCount) * 100);

    res.json({
      success: true,
      message: '获取实时统计成功',
      data: {
        todayRequests: total,
        requestsGrowth: growth,
        activeClients,
        avgResponseTime: Math.round(avgRt || 0),
        errorRate: total ? Math.round((errors / total) * 100) : 0,
      },
    });
  } catch (error) {
    logger.error('获取实时统计失败', { error });
    throw createError('获取实时统计失败', 500);
  }
};

// GET /usage/errors
export const getErrorAnalysis = async (req: Request, res: Response) => {
  try {
    const { apiKeyId, period = '7', groupBy = 'status' } = req.query as any;
    const start = new Date(Date.now() - periodToMs(Number(period)));

    const where: any = { createdAt: { gte: start } };
    if (apiKeyId) where.client = { apiKeyId: Number(apiKeyId) };

    const logs = await prisma.apiCallLog.findMany({
      where,
      select: { createdAt: true, status: true, metadata: true, errorMessage: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const errorLogs = logs.filter(l => String(l.status || '').toLowerCase() !== 'success');
    const distribution: Record<string, number> = {};

    for (const l of errorLogs) {
      let key: string;
      if (groupBy === 'endpoint') key = deriveEndpoint((l as any).metadata);
      else if (groupBy === 'client') key = getFromMeta((l as any).metadata, ['clientId']) || 'unknown';
      else key = String(deriveStatusCode(l.status, (l as any).metadata));
      distribution[key] = (distribution[key] || 0) + 1;
    }

    const recent = errorLogs.slice(0, 50).map(l => ({
      timestamp: l.createdAt,
      endpoint: deriveEndpoint((l as any).metadata),
      statusCode: deriveStatusCode(l.status, (l as any).metadata),
      message: l.errorMessage || 'Error',
    }));

    res.json({
      success: true,
      message: '获取错误分析成功',
      data: { total: errorLogs.length, distribution, recent },
    });
  } catch (error) {
    logger.error('获取错误分析失败', { error });
    throw createError('获取错误分析失败', 500);
  }
};

// GET /usage/performance
export const getPerformanceMetrics = async (req: Request, res: Response) => {
  try {
    const { apiKeyId, period = '7', percentiles } = req.query as any;
    const start = new Date(Date.now() - periodToMs(Number(period)));

    const where: any = { createdAt: { gte: start }, responseTimeMs: { not: null } };
    if (apiKeyId) where.client = { apiKeyId: Number(apiKeyId) };

    const logs = await prisma.apiCallLog.findMany({
      where,
      select: { responseTimeMs: true },
      orderBy: { createdAt: 'asc' },
      take: 5000,
    });

    const times = logs.map(l => l.responseTimeMs!).filter(Boolean).sort((a, b) => a - b);
    const pct = (p: number) => {
      if (times.length === 0) return 0;
      const idx = Math.floor((p / 100) * (times.length - 1));
      return times[idx];
    };

    const ps = Array.isArray(percentiles) ? percentiles.map((x: any) => Number(x)) : [50, 90, 95, 99];
    const percentileMap: Record<string, number> = {};
    for (const p of ps) percentileMap['p' + p] = Math.round(pct(p));

    res.json({
      success: true,
      message: '获取性能指标成功',
      data: {
        count: times.length,
        avgResponseTime: times.length ? Math.round(times.reduce((s, v) => s + v, 0) / times.length) : 0,
        minResponseTime: times[0] || 0,
        maxResponseTime: times[times.length - 1] || 0,
        percentiles: percentileMap,
      },
    });
  } catch (error) {
    logger.error('获取性能指标失败', { error });
    throw createError('获取性能指标失败', 500);
  }
};

// GET /usage/endpoints
export const getEndpointStats = async (req: Request, res: Response) => {
  try {
    const { apiKeyId, period = '7', top = '10' } = req.query as any;
    const start = new Date(Date.now() - periodToMs(Number(period)));

    const where: any = { createdAt: { gte: start } };
    if (apiKeyId) where.client = { apiKeyId: Number(apiKeyId) };

    const logs = await prisma.apiCallLog.findMany({
      where,
      select: { status: true, responseTimeMs: true, metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    type Agg = { count: number; success: number; sumRt: number; cntRt: number; times: number[] };
    const map = new Map<string, Agg>();

    for (const l of logs) {
      const endpoint = deriveEndpoint((l as any).metadata);
      const method = deriveMethod((l as any).metadata);
      const key = `${method} ${endpoint}`;
      if (!map.has(key)) map.set(key, { count: 0, success: 0, sumRt: 0, cntRt: 0, times: [] });
      const m = map.get(key)!;
      m.count += 1;
      if (String(l.status || '').toLowerCase() === 'success') m.success += 1;
      if (l.responseTimeMs != null) { m.sumRt += l.responseTimeMs; m.cntRt += 1; m.times.push(l.responseTimeMs); }
    }

    const toP = (arr: number[], p: number) => {
      if (!arr.length) return 0;
      const idx = Math.floor((p / 100) * (arr.length - 1));
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[idx];
    };

    const data = Array.from(map.entries())
      .map(([k, v]) => {
        const [method, endpoint] = k.split(' ');
        return {
          endpoint,
          method,
          count: v.count,
          successRate: v.count ? Math.round((v.success / v.count) * 100) : 0,
          avgTime: v.cntRt ? Math.round(v.sumRt / v.cntRt) : 0,
          p95Time: Math.round(toP(v.times, 95)),
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, Number(top));

    res.json({ success: true, message: '获取端点统计成功', data });
  } catch (error) {
    logger.error('获取端点统计失败', { error });
    throw createError('获取端点统计失败', 500);
  }
};

// GET /usage/geo
export const getGeoAnalysis = async (req: Request, res: Response) => {
  try {
    const { apiKeyId, period = '7' } = req.query as any;
    const start = new Date(Date.now() - periodToMs(Number(period)));

    const where: any = { createdAt: { gte: start } };
    if (apiKeyId) where.client = { apiKeyId: Number(apiKeyId) };

    const logs = await prisma.apiCallLog.findMany({
      where,
      select: { metadata: true },
      take: 5000,
      orderBy: { createdAt: 'desc' },
    });

    const map: Record<string, number> = {};
    for (const l of logs) {
      const meta = (l as any).metadata || {};
      const raw = getFromMeta(meta, ['country', 'countryCode', 'region', 'city', 'location'], 'Unknown');
      const locStr = String(raw ?? '').trim();
      // 统一规范化占位符（例如 Unknown1/unknown/N/A/null 等）
      const normalized = /^(unknown|n\/a|null|undefined|unknown\d*)$/i.test(locStr) ? 'Unknown' : locStr;
      map[normalized] = (map[normalized] || 0) + 1;
    }

    const data = Object.entries(map)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ success: true, message: '获取地理分析成功', data });
  } catch (error) {
    logger.error('获取地理分析失败', { error });
    throw createError('获取地理分析失败', 500);
  }
};

// GET /usage/devices
export const getDeviceAnalysis = async (req: Request, res: Response) => {
  try {
    const { apiKeyId, period = '7' } = req.query as any;
    const start = new Date(Date.now() - periodToMs(Number(period)));

    const where: any = { createdAt: { gte: start } };
    if (apiKeyId) where.client = { apiKeyId: Number(apiKeyId) };

    const logs = await prisma.apiCallLog.findMany({
      where,
      select: { metadata: true },
      take: 5000,
      orderBy: { createdAt: 'desc' },
    });

    const counts = { desktop: 0, mobile: 0, tablet: 0, other: 0 };
    for (const l of logs) {
      const ua = getFromMeta((l as any).metadata, ['userAgent', 'ua']);
      const d = deviceFromUA(ua);
      (counts as any)[d] += 1;
    }

    res.json({ success: true, message: '获取设备分析成功', data: counts });
  } catch (error) {
    logger.error('获取设备分析失败', { error });
    throw createError('获取设备分析失败', 500);
  }
};

// GET /usage/export
export const exportUsageReport = async (req: Request, res: Response) => {
  try {
    const { type = 'summary', format = 'json', startDate, endDate, apiKeyId } = req.query as any;
    const { start, end } = parseDateRange(startDate, endDate);

    if (type === 'logs') {
      // 导出近期日志（最多1000条）
      const where: any = { createdAt: { gte: start, lte: end } };
      if (apiKeyId) where.client = { apiKeyId: Number(apiKeyId) };

      const logs = await prisma.apiCallLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 1000,
        select: { id: true, clientId: true, createdAt: true, metadata: true, status: true, responseTimeMs: true, errorMessage: true },
      });

      const rows = logs.map(l => ({
        id: safeBigIntToString(l.id),
        timestamp: l.createdAt.toISOString(),
        clientId: l.clientId,
        endpoint: deriveEndpoint((l as any).metadata),
        method: deriveMethod((l as any).metadata),
        statusCode: deriveStatusCode(l.status, (l as any).metadata),
        responseTime: l.responseTimeMs ?? 0,
        errorMessage: l.errorMessage || '',
      }));

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="usage-logs.pdf"');
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        doc.pipe(res);
        doc.fontSize(16).text('Usage Logs', { bold: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Range: ${start.toISOString()} ~ ${end.toISOString()}`);
        if (apiKeyId) doc.text(`API Key ID: ${apiKeyId}`);
        doc.moveDown();
        doc.fontSize(10).text('ID | Timestamp | Client | Method | Endpoint | Status | Time(ms)');
        doc.moveDown(0.2);
        rows.forEach((r) => {
          const line = `${r.id} | ${r.timestamp} | ${r.clientId ?? ''} | ${r.method} | ${r.endpoint} | ${r.statusCode} | ${r.responseTime}`;
          doc.fontSize(9).text(line, { width: 520 });
        });
        doc.end();
        return;
      }

      if (format === 'csv') {
        const headers = ['id', 'timestamp', 'clientId', 'endpoint', 'method', 'statusCode', 'responseTime', 'errorMessage'];
        const csv = [headers.join(','), ...rows.map(r => headers.map(h => String((r as any)[h]).replace(/"/g, '""')).map(v => `"${v}"`).join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="usage-logs.csv"`);
        res.send(csv);
        return;
      }

      res.json({ success: true, message: '导出日志成功', data: rows });
      return;
    }

    if (type === 'metrics') {
      const groupBy = (req.query as any).groupBy || 'day';
      if (format === 'pdf') {
        const whereBase: any = { createdAt: { gte: start, lte: end } };
        if (apiKeyId) whereBase.client = { apiKeyId: Number(apiKeyId) };
        const logs = await prisma.apiCallLog.findMany({
          where: whereBase,
          select: { createdAt: true, status: true, responseTimeMs: true },
          orderBy: { createdAt: 'asc' },
        });

        const buckets: Record<string, { time: string; requests: number; errors: number; avgResponseTime: number; _sumRt: number; _cntRt: number }> = {};
        const fmt = (d: Date) => {
          const pad = (n: number) => String(n).padStart(2, '0');
          const y = d.getFullYear();
          const m = pad(d.getMonth() + 1);
          const day = pad(d.getDate());
          if (groupBy === 'hour') return `${y}-${m}-${day} ${pad(d.getHours())}:00`;
          if (groupBy === 'week') {
            const tmp = new Date(d);
            const wd = (tmp.getDay() + 6) % 7;
            tmp.setDate(tmp.getDate() - wd);
            return `${tmp.getFullYear()}-${pad(tmp.getMonth() + 1)}-${pad(tmp.getDate())}`;
          }
          if (groupBy === 'month') return `${y}-${m}`;
          return `${y}-${m}-${day}`;
        };

        for (const l of logs) {
          const key = fmt(l.createdAt);
          if (!buckets[key]) buckets[key] = { time: key, requests: 0, errors: 0, avgResponseTime: 0, _sumRt: 0, _cntRt: 0 };
          buckets[key].requests += 1;
          const isError = String(l.status || '').toLowerCase() !== 'success';
          if (isError) buckets[key].errors += 1;
          if (l.responseTimeMs != null) { buckets[key]._sumRt += l.responseTimeMs; buckets[key]._cntRt += 1; }
        }

        const series = Object.values(buckets).sort((a, b) => a.time.localeCompare(b.time)).map(b => ({
          time: b.time,
          requests: b.requests,
          errors: b.errors,
          avgResponseTime: b._cntRt ? Math.round(b._sumRt / b._cntRt) : 0,
        }));

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="usage-metrics.pdf"');
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        doc.pipe(res);
        doc.fontSize(16).text('Usage Metrics', { bold: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Group By: ${groupBy}`);
        doc.fontSize(10).text(`Range: ${start.toISOString()} ~ ${end.toISOString()}`);
        if (apiKeyId) doc.text(`API Key ID: ${apiKeyId}`);
        doc.moveDown();
        doc.fontSize(10).text('Time | Requests | Errors | AvgResponseTime(ms)');
        doc.moveDown(0.2);
        series.forEach((p) => {
          doc.fontSize(9).text(`${p.time} | ${p.requests} | ${p.errors} | ${p.avgResponseTime}`);
        });
        doc.end();
        return;
      }
      // 其他格式复用 metrics 逻辑
      const fakeReq: any = { ...req, query: { ...req.query, groupBy } };
      await getUsageMetrics(fakeReq as Request, res);
      return;
    }

    // summary 汇总
    const where: any = { createdAt: { gte: start, lte: end } };
    if (apiKeyId) where.client = { apiKeyId: Number(apiKeyId) };

    const [count, errorCount, avgRtAgg] = await Promise.all([
      prisma.apiCallLog.count({ where }),
      prisma.apiCallLog.count({ where: { ...where, status: { not: 'success' } } }),
      prisma.apiCallLog.aggregate({ where, _avg: { responseTimeMs: true } }),
    ]);

    const summary = {
      range: { start, end },
      totalRequests: count,
      errorRate: count ? Math.round((errorCount / count) * 100) : 0,
      avgResponseTime: Math.round((avgRtAgg._avg.responseTimeMs || 0)),
    };

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="usage-summary.pdf"');
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      doc.pipe(res);
      doc.fontSize(16).text('Usage Summary', { bold: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Range: ${summary.range.start.toISOString()} ~ ${summary.range.end.toISOString()}`);
      if (apiKeyId) doc.text(`API Key ID: ${apiKeyId}`);
      doc.moveDown();
      doc.fontSize(12).text(`Total Requests: ${summary.totalRequests}`);
      doc.fontSize(12).text(`Error Rate: ${summary.errorRate}%`);
      doc.fontSize(12).text(`Avg Response Time: ${summary.avgResponseTime} ms`);
      doc.end();
      return;
    }

    if (format === 'csv') {
      const headers = ['start', 'end', 'totalRequests', 'errorRate', 'avgResponseTime'];
      const csv = [headers.join(','), [summary.range.start.toISOString(), summary.range.end.toISOString(), summary.totalRequests, summary.errorRate, summary.avgResponseTime].join(',')].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="usage-summary.csv"`);
      res.send(csv);
      return;
    }

    res.json({ success: true, message: '导出汇总成功', data: summary });
  } catch (error) {
    logger.error('导出使用报告失败', { error });
    throw createError('导出使用报告失败', 500);
  }
};
