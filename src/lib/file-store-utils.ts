import { mkdir, readdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";

/* =============================================================================
 * JSON file helpers
 *
 * Shared by grant-store and config-store: pretty-printed writes, schema-validated
 * reads, list ids from *.json filenames, clear directory for tests.
 * ============================================================================= */

export function isEnoent(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

export async function ensureDir(dataDir: string): Promise<void> {
  await mkdir(dataDir, { recursive: true });
}

export async function writeJsonFile(
  filePath: string,
  data: unknown,
): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readJsonFile<T>(
  filePath: string,
  schema: z.ZodType<T>,
): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return schema.parse(JSON.parse(raw));
  } catch (error) {
    if (isEnoent(error)) {
      return null;
    }
    throw error;
  }
}

export async function listJsonIds(dataDir: string): Promise<string[]> {
  await ensureDir(dataDir);

  let entries: string[];
  try {
    entries = await readdir(dataDir);
  } catch (error) {
    if (isEnoent(error)) {
      return [];
    }
    throw error;
  }

  return entries
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.slice(0, -".json".length));
}

export async function clearJsonDir(dataDir: string): Promise<void> {
  const ids = await listJsonIds(dataDir);
  await Promise.all(
    ids.map((id) =>
      unlink(path.join(dataDir, `${id}.json`)).catch((error) => {
        if (!isEnoent(error)) {
          throw error;
        }
      }),
    ),
  );
}
