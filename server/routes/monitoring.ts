import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

const router = Router();

const serverStartTime = Date.now();

const monitoringLogs: Array<{
  timestamp: number;
  type: string;
  message: string;
  details?: Record<string, unknown>;
  clientId?: string;
  userAgent?: string;
  ip?: string;
}> = [];

const MAX_SERVER_LOGS = 500;

const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many health check requests' },
});

const logsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many log requests' },
});

router.get('/health', healthLimiter, (_req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  
  res.json({
    ok: true,
    timestamp: Date.now(),
    uptime,
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage().heapUsed,
  });
});

const logSchema = z.object({
  timestamp: z.number(),
  type: z.enum(['error', 'warning', 'info', 'heartbeat', 'recovery']),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

const logsBodySchema = z.object({
  logs: z.array(logSchema).max(50),
});

router.post('/monitoring/logs', logsLimiter, (req, res) => {
  try {
    const parsed = logsBodySchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid log format',
        details: parsed.error.issues,
      });
    }
    
    const clientId = req.headers['x-client-id'] as string || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    
    for (const log of parsed.data.logs) {
      monitoringLogs.push({
        ...log,
        clientId,
        userAgent,
        ip,
      });
    }
    
    while (monitoringLogs.length > MAX_SERVER_LOGS) {
      monitoringLogs.shift();
    }
    
    console.log(`[Monitoring] Received ${parsed.data.logs.length} logs from client ${clientId}`);
    
    res.json({ 
      success: true, 
      received: parsed.data.logs.length,
      total: monitoringLogs.length,
    });
  } catch (error) {
    console.error('[Monitoring] Error processing logs:', error);
    res.status(500).json({ error: 'Failed to process logs' });
  }
});

router.get('/monitoring/logs', logsLimiter, (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Monitoring logs only available in development' });
  }
  
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const type = req.query.type as string;
  const since = parseInt(req.query.since as string) || 0;
  
  let filteredLogs = monitoringLogs;
  
  if (type) {
    filteredLogs = filteredLogs.filter(log => log.type === type);
  }
  
  if (since) {
    filteredLogs = filteredLogs.filter(log => log.timestamp > since);
  }
  
  const recentLogs = filteredLogs.slice(-limit);
  
  res.json({
    logs: recentLogs,
    total: monitoringLogs.length,
    filtered: filteredLogs.length,
  });
});

router.delete('/monitoring/logs', logsLimiter, (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Monitoring logs only available in development' });
  }
  
  const count = monitoringLogs.length;
  monitoringLogs.length = 0;
  
  res.json({
    success: true,
    deleted: count,
  });
});

router.get('/monitoring/stats', logsLimiter, (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Monitoring stats only available in development' });
  }
  
  const stats = {
    totalLogs: monitoringLogs.length,
    byType: {} as Record<string, number>,
    last24h: 0,
    lastHour: 0,
    uniqueClients: new Set<string>(),
  };
  
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  for (const log of monitoringLogs) {
    stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
    
    if (log.timestamp > oneHourAgo) {
      stats.lastHour++;
    }
    if (log.timestamp > oneDayAgo) {
      stats.last24h++;
    }
    if (log.clientId) {
      stats.uniqueClients.add(log.clientId);
    }
  }
  
  res.json({
    ...stats,
    uniqueClients: stats.uniqueClients.size,
    serverUptime: Math.floor((Date.now() - serverStartTime) / 1000),
  });
});

export default router;
