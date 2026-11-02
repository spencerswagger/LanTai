/**
 * wrangler.jsonc 的「最小改动」读写：只认 `env.<env>.vars.LATEST_REDIRECT_SLUGS` 这一个键。
 *
 * 为什么不 JSON.parse → 再 JSON.stringify：wrangler.jsonc 允许注释，重新序列化会把注释
 * 与原有排版一起抹掉，评审时看不出改了什么。这里只在文本层面替换 / 插入那一行。
 *
 * 纯函数（无 I/O、无 wrangler 调用），便于单测：`tests/publish-preset-pack.test.ts`。
 */

/**
 * 读取 `env.<env>.vars.LATEST_REDIRECT_SLUGS` 的当前值（未配置返回空数组）。
 * 只做「解析白名单」这一件事，不做任何写入。
 */
export function readRedirectSlugs(configText, envName) {
  const value = findEnvVarValue(configText, envName, "LATEST_REDIRECT_SLUGS");
  if (value === null) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

/**
 * 把 slug 并入白名单（幂等：已存在不动、保序、不删既有项、不改其他配置）。
 * 只在文本层面做最小改动，**不重新序列化 wrangler.jsonc**（否则注释与排版会被抹掉）。
 * 返回 { text, changed, before, after }。
 */
export function registerRedirectSlug(configText, envName, slug) {
  const before = readRedirectSlugs(configText, envName);
  if (before.includes(slug)) return { text: configText, changed: false, before, after: before };
  const after = [...before, slug];
  const joined = after.join(",");

  const existing = findEnvVarValue(configText, envName, "LATEST_REDIRECT_SLUGS");
  if (existing !== null) {
    const replaced = configText.replace(/("LATEST_REDIRECT_SLUGS"\s*:\s*)"[^"]*"/, `$1"${joined}"`);
    return { text: replaced, changed: true, before, after };
  }

  // 该 env 段还没有这个键 → 插到 vars 块的第一行
  const varsOpen = findVarsBlock(configText, envName);
  if (varsOpen === null) throw new Error(`wrangler.jsonc 的 env.${envName} 段里找不到 vars 块`);
  const insertAt = varsOpen.index;
  /* 插在 `"vars": {` 之后：先换行再按 vars 的缩进 + 2 空位对齐，保证只多一行、不压坏原有排版。 */
  const line = `\n${" ".repeat(varsOpen.indent + 2)}"LATEST_REDIRECT_SLUGS": "${joined}",`;
  return {
    text: configText.slice(0, insertAt) + line + configText.slice(insertAt),
    changed: true,
    before,
    after,
  };
}

/** 在指定 env 段的 vars 块里找某个键的字符串值；找不到返回 null。 */
function findEnvVarValue(configText, envName, key) {
  const vars = findVarsBlock(configText, envName);
  if (vars === null) return null;
  const block = configText.slice(vars.index, vars.end);
  const match = block.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`));
  return match ? match[1] : null;
}

/** 定位 `"<env>": { … "vars": {` 之后的内容起点与 vars 块结束位置。 */
function findVarsBlock(configText, envName) {
  const envMatch = new RegExp(`"${envName}"\\s*:\\s*\\{`).exec(configText);
  if (!envMatch) return null;
  const envStart = envMatch.index + envMatch[0].length;
  const varsMatch = /"vars"\s*:\s*\{/.exec(configText.slice(envStart));
  if (!varsMatch) return null;
  const index = envStart + varsMatch.index + varsMatch[0].length;
  const indent = (configText.slice(0, index).match(/\n([ ]*)[^\n]*$/) ?? ["", ""])[1].length;
  let depth = 1;
  let cursor = index;
  while (cursor < configText.length && depth > 0) {
    if (configText[cursor] === "{") depth += 1;
    if (configText[cursor] === "}") depth -= 1;
    cursor += 1;
  }
  return { index, end: cursor, indent };
}
