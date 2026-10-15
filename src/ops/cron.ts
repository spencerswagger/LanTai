import type { Env } from "../env";
import { runQuotaCheck } from "./quota";

/**
 * 定时任务处理器：每日检查免费配额使用情况并记录结果。
 */
export async function handleScheduled(
  _controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  const result = await runQuotaCheck(env);
  console.log(
    "ops.cron.quota",
    JSON.stringify({
      level: result.evaluation.level,
      ratio: result.evaluation.ratio,
      alerted: result.alerted,
      mailed: result.mailed,
    }),
  );
}
