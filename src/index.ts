// Email Sender - example Huglo module with managed config UI.

import { Module, loadKeyPair, fileType } from "@huglo/module-sdk";
import { grantStore } from "./services/grant-store.js";
import { configStore } from "./services/config-store.js";

const module = new Module({
  id: "email-sender",
  name: "Email Sender",
  description: "Send email via per-subject SMTP configuration",
  version: "0.1.0",
  keyPair: loadKeyPair(),
  grantStore,
  configStore

});

/* =============================================================================
 * Managed config UI
 *
 * emailConfigDefinition declares SMTP fields; the SDK serves /config and
 * persists saved instances through configStore.
 * ============================================================================= */
import { emailConfigDefinition } from "./lib/schemas.js";
module.config(emailConfigDefinition);

/* =============================================================================
 * Scopes
 *
 * email:send — protected scope. Input/output schemas are registered here;
 * sendEmail receives invoke context with resolved SMTP values on ctx.config.
 * ============================================================================= */

import {
  EmailInputSchema,
  EmailResultSchema,
} from "./lib/schemas.js";

import { sendEmail } from "./scopes/email.send.js";

module.registerType(fileType);

module.scope("email:send", {
  description: "Send an email to a recipient",
  input: EmailInputSchema,
  output: EmailResultSchema,
  handler: sendEmail,
});

/* =============================================================================
 * Start the server
 * ============================================================================= */
import { PORT, MODULE_ENDPOINT } from "./config.js";
await module.listen(PORT);

console.log(`Email Sender listening on http://localhost:${PORT}`);
console.log(`Module ready at ${MODULE_ENDPOINT}`);
