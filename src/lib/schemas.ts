import { z } from "zod";
import { fileType, type ConfigDefinition } from "@huglo/module-sdk";
import { formatMailbox, parseMailbox } from "./mailbox.js";

/* =============================================================================
 * Config UI + stored SMTP values
 *
 * SmtpConfigSchema is both the config popup shape and the parser for values
 * saved on each config instance. emailConfigDefinition tells the SDK all
 * fields are user-entered.
 * ============================================================================= */

export const SmtpConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  username: z.string().min(1),
  password: z.string().min(1),
  fromAddress: z.email(),
  fromName: z.string().optional(),
});

export type SmtpConfig = z.infer<typeof SmtpConfigSchema>;

export const emailConfigDefinition: ConfigDefinition = {
  schema: SmtpConfigSchema,
  fields: {
    host: "userEntered",
    port: "userEntered",
    secure: "userEntered",
    username: "userEntered",
    password: "userEntered",
    fromAddress: "userEntered",
    fromName: "userEntered",
  },
};

/* =============================================================================
 * email:send invoke payload
 *
 * Recipient arrives as a string on the wire (plain address or mailbox syntax);
 * RecipientInputSchema normalizes it before the handler runs.
 *
 * ============================================================================= */

export const ParsedRecipientSchema = z.object({
  address: z.email(),
  name: z.string().optional(),
  formatted: z.string().min(1),
});

export type ParsedRecipient = z.infer<typeof ParsedRecipientSchema>;

export const FlowNodeContextSchema = z.object({
  flowId: z.string().min(1),
  nodeId: z.string().min(1),
  configInstanceId: z.string().min(1).optional(),
});

export type FlowNodeContext = z.infer<typeof FlowNodeContextSchema>;

export const RecipientInputSchema = z
  .string()
  .min(1)
  .transform((raw, ctx) => {
    const parsed = parseMailbox(raw);
    if (!parsed) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid recipient address",
      });
      return z.NEVER;
    }
    return {
      address: parsed.address,
      name: parsed.name,
      formatted: formatMailbox(parsed),
    };
  });

export const EmailInputSchema = z.object({
  subject: z.string().min(1).optional(),
  recipient: RecipientInputSchema,
  body: z.string().optional(),
  attachments: z.array(fileType.schema).optional(),
  context: FlowNodeContextSchema,
});

export const EmailResultSchema = z.object({
  messageId: z.string(),
  accepted: z.array(z.string()),
  rejected: z.array(z.string()),
});

export type EmailInput = z.infer<typeof EmailInputSchema>;
export type EmailResult = z.infer<typeof EmailResultSchema>;
