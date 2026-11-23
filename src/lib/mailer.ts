import nodemailer from "nodemailer";
import { SITE_SETTINGS } from "./site-settings";

export function isEmailProviderConfigured(): boolean {
  const hasResend = Boolean((process.env.RESEND_API_KEY || "").trim());
  const hasSmtp = Boolean(
    (process.env.SMTP_HOST || "").trim() &&
      (process.env.SMTP_USER || "").trim() &&
      (process.env.SMTP_PASS || "").trim()
  );
  return hasResend || hasSmtp;
}

export function getEmailProviderName(): "resend" | "smtp" | "none" {
  if ((process.env.RESEND_API_KEY || "").trim()) return "resend";
  if (
    (process.env.SMTP_HOST || "").trim() &&
    (process.env.SMTP_USER || "").trim() &&
    (process.env.SMTP_PASS || "").trim()
  ) {
    return "smtp";
  }
  return "none";
}

function buildOtpHtml(opts: {
  heading: string;
  subtitle: string;
  otp: string;
  expiresMinutes: number;
}): string {
  const spacedDigits = opts.otp
    .split("")
    .map(
      (d) =>
        `<span style="display:inline-block;width:40px;height:48px;line-height:48px;margin:0 4px;border-radius:10px;background:#0f172a;border:1px solid #334155;color:#f8fafc;font-family:monospace;font-size:24px;font-weight:800;text-align:center;">${d}</span>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#070b14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <div style="max-width:480px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:32px;">
    <div style="display:inline-block;padding:8px 14px;border-radius:12px;background:#16a34a;color:#ffffff;font-weight:800;font-size:13px;letter-spacing:0.5px;">
      ${SITE_SETTINGS.shortName} · ${SITE_SETTINGS.siteName}
    </div>
    <h1 style="margin:20px 0 8px;font-size:22px;color:#ffffff;">${opts.heading}</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#94a3b8;">${opts.subtitle}</p>
    <div style="text-align:center;padding:18px 8px;background:#070b14;border:1px solid #1e293b;border-radius:16px;">
      ${spacedDigits}
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:#64748b;line-height:1.6;">
      This code expires in <strong>${opts.expiresMinutes} minutes</strong>. Never share this code with anyone. If you did not request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`.trim();
}

export async function sendOtpEmail(params: {
  to: string;
  otp: string;
  purpose: "2fa" | "sign-in" | "email-verification" | "forget-password";
}): Promise<void> {
  const from =
    (process.env.EMAIL_FROM || "").trim() ||
    (process.env.SMTP_USER
      ? `${SITE_SETTINGS.siteName} <${process.env.SMTP_USER.trim()}>`
      : `${SITE_SETTINGS.siteName} <onboarding@resend.dev>`);

  const copyMap = {
    "2fa": {
      subject: `${params.otp} is your ${SITE_SETTINGS.siteName} 2-Step verification code`,
      heading: "Two-Step Verification Code",
      subtitle: `Enter this 6-digit security code to finish signing into your ${SITE_SETTINGS.brandPrefix} account.`,
      expiresMinutes: 5,
    },
    "sign-in": {
      subject: `${params.otp} — Sign in to ${SITE_SETTINGS.siteName}`,
      heading: "Your One-Time Sign-In Code",
      subtitle: `Use this code to sign in to ${SITE_SETTINGS.siteName} without a password.`,
      expiresMinutes: 5,
    },
    "email-verification": {
      subject: `${params.otp} — Verify your email on ${SITE_SETTINGS.siteName}`,
      heading: "Verify Your Email Address",
      subtitle: `Enter this code in ${SITE_SETTINGS.siteName} Security to verify your email and unlock the Verified Email badge.`,
      expiresMinutes: 5,
    },
    "forget-password": {
      subject: `${params.otp} — Reset your ${SITE_SETTINGS.siteName} password`,
      heading: "Password Reset Code",
      subtitle: `Enter this verification code to set a new password for your ${SITE_SETTINGS.brandPrefix} profile.`,
      expiresMinutes: 5,
    },
  }[params.purpose];

  const html = buildOtpHtml({
    heading: copyMap.heading,
    subtitle: copyMap.subtitle,
    otp: params.otp,
    expiresMinutes: copyMap.expiresMinutes,
  });
  const text = `${copyMap.heading}\n\nYour code: ${params.otp}\nExpires in ${copyMap.expiresMinutes} minutes.\n\n${SITE_SETTINGS.siteName}`;

  const resendKey = (process.env.RESEND_API_KEY || "").trim();
  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: copyMap.subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Resend email delivery failed (${res.status}): ${errText}`);
    }
    return;
  }

  const smtpHost = (process.env.SMTP_HOST || "").trim();
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").trim();

  if (smtpHost && smtpUser && smtpPass) {
    const port = Number(process.env.SMTP_PORT || 465);
    const secure =
      process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === "true"
        : port === 465;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from,
      to: params.to,
      subject: copyMap.subject,
      text,
      html,
    });
    return;
  }

  // Fallback for unconfigured environments: throw a clear actionable error
  throw new Error(
    "Email delivery is not configured yet. Add RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS in Vercel Environment Variables."
  );
}
