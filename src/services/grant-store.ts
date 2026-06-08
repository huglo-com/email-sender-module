import path from "node:path";
import { unlink } from "node:fs/promises";
import type { GrantStore , SignedGrant } from "@huglo/module-sdk";
import { GRANTS_DIR } from "../config.js";
import { SignedGrantSchema } from "../lib/store-schemas.js";
import {
  clearJsonDir,
  ensureDir,
  isEnoent,
  listJsonIds,
  readJsonFile,
  writeJsonFile,
} from "../lib/file-store-utils.js";

/* =============================================================================
 * Grant storage allows to store and retrieve grants.
 * It implements the GrantStore interface.
 *
 * Grant is a cryptographically verifiable authorization of a user.
 * User can authorize modules to use other modules on their behalf.
 * For more information, see the Huglo documentation:
 * https://github.com/huglo-com/module-sdk/blob/main/docs/ai/HUGLO_SPECIFICATION.md
 *
 * In this example, we store the grants in a JSON file per grantId.
 * ============================================================================= */

export class FileGrantStore implements GrantStore {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  private grantPath(grantId: string): string {
    return path.join(this.dataDir, `${grantId}.json`);
  }

  async save(grant: SignedGrant): Promise<void> {
    await ensureDir(this.dataDir);
    await writeJsonFile(this.grantPath(grant.grant.grant_id), grant);
  }

  async find(key: {
    subject: string;
    holder: string;
    scope: string;
    requester: string;
  }): Promise<SignedGrant | null> {
    for (const id of await listJsonIds(this.dataDir)) {
      const grant = await readJsonFile(this.grantPath(id), SignedGrantSchema);
      if (!grant) {
        continue;
      }
      const g = grant.grant;
      if (
        g.subject === key.subject &&
        g.holder === key.holder &&
        g.scope === key.scope &&
        g.requester === key.requester
      ) {
        return grant;
      }
    }
    return null;
  }

  async list(filter: { subject?: string } = {}): Promise<SignedGrant[]> {
    const grants: SignedGrant[] = [];
    for (const id of await listJsonIds(this.dataDir)) {
      const grant = await readJsonFile(this.grantPath(id), SignedGrantSchema);
      if (!grant) {
        continue;
      }
      if (
        filter.subject === undefined ||
        grant.grant.subject === filter.subject
      ) {
        grants.push(grant);
      }
    }
    return grants;
  }

  async delete(grantId: string): Promise<void> {
    try {
      await unlink(this.grantPath(grantId));
    } catch (error) {
      if (!isEnoent(error)) {
        throw error;
      }
    }
  }

  /** Clear all stored grants (for tests). */
  async clear(): Promise<void> {
    await clearJsonDir(this.dataDir);
  }
}

export const grantStore = new FileGrantStore(GRANTS_DIR);
