/**
 * Email Service for Authentication
 *
 * Handles sending transactional emails for:
 * - Email verification
 * - Password reset
 *
 * Uses Resend for email delivery.
 */

import { Resend } from "resend";
import nodemailer from "nodemailer";
import { env } from "./env";

// Initialize Resend with API key if available
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// Initialize SMTP transport if configured
const smtpTransport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT) || 587,
      secure: Number(env.SMTP_PORT) === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASSWORD
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASSWORD,
            }
          : undefined,
    })
  : null;

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Resend (primary) or SMTP (fallback)
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  // 1. Try Resend if configured
  if (resend) {
    if (env.NODE_ENV === "development") {
      console.log(`📧 [EMAIL] Sending to ${to}: "${subject}" via Resend`);
    }

    try {
      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM || "Ithaca <onboarding@resend.dev>",
        to,
        subject,
        html,
        text,
      });

      if (error) {
        console.error("Failed to send email via Resend:", error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Exception sending email via Resend:", error);
      return { success: false, error };
    }
  }

  // 2. Try SMTP if configured
  if (smtpTransport) {
    if (env.NODE_ENV === "development") {
      console.log(
        `📧 [EMAIL] Sending to ${to}: "${subject}" via SMTP (${env.SMTP_HOST})`,
      );
    }

    try {
      const info = await smtpTransport.sendMail({
        from: env.EMAIL_FROM || `Ithaca <no-reply@${env.SMTP_HOST}>`,
        to,
        subject,
        html,
        text,
      });

      return { success: true, data: info };
    } catch (error) {
      console.error("Exception sending email via SMTP:", error);
      return { success: false, error };
    }
  }

  // 3. Fall back to console logging in development/test
  console.log(
    "\n📧 [EMAIL — console only, no RESEND_API_KEY or SMTP_HOST] ================",
  );
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${text || html}`);
  console.log("==========================\n");
  console.warn(
    "⚠️  Neither RESEND_API_KEY nor SMTP_HOST is configured. Email was logged to console.",
  );
  return { success: true };
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(email: string, url: string) {
  return sendEmail({
    to: email,
    subject: "Verify your email - Ithaca",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #137fec;">Verify your email</h1>
        <p>Click the link below to verify your email address:</p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #137fec; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Verify your email\n\nClick this link to verify: ${url}`,
  });
}

/**
 * Send organization invitation email
 */
export async function sendOrganizationInvitationEmail(input: {
  email: string;
  inviteUrl: string;
  organizationName: string;
  role: string;
  inviterName?: string | null;
}) {
  const inviter = input.inviterName?.trim() || "A teammate";
  return sendEmail({
    to: input.email,
    subject: `Join ${input.organizationName} on Ithaca`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #137fec;">You're invited to ${input.organizationName}</h1>
        <p>${inviter} invited you to collaborate on debate maps as a <strong>${input.role}</strong>.</p>
        <a href="${input.inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #137fec; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Accept invitation
        </a>
        <p style="color: #666; font-size: 14px;">
          If you weren't expecting this, you can ignore this email.
        </p>
      </div>
    `,
    text: `You're invited to ${input.organizationName}\n\n${inviter} invited you as ${input.role}.\n\nAccept: ${input.inviteUrl}`,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, url: string) {
  return sendEmail({
    to: email,
    subject: "Reset your password - Ithaca",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #137fec;">Reset your password</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #137fec; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Reset your password\n\nClick this link to reset: ${url}\n\nThis link will expire in 1 hour.`,
  });
}
