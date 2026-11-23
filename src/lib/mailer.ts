import nodemailer from "nodemailer";
import { getDb } from "./mongodb";
import { SITE_SETTINGS } from "./site-settings";

const CONSUMER_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

function stripWrappingQuotes(val: string): string {
  return val.trim().replace(/^["']+|["']+$/g, "").trim();
}

function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  return (match ? match[1] : fromHeader).trim().toLowerCase();
}

function resolveResendFromAddress(): string {
  const raw = stripWrappingQuotes(process.env.EMAIL_FROM || "");
  if (!raw) {
    return `${SITE_SETTINGS.siteName} <onboarding@resend.dev>`;
  }
  const addr = extractEmailAddress(raw);
  const domain = addr.split("@")[1] || "";
  // Resend rejects consumer domains like @gmail.com in `from` — fall back cleanly to onboarding@resend.dev
  if (!domain || CONSUMER_EMAIL_DOMAINS.has(domain)) {
    return `${SITE_SETTINGS.siteName} <onboarding@resend.dev>`;
  }
  return raw;
}

function resolveSmtpFromAddress(): string {
  const raw = stripWrappingQuotes(process.env.EMAIL_FROM || "");
  const smtpUser = stripWrappingQuotes(process.env.SMTP_USER || "");
  if (raw && !raw.toLowerCase().includes("onboarding@resend.dev")) {
    return raw;
  }
  if (smtpUser) {
    return `${SITE_SETTINGS.siteName} <${smtpUser}>`;
  }
  return `${SITE_SETTINGS.siteName} <no-reply@sse-world.local>`;
}

export function isResendConfigured(): boolean {
  return Boolean(stripWrappingQuotes(process.env.RESEND_API_KEY || ""));
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    stripWrappingQuotes(process.env.SMTP_HOST || "") &&
      stripWrappingQuotes(process.env.SMTP_USER || "") &&
      stripWrappingQuotes(process.env.SMTP_PASS || "")
  );
}

export function isEmailProviderConfigured(): boolean {
  return isResendConfigured() || isSmtpConfigured();
}

export function getEmailProviderName(): "resend+smtp" | "resend" | "smtp" | "none" {
  const r = isResendConfigured();
  const s = isSmtpConfigured();
  if (r && s) return "resend+smtp";
  if (r) return "resend";
  if (s) return "smtp";
  return "none";
}

export interface EmailDeliveryStatus {
  ok: boolean;
  provider: "resend" | "smtp" | "none";
  to: string;
  purpose: string;
  messageId: string | null;
  error: string | null;
  hint: string | null;
  updatedAt: string;
}

async function saveDeliveryStatus(status: Omit<EmailDeliveryStatus, "updatedAt">) {
  try {
    const db = await getDb();
    await db.collection("email_delivery_status").updateOne(
      { to: status.to.toLowerCase() },
      {
        $set: {
          ...status,
          to: status.to.toLowerCase(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch {
    // Non-fatal diagnostic store
  }
}

export async function getLastDeliveryStatus(
  email: string
): Promise<EmailDeliveryStatus | null> {
  try {
    const db = await getDb();
    const doc = await db
      .collection("email_delivery_status")
      .findOne({ to: email.trim().toLowerCase() });
    if (!doc) return null;
    return {
      ok: Boolean(doc.ok),
      provider: (doc.provider as EmailDeliveryStatus["provider"]) || "none",
      to: String(doc.to || email),
      purpose: String(doc.purpose || ""),
      messageId: typeof doc.messageId === "string" ? doc.messageId : null,
      error: typeof doc.error === "string" ? doc.error : null,
      hint: typeof doc.hint === "string" ? doc.hint : null,
      updatedAt: doc.updatedAt
        ? new Date(doc.updatedAt as string | Date).toISOString()
        : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function buildFriendlyResendHint(status: number, rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes("testing emails") ||
    lower.includes("verify a domain") ||
    lower.includes("own email address")
  ) {
    return "Resend's free onboarding@resend.dev sender can ONLY deliver to the email address that owns your Resend account. Verify a custom domain in Resend (resend.com/domains), OR add Gmail SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) in Vercel to send to any user email for free.";
  }
  if (status === 401 || lower.includes("api key")) {
    return "Check your RESEND_API_KEY in Vercel Environment Variables — Resend rejected the key.";
  }
  if (lower.includes("from")) {
    return "Your EMAIL_FROM address must use a domain verified in Resend (or leave it as onboarding@resend.dev for owner-only testing).";
  }
  return "Check Vercel Logs or your Resend Dashboard → Logs for full details.";
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

async function sendViaSmtp(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<string | null> {
  const smtpHost = stripWrappingQuotes(process.env.SMTP_HOST || "");
  const smtpUser = stripWrappingQuotes(process.env.SMTP_USER || "");
  const smtpPass = stripWrappingQuotes(process.env.SMTP_PASS || "");
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

  const info = await transporter.sendMail({
    from: resolveSmtpFromAddress(),
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
  return info.messageId || null;
}

export async function sendOtpEmail(params: {
  to: string;
  otp: string;
  purpose: "2fa" | "sign-in" | "email-verification" | "forget-password";
}): Promise<void> {
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

  const resendKey = stripWrappingQuotes(process.env.RESEND_API_KEY || "");
  let resendError: { message: string; hint: string } | null = null;

  if (resendKey) {
    const from = resolveResendFromAddress();
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

    if (res.ok) {
      const json = (await res.json().catch(() => ({}))) as { id?: string };
      await saveDeliveryStatus({
        ok: true,
        provider: "resend",
        to: params.to,
        purpose: params.purpose,
        messageId: json.id || null,
        error: null,
        hint: null,
      });
      return;
    }

    const rawBody = await res.text().catch(() => "");
    let parsedMsg = rawBody;
    try {
      const parsed = JSON.parse(rawBody) as { message?: string; name?: string };
      if (parsed.message) parsedMsg = parsed.message;
    } catch {
      // keep raw text
    }

    const hint = buildFriendlyResendHint(res.status, parsedMsg);
    resendError = {
      message: `Resend (${res.status}): ${parsedMsg || "Delivery failed"}`,
      hint,
    };
    console.error(`[Mailer] ${resendError.message} | to=${params.to} | from=${from}`);
  }

  // Automatic SMTP fallback (works if SMTP is primary OR if Resend sandbox blocked a recipient!)
  if (isSmtpConfigured()) {
    try {
      const messageId = await sendViaSmtp({
        to: params.to,
        subject: copyMap.subject,
        text,
        html,
      });
      await saveDeliveryStatus({
        ok: true,
        provider: "smtp",
        to: params.to,
        purpose: params.purpose,
        messageId,
        error: null,
        hint: null,
      });
      return;
    } catch (err) {
      const smtpMsg =
        err instanceof Error ? err.message : "SMTP email delivery failed.";
      console.error(`[Mailer] SMTP error for ${params.to}:`, smtpMsg);
      await saveDeliveryStatus({
        ok: false,
        provider: "smtp",
        to: params.to,
        purpose: params.purpose,
        messageId: null,
        error: `SMTP Error: ${smtpMsg}`,
        hint: "Verify SMTP_HOST, SMTP_PORT (465), SMTP_USER, and your 16-character Gmail App Password.",
      });
      throw new Error(`SMTP Error: ${smtpMsg}`);
    }
  }

  if (resendError) {
    await saveDeliveryStatus({
      ok: false,
      provider: "resend",
      to: params.to,
      purpose: params.purpose,
      messageId: null,
      error: resendError.message,
      hint: resendError.hint,
    });
    throw new Error(resendError.message);
  }

  const unconfigured =
    "Email delivery is not configured yet. Add RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS in Vercel Environment Variables.";
  await saveDeliveryStatus({
    ok: false,
    provider: "none",
    to: params.to,
    purpose: params.purpose,
    messageId: null,
    error: unconfigured,
    hint: "Configure Resend (with a verified domain) or Gmail SMTP in Vercel.",
  });
  throw new Error(unconfigured);
}
