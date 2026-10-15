import type { Env } from "../env";

export interface MailInput {
  to: string;
  subject: string;
  text: string;
}

export interface MailResult {
  sent: boolean;
  skipped?: boolean;
  status?: number;
}

/**
 * 通过 cloud-mail 发送邮件。未配置 MAIL_ENDPOINT 时静默跳过（返回 skipped，不抛错），
 * 便于本地 / 未接入时无副作用运行。
 */
export async function sendMail(env: Env, input: MailInput): Promise<MailResult> {
  if (!env.MAIL_ENDPOINT) {
    return { sent: false, skipped: true };
  }

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (env.MAIL_API_KEY) headers.authorization = `Bearer ${env.MAIL_API_KEY}`;

  try {
    const res = await fetch(env.MAIL_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
    });
    return { sent: res.ok, status: res.status };
  } catch {
    return { sent: false };
  }
}

export interface NotifyStatusInput {
  email?: string | null;
  datasetSlug: string;
  status: string;
  token: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "已收到",
  approved: "已通过",
  rejected: "未通过",
  published: "已发布",
};

/**
 * 就提交状态向贡献者发信。无邮箱时直接跳过；正文只包含追踪令牌与查询链接，
 * 绝不回显 payload 等敏感内容。供 P4 审阅流程复用。
 */
export async function notifyStatus(env: Env, input: NotifyStatusInput): Promise<MailResult> {
  const email = input.email?.trim();
  if (!email) {
    return { sent: false, skipped: true };
  }

  const label = STATUS_LABEL[input.status] ?? input.status;
  const queryUrl = `/submit?token=${input.token}`;
  const subject = `[兰台] 数据集 ${input.datasetSlug} 的提交${label}`;
  const text = [
    `您对数据集「${input.datasetSlug}」的提交通知`,
    ``,
    `当前状态：${label}（${input.status}）`,
    `追踪令牌：${input.token}`,
    `查询链接：${queryUrl}`,
    ``,
    `请妥善保管追踪令牌，可凭其查询提交状态。`,
  ].join("\n");

  return sendMail(env, { to: email, subject, text });
}
