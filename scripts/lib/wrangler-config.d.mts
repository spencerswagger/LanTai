/** `scripts/lib/wrangler-config.mjs` 的类型声明（脚本本体是 .mjs，供 node 直接执行）。 */

export interface RegisterResult {
  text: string;
  changed: boolean;
  before: string[];
  after: string[];
}

export function readRedirectSlugs(configText: string, envName: string): string[];

export function registerRedirectSlug(
  configText: string,
  envName: string,
  slug: string,
): RegisterResult;
