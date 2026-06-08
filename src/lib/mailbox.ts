import { z } from "zod";

/* =============================================================================
 * Recipient parsing
 *
 * Invoke wire format is a string. Accepts user@example.com or "Name" <user@example.com>.
 * Kept out of schemas.ts so the Zod transform stays short and edge cases have
 * their own tests (test/mailbox.test.ts).
 * ============================================================================= */

export interface ParsedMailbox {
  address: string;
  name?: string;
}

const emailValidator = z.email();

function isValidEmail(value: string): boolean {
  return emailValidator.safeParse(value).success;
}

function stripDisplayNameQuotes(name: string): string {
  const trimmed = name.trim();
  if (
    trimmed.length >= 2 &&
    trimmed.startsWith('"') &&
    trimmed.endsWith('"')
  ) {
    return trimmed.slice(1, -1).replaceAll(String.raw`\"`, '"');
  }
  return trimmed;
}

export function parseMailbox(raw: string): ParsedMailbox | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (isValidEmail(trimmed)) {
    return { address: trimmed };
  }

  const angleMatch = /^(.+?)\s*<([^>]+)>\s*$/.exec(trimmed);
  if (!angleMatch) {
    return null;
  }

  const namePart = stripDisplayNameQuotes(angleMatch[1]!);
  const addressPart = angleMatch[2]!.trim();

  if (!namePart || !isValidEmail(addressPart)) {
    return null;
  }

  return { address: addressPart, name: namePart };
}

export function formatMailbox(mailbox: ParsedMailbox): string {
  if (!mailbox.name) {
    return mailbox.address;
  }
  const escapedName = mailbox.name.replaceAll('\\', "\\\\").replaceAll('"', String.raw`\"`);
  return `"${escapedName}" <${mailbox.address}>`;
}
