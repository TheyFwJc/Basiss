/**
 * Minimal transactional email sender via Resend's HTTP API (no SDK
 * dependency — just fetch). Optional, same pattern as GEMINI_API_KEY: without
 * RESEND_API_KEY configured, sendEmail returns false and callers fall back to
 * safe non-production behavior. See ARCHITECTURE.md's "Authentication"
 * section for why this exists.
 */

const RESEND_API_URL = "https://api.resend.com/emails";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.EMAIL_FROM ?? "Basis <onboarding@resend.dev>";

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!response.ok) {
      console.error("sendEmail failed:", response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("sendEmail failed:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Reset your Basis password",
    html: `
      <p>We received a request to reset your Basis password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
    `,
  });
}
