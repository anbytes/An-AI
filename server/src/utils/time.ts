/**
 * 时间工具函数
 */

/**
 * 获取当前 UTC 时间的 ISO 字符串（用于数据库存储）
 */
export function getCurrentUTCTime(): string {
  return new Date().toISOString();
}

/**
 * 将 UTC 时间字符串转换为北京时间字符串（用于显示）
 */
export function toBeijingTimeString(utcTimeString: string): string {
  const date = new Date(utcTimeString);
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}
