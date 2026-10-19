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
