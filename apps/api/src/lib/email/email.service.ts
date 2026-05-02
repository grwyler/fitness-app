import { env } from "../../config/env.js";
import { logger } from "../observability/logger.js";
import { recordPasswordResetEmail } from "./email.test-store.js";

export type EmailService = {
  sendPasswordResetEmail(input: { to: string; resetLink: string }): Promise<void>;
};

async function sendResendEmail(input: { to: string; subject: string; html: string }) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Email provider is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Unable to send email. Provider responded with ${response.status}. ${body}`);
  }
}

function createEmailService(): EmailService {
  if (env.NODE_ENV !== "production") {
    return {
      async sendPasswordResetEmail(input) {
        recordPasswordResetEmail(input);

        if (env.EMAIL_PROVIDER === "console") {
          logger.info("password_reset_email", {
            to: input.to,
            resetLink: input.resetLink
          });
        }
      }
    };
  }

  if (env.EMAIL_PROVIDER === "resend") {
    return {
      async sendPasswordResetEmail(input) {
        await sendResendEmail({
          to: input.to,
          subject: "Reset your password",
          html: `
            <p>Someone requested a password reset for your account.</p>
            <p>If this was you, use the link below to set a new password:</p>
            <p><a href="${input.resetLink}">Reset password</a></p>
            <p>If you didn’t request this, you can ignore this email.</p>
          `.trim()
        });
      }
    };
  }

  throw new Error("Email provider is not configured.");
}

export const emailService: EmailService = createEmailService();

