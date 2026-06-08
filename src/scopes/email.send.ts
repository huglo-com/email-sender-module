import type { ProtectedCtx } from "@huglo/module-sdk";
import { SmtpConfigSchema, type EmailInput, type EmailResult } from "../lib/schemas.js";
import { deliverEmail, previewEmail } from "../services/mailer.js";

/* =============================================================================
 * email:send handler
 *
 * Registered in index.ts with EmailInputSchema / EmailResultSchema.
 *
 * SMTP settings come from ctx.config (resolved before this runs).
 * Email content comes from ctx.input.
 *
 * dryRun → preview without SMTP. Otherwise → deliverEmail.
 * ============================================================================= */

export async function sendEmail(
  ctx: ProtectedCtx<EmailInput>,
): Promise<EmailResult> {
  const smtp = SmtpConfigSchema.parse(ctx.config!.values);

  if (ctx.dryRun) {
    return previewEmail(ctx.input);
  }

  return deliverEmail(smtp, ctx.input);
}
