export interface AccessIdentity {
  email: string;
  sub?: string;
}

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  SKIP_ACCESS_DEV?: string;
  /**
   * 逗号分隔的 slug 白名单：命中者 `/{slug}/latest.json` 由 **302** 跳到包本体
   * `/{slug}/versions/{n}.json`（消费方按 200 解析指针会得到空包，故改为跳转）。
   * 默认空 = 全平台行为不变（latest.json 仍是 200 指针文档）。
   */
  LATEST_REDIRECT_SLUGS?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  MAIL_ENDPOINT?: string;
  MAIL_API_KEY?: string;
  MAIL_FROM?: string;
  ADMIN_FALLBACK_EMAIL?: string;
  IP_HASH_SALT?: string;
  QUOTA_ALERT_THRESHOLD?: string;
}

export interface Variables {
  accessIdentity: AccessIdentity | null;
}

export type AppEnv = {
  Bindings: Env;
  Variables: Variables;
};
