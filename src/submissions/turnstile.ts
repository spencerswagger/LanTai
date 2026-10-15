import type { Env } from "../env";

export type TurnstileMode = "verified" | "dev-bypass" | "rejected";

export interface TurnstileResult {
  success: boolean;
  mode: TurnstileMode;
  error?: string;
}

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * 校验 Turnstile 令牌。未配置 TURNSTILE_SECRET 时（本地 / 未接入）直接 dev-bypass 放行；
 * 配置了 secret 但 token 为空时不发网络请求，直接拒绝；否则调用 siteverify 并按 data.success 判定。
 */
export async function verifyTurnstile(
  env: Env,
  token: string | undefined,
  ip?: string,
): Promise<TurnstileResult> {
  const secret = env.TURNSTILE_SECRET;
  if (!secret) {
    return { success: true, mode: "dev-bypass" };
  }

  if (!token) {
    return { success: false, mode: "rejected", error: "missing-token" };
  }

  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);

  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success) {
      return { success: true, mode: "verified" };
    }
    const codes = data["error-codes"] ?? [];
    return {
      success: false,
      mode: "rejected",
      error: codes.length > 0 ? codes.join(",") : "siteverify-failed",
    };
  } catch {
    return { success: false, mode: "rejected", error: "siteverify-unreachable" };
  }
}
