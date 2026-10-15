export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

const WINDOW_MS = 60_000;
const PER_KEY_LIMIT = 5;
const GLOBAL_LIMIT = 1000;

const buckets = new Map<string, number[]>();
let globalHits: number[] = [];

function retryAfterSeconds(oldest: number, now: number): number {
  return Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
}

/**
 * 应用侧限流兜底：内存滑动窗口。默认每 key 60s 窗口内 5 次；另设同窗口内所有 key
 * 合计 1000 次的全局上限，避免单实例被打爆。
 *
 * 注意：该实现仅在单个 Worker isolate 内有效，生产环境同时依赖 Cloudflare 原生限流
 * （WAF Rate limiting rules）做跨实例与边缘侧的第一道防线，本模块只是兜底。
 */
export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  const cutoff = now - WINDOW_MS;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  globalHits = globalHits.filter((t) => t > cutoff);

  if (globalHits.length >= GLOBAL_LIMIT) {
    buckets.set(key, hits);
    return { allowed: false, retryAfter: retryAfterSeconds(globalHits[0], now) };
  }

  if (hits.length >= PER_KEY_LIMIT) {
    buckets.set(key, hits);
    return { allowed: false, retryAfter: retryAfterSeconds(hits[0], now) };
  }

  hits.push(now);
  globalHits.push(now);
  buckets.set(key, hits);
  return { allowed: true };
}

/** 清空限流状态，仅供测试使用。 */
export function resetRateLimits(): void {
  buckets.clear();
  globalHits = [];
}
