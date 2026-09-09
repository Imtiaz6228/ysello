import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transport =
  env.SMTP_HOST && env.SMTP_PORT && env.EMAIL_FROM
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        connectionTimeout: env.SMTP_TIMEOUT_MS,
        greetingTimeout: env.SMTP_TIMEOUT_MS,
        socketTimeout: env.SMTP_TIMEOUT_MS,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              }
            : undefined,
      })
    : null;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendMail(to: string, subject: string, html: string) {
  if (!transport || !env.EMAIL_FROM) {
    console.warn("Email delivery skipped because SMTP is not configured.");
    return;
  }

  try {
    const info = await transport.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(
      `SMTP error sending to ${to}:`,
      err instanceof Error ? err.message : err,
    );
    throw err;
  }
}

export function sendVerificationEmail(
  to: string,
  firstName: string,
  token: string,
) {
  const url = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

  return sendMail(
    to,
    "Verify your email address",
    `
      <p>Hello ${escapeHtml(firstName)},</p>
      <p>Please verify your email address to finish securing your account.</p>
      <p><a href="${url}">Verify email address</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  );
}

export function sendPasswordResetEmail(
  to: string,
  firstName: string,
  token: string,
) {
  const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;

  return sendMail(
    to,
    "Reset your password",
    `
      <p>Hello ${escapeHtml(firstName)},</p>
      <p>Use the secure link below to reset your password.</p>
      <p><a href="${url}">Reset password</a></p>
      <p>This link expires in 1 hour. If you did not request it, you can ignore this email.</p>
    `,
  );
}

export async function sendSellerApplicationNotification(
  storeName: string,
  applicantEmail: string,
) {
  if (!env.ADMIN_NOTIFICATION_EMAIL) return;
  return sendMail(
    env.ADMIN_NOTIFICATION_EMAIL,
    "New seller application",
    `
      <p>A new seller application is waiting for review.</p>
      <p><strong>Store:</strong> ${escapeHtml(storeName)}</p>
      <p><strong>Applicant:</strong> ${escapeHtml(applicantEmail)}</p>
      <p><a href="${env.APP_URL}/admin/seller-applications">Review application</a></p>
    `,
  );
}

export function sendOrderConfirmation(
  to: string,
  buyerName: string,
  orderNumber: string,
  invoiceNumber: string,
  totalLabel: string,
  downloadLinks: Array<{ name: string; url: string }>,
) {
  const downloads = downloadLinks.length
    ? `<p><strong>Your downloads</strong></p><ul>${downloadLinks
        .map(
          (download) =>
            `<li><a href="${download.url}">${escapeHtml(download.name)}</a> (secure, time-limited link)</li>`,
        )
        .join("")}</ul>`
    : `<p>This order contains a service. Use the order delivery chat in your dashboard to coordinate with the seller.</p>`;

  return sendMail(
    to,
    `Order ${orderNumber} confirmed`,
    `<p>Hello ${escapeHtml(buyerName)},</p>
     <p>Your payment was confirmed and your order is ready.</p>
     <p><strong>Order:</strong> ${escapeHtml(orderNumber)}<br />
     <strong>Invoice:</strong> ${escapeHtml(invoiceNumber)}<br />
     <strong>Total:</strong> ${escapeHtml(totalLabel)}</p>
     ${downloads}
     <p>You can also access purchases, invoices, refund requests, and support from <a href="${env.APP_URL}/dashboard">your dashboard</a>.</p>`,
  );
}

export function sendTicketUpdateEmail(
  to: string,
  ticketNumber: string,
  subject: string,
  status: string,
) {
  return sendMail(
    to,
    `Ticket ${ticketNumber} updated`,
    `<p>Your support ticket <strong>${escapeHtml(ticketNumber)}</strong> has an update.</p>
     <p><strong>${escapeHtml(subject)}</strong><br />Status: ${escapeHtml(status)}</p>
     <p><a href="${env.APP_URL}/support">Open support center</a></p>`,
  );
}
