import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { signObject, generateKeyPair } from "@huglo/module-sdk";
import type { SignedGrant } from "@huglo/module-sdk";
import { FileGrantStore } from "../src/services/grant-store.js";

function sampleGrant(
  authorKeys: ReturnType<typeof generateKeyPair>,
  overrides: Partial<SignedGrant["grant"]> = {},
): SignedGrant {
  const grant = {
    grant_id: "g-test-001",
    holder: "email-sender",
    scope: "email:send",
    subject: "huglo:user:alice",
    requester: "requester",
    author: "huglo:user:alice",
    constraints: {},
    issued_at: new Date(Date.now() - 60_000).toISOString(),
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    ...overrides,
  };
  return {
    grant,
    signature: signObject(grant, authorKeys.privateKey),
  };
}

describe("FileGrantStore", () => {
  let dataDir: string;
  let store: FileGrantStore;
  const authorKeys = generateKeyPair();

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), "email-grants-"));
    store = new FileGrantStore(dataDir);
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("save then find returns the same grant", async () => {
    const grant = sampleGrant(authorKeys);
    await store.save(grant);

    const found = await store.find({
      subject: grant.grant.subject,
      holder: grant.grant.holder,
      scope: grant.grant.scope,
      requester: grant.grant.requester,
    });

    expect(found).toEqual(grant);
  });

  it("writes pretty-printed JSON to grants/<grant_id>.json", async () => {
    const grant = sampleGrant(authorKeys, { grant_id: "g-file-001" });
    await store.save(grant);

    const raw = await readFile(path.join(dataDir, "g-file-001.json"), "utf8");
    expect(raw).toBe(`${JSON.stringify(grant, null, 2)}\n`);
  });

  it("find returns null when no matching grant exists", async () => {
    const found = await store.find({
      subject: "huglo:user:missing",
      holder: "email-sender",
      scope: "email:send",
      requester: "requester",
    });
    expect(found).toBeNull();
  });

  it("list returns grants filtered by subject", async () => {
    await store.save(sampleGrant(authorKeys, { grant_id: "g-a", subject: "huglo:user:alice" }));
    await store.save(sampleGrant(authorKeys, { grant_id: "g-b", subject: "huglo:user:bob" }));

    const aliceGrants = await store.list({ subject: "huglo:user:alice" });
    expect(aliceGrants).toHaveLength(1);
    expect(aliceGrants[0]?.grant.grant_id).toBe("g-a");
  });

  it("delete removes the grant file", async () => {
    const grant = sampleGrant(authorKeys, { grant_id: "g-del-001" });
    await store.save(grant);
    await store.delete("g-del-001");

    const found = await store.find({
      subject: grant.grant.subject,
      holder: grant.grant.holder,
      scope: grant.grant.scope,
      requester: grant.grant.requester,
    });
    expect(found).toBeNull();
  });

  it("clear removes all grant files", async () => {
    await store.save(sampleGrant(authorKeys, { grant_id: "g-1" }));
    await store.save(sampleGrant(authorKeys, { grant_id: "g-2" }));
    await store.clear();

    const all = await store.list();
    expect(all).toHaveLength(0);
  });
});
