import nodemailer, { type Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT ?? 587);
  const secure = process.env.EMAIL_SECURE === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      '[jazzmind/auth] Email transport is not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM.',
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return cachedTransporter;
}

export interface MagicLinkEmailInput {
  to: string;
  url: string;
  /**
   * Short-lived expiry (seconds). Defaults to 300 (5 minutes) which matches
   * the better-auth magicLink plugin default.
   */
  expiresInSeconds?: number;
}

/**
 * Sends a magic-link sign-in email via SMTP.
 *
 * Invoked by the better-auth magicLink plugin's `sendMagicLink` callback.
 * The URL is already fully built and contains a one-time token.
 */
export async function sendMagicLinkEmail(input: MagicLinkEmailInput): Promise<void> {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error('[jazzmind/auth] EMAIL_FROM is not set');

  const ttl = input.expiresInSeconds ?? 300;
  const minutes = Math.max(1, Math.round(ttl / 60));
  const urlHtml = escapeHtml(input.url);

  const html = `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f5f7fb; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <h1 style="margin:0 0 16px; font-size:20px; color:#111827;">Sign in</h1>
      <p style="margin:0 0 24px; color:#374151; line-height:1.5;">Click the button below to sign in. This link expires in ${minutes} minute${minutes === 1 ? '' : 's'}.</p>
      <p style="margin:0 0 24px;">
        <a href="${urlHtml}" style="display:inline-block; background:#2563eb; color:#ffffff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600;">Sign in</a>
      </p>
      <p style="margin:0; color:#6b7280; font-size:13px; word-break:break-all;">If the button doesn't work, copy this URL into your browser:<br/>${urlHtml}</p>
    </div>
    <p style="max-width:520px; margin:16px auto 0; text-align:center; color:#9ca3af; font-size:12px;">
      If you didn't request this, you can safely ignore this email.
    </p>
  </body>
</html>`;

  const text = `Sign in to your account.

Open this link within ${minutes} minute${minutes === 1 ? '' : 's'} to sign in:
${input.url}

If you didn't request this, you can safely ignore this email.
`;

  await getTransporter().sendMail({
    from,
    to: input.to,
    subject: 'Your sign-in link',
    text,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
