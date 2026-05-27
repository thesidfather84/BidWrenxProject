const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = "BidWrenx <noreply@bidwrenx.com>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email delivery.");
    console.info(`[email] Would have sent to: ${opts.to}\nSubject: ${opts.subject}`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend error ${res.status}: ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    return false;
  }
}

export function buildPasswordResetEmail(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#111111;border:1px solid #222;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="padding:28px 32px 20px;border-bottom:1px solid #1e1e1e;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:22px;height:22px;margin-right:8px;">
                  <span style="font-size:18px;">🔧</span>
                </td>
                <td style="padding-left:6px;">
                  <span style="font-size:16px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">BidWrenx</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Reset your password</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6;">
              We received a request to reset the password for your BidWrenx account.
              Click the button below to set a new password. This link expires in <strong style="color:#aaa;">1 hour</strong>.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#3b82f6;border-radius:8px;">
                  <a href="${resetUrl}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#666;line-height:1.6;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin:0 0 24px;font-size:12px;word-break:break-all;">
              <a href="${resetUrl}" style="color:#3b82f6;text-decoration:none;">${resetUrl}</a>
            </p>
            <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
              If you didn't request a password reset, you can safely ignore this email — your password won't be changed.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #1e1e1e;">
            <p style="margin:0;font-size:12px;color:#444;">
              © 2026 BidWrenx · <a href="mailto:support@bidwrenx.com" style="color:#555;text-decoration:none;">support@bidwrenx.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
