import { z } from "zod";

/* =============================================================================
 * On-disk record shapes
 *
 * Separate from lib/schemas.ts so invoke and config UI contracts stay stable
 * if grant or config file layout changes. Stores validate every read through
 * these schemas.
 * ============================================================================= */

export const InstanceConfigSchema = z.object({
  instanceId: z.string(),
  subject: z.string(),
  directorySubject: z.string(),
  values: z.record(z.string(), z.unknown()),
});

export type StoredInstanceConfig = z.infer<typeof InstanceConfigSchema>;

export const GrantRecordSchema = z.object({
  grant_id: z.string(),
  holder: z.string(),
  scope: z.string(),
  subject: z.string(),
  requester: z.string(),
  author: z.string(),
  constraints: z.record(z.string(), z.unknown()),
  issued_at: z.string(),
  expires_at: z.string(),
});

export const SignedGrantSchema = z.object({
  grant: GrantRecordSchema,
  signature: z.string(),
});

export type StoredSignedGrant = z.infer<typeof SignedGrantSchema>;
