import path from "node:path";
import { unlink } from "node:fs/promises";
import type { ConfigStore, InstanceConfig } from "@huglo/module-sdk";
import { CONFIG_DIR } from "../config.js";
import { InstanceConfigSchema } from "../lib/store-schemas.js";
import {
  clearJsonDir,
  ensureDir,
  isEnoent,
  listJsonIds,
  readJsonFile,
  writeJsonFile,
} from "../lib/file-store-utils.js";

/* =============================================================================
 * Config storage allows to store and retrieve the configuration for each instance
 * of the module. It implements the ConfigStore interface.
 *
 * User can have multiple instances of the configuration. Each instance has an instanceId.
 *
 * In this example, we store the configuration in a JSON file per instanceId.
 * ============================================================================= */

export class FileConfigStore implements ConfigStore {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  private configPath(instanceId: string): string {
    return path.join(this.dataDir, `${instanceId}.json`);
  }

  async get(instanceId: string): Promise<InstanceConfig | null> {
    return readJsonFile(this.configPath(instanceId), InstanceConfigSchema);
  }

  async set(config: InstanceConfig): Promise<void> {
    await ensureDir(this.dataDir);
    await writeJsonFile(this.configPath(config.instanceId), config);
  }

  async listBySubject(subject: string): Promise<InstanceConfig[]> {
    const configs: InstanceConfig[] = [];
    for (const id of await listJsonIds(this.dataDir)) {
      const config = await readJsonFile(this.configPath(id), InstanceConfigSchema);
      if (config?.subject === subject) {
        configs.push(config);
      }
    }
    return configs;
  }

  async delete(instanceId: string): Promise<void> {
    try {
      await unlink(this.configPath(instanceId));
    } catch (error) {
      if (!isEnoent(error)) {
        throw error;
      }
    }
  }

  /** Clear all stored configs (for tests). */
  async clear(): Promise<void> {
    await clearJsonDir(this.dataDir);
  }
}

export const configStore = new FileConfigStore(CONFIG_DIR);
