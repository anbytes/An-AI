import rateLimit from 'express-rate-limit';

/**
 * 请求频率限制中间件
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: Number(process.env.RATE_LIMIT_PER_MINUTE) || 20, // 每分钟最多 20 次请求
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
});
