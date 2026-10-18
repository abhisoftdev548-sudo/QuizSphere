import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export function emailDeliveryConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  if (!emailDeliveryConfigured() || !env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) throw new Error('SMTP email delivery is not configured.');
  const transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } });
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: 'Reset your QuizSphere password',
    text: `We received a request to reset your QuizSphere password. Use this link within 60 minutes: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>We received a request to reset your QuizSphere password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 60 minutes. If you did not request this, you can ignore this email.</p>`,
  });
}
