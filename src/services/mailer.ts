import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import type { EmailInput, EmailResult, SmtpConfig } from "../lib/schemas.js";

/* =============================================================================
 * Mail delivery
 *
 * deliverEmail — nodemailer transport from SmtpConfig, map attachments from
 * URL references, return messageId + accepted/rejected.
 *
 * previewEmail — dry-run result without contacting SMTP.
 * ============================================================================= */

export type DeliverTransport = Pick<Transporter, "sendMail">;

export type TransportFactory = (
  options: SMTPTransport.Options,
) => DeliverTransport;

export async function deliverEmail(
  smtp: SmtpConfig,
  input: EmailInput,
  transportFactory: TransportFactory = nodemailer.createTransport,
): Promise<EmailResult> {
  const transport = transportFactory({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.username,
      pass: smtp.password,
    },
  });

  const from = smtp.fromName
    ? `"${smtp.fromName}" <${smtp.fromAddress}>`
    : smtp.fromAddress;

  const info = await transport.sendMail({
    from,
    to: input.recipient.formatted,
    ...(input.subject !== undefined && { subject: input.subject }),
    ...(input.body !== undefined && { text: input.body }),
    attachments: input.attachments?.map((file) => ({
      filename: file.filename,
      path: file.url,
      contentType: file.content_type,
    })),
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted.map(String),
    rejected: info.rejected.map(String),
  };
}

export function previewEmail(input: EmailInput): EmailResult {
  return {
    messageId: "dry-run-preview",
    accepted: [input.recipient.address],
    rejected: [],
  };
}
