import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { configStore } from "../src/services/config-store.js";
import {
  createTestHarness,
  TEST_SMTP,
  TEST_SUBJECT,
  type TestHarness,
} from "./helpers/harness.js";

const invokeContext = {
  flowId: "flow-1",
  nodeId: "node-1",
  configInstanceId: "smtp-instance-1",
};

const sentMails: Array<{
  from: string;
  to: string;
  subject: string;
  text: string;
  attachments?: unknown;
}> = [];

vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (options: {
        from: string;
        to: string;
        subject: string;
        text: string;
        attachments?: unknown;
      }) => {
        sentMails.push({
          from: options.from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          attachments: options.attachments,
        });
        return {
          messageId: "<test-message-id>",
          accepted: [options.to],
          rejected: [],
          pending: [],
          response: "250 OK",
        };
      },
      close: () => {},
      isIdle: () => true,
      verify: async () => true,
    }),
  },
}));

describe("email:send integration", () => {
  let harness: TestHarness;

  beforeAll(async () => {
    harness = await createTestHarness();
  });

  afterAll(() => {
    harness.cleanup();
  });

  beforeEach(async () => {
    sentMails.length = 0;
    await configStore.clear();
    await configStore.set({
      instanceId: "smtp-instance-1",
      subject: TEST_SUBJECT,
      directorySubject: TEST_SUBJECT,
      values: TEST_SMTP,
    });
  });

  it("completes a signed module.call round trip", async () => {
    const grant = harness.buildGrant({ grant_id: "g-send-001" });

    const result = await harness.requesterModule.call({
      target: "email-sender",
      scope: "email:send",
      input: {
        subject: "Test subject",
        recipient: "recipient@example.com",
        body: "Hello world",
        context: invokeContext,
      },
      grant,
    });

    expect(result).toEqual({
      messageId: "<test-message-id>",
      accepted: ["recipient@example.com"],
      rejected: [],
    });

    expect(sentMails).toHaveLength(1);
    expect(sentMails[0]).toMatchObject({
      from: '"Test Sender" <sender@example.com>',
      to: "recipient@example.com",
      subject: "Test subject",
      text: "Hello world",
    });
  });

  it("includes attachments when provided", async () => {
    const grant = harness.buildGrant({ grant_id: "g-send-002" });
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();

    await harness.requesterModule.call({
      target: "email-sender",
      scope: "email:send",
      input: {
        subject: "With attachment",
        recipient: "recipient@example.com",
        body: "See attached",
        context: invokeContext,
        attachments: [
          {
            url: "https://files.example.com/report.pdf",
            content_type: "application/pdf",
            filename: "report.pdf",
            size: 2048,
            expires_at: expiresAt,
          },
        ],
      },
      grant,
    });

    expect(sentMails.at(-1)?.attachments).toEqual([
      {
        filename: "report.pdf",
        path: "https://files.example.com/report.pdf",
        contentType: "application/pdf",
      },
    ]);
  });

  it("returns dry-run preview without sending", async () => {
    const grant = harness.buildGrant({ grant_id: "g-dryrun-001" });

    const result = await harness.requesterModule.call({
      target: "email-sender",
      scope: "email:send",
      input: {
        subject: "Dry run",
        recipient: "recipient@example.com",
        body: "Not sent",
        context: invokeContext,
      },
      grant,
      dryRun: true,
    });

    expect(result).toEqual({
      messageId: "dry-run-preview",
      accepted: ["recipient@example.com"],
      rejected: [],
    });
    expect(sentMails).toHaveLength(0);
  });
});
