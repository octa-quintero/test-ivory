import type { Request, Response } from 'express';
import { redis } from '../config/redis';

const startedAt = new Date().toISOString();

export function getHealth(_req: Request, res: Response): void {
  const uptime = Math.floor(process.uptime());
  const redisStatus = redis.status === 'ready' ? 'ok' : 'unavailable';

  res.json({
    status: 'ok',
    uptime,
    startedAt,
    redis: redisStatus,
    version: process.env['npm_package_version'] ?? '1.0.0',
  });
}
