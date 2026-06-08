import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileConfigStore } from "../src/services/config-store.js";
import type { InstanceConfig } from "@huglo/module-sdk";

function sampleConfig(overrides: Partial<InstanceConfig> = {}): InstanceConfig {
  return {
    instanceId: "inst-test-001",
    subject: "huglo:user:alice",
    directorySubject: "huglo:user:alice",
    values: {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      username: "user@example.com",
      password: "secret",
      fromAddress: "sender@example.com",
    },
    ...overrides,
  };
}

describe("FileConfigStore", () => {
  let dataDir: string;
  let store: FileConfigStore;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), "email-config-"));
    store = new FileConfigStore(dataDir);
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("set then get round-trips an identical config", async () => {
    const config = sampleConfig();
    await store.set(config);

    const loaded = await store.get(config.instanceId);
    expect(loaded).toEqual(config);
  });

  it("writes pretty-printed JSON to config/<instanceId>.json", async () => {
    const config = sampleConfig({ instanceId: "inst-file-001" });
    await store.set(config);

    const raw = await readFile(path.join(dataDir, "inst-file-001.json"), "utf8");
    expect(raw).toBe(`${JSON.stringify(config, null, 2)}\n`);
  });

  it("get returns null when the config file does not exist", async () => {
    const loaded = await store.get("inst-missing");
    expect(loaded).toBeNull();
  });

  it("listBySubject returns only configs for that subject", async () => {
    await store.set(sampleConfig({ instanceId: "inst-a", subject: "huglo:user:alice" }));
    await store.set(sampleConfig({ instanceId: "inst-b", subject: "huglo:user:bob" }));

    const aliceConfigs = await store.listBySubject("huglo:user:alice");
    expect(aliceConfigs).toHaveLength(1);
    expect(aliceConfigs[0]?.instanceId).toBe("inst-a");
  });

  it("delete removes the config file", async () => {
    const config = sampleConfig({ instanceId: "inst-del-001" });
    await store.set(config);
    await store.delete("inst-del-001");

    const loaded = await store.get("inst-del-001");
    expect(loaded).toBeNull();
  });

  it("clear removes all config files", async () => {
    await store.set(sampleConfig({ instanceId: "inst-1" }));
    await store.set(sampleConfig({ instanceId: "inst-2" }));
    await store.clear();

    const aliceConfigs = await store.listBySubject("huglo:user:alice");
    expect(aliceConfigs).toHaveLength(0);
  });
});
