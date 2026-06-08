import { describe, it, expect, vi } from "vitest";
import type { ProtectedCtx } from "@huglo/module-sdk";
import * as mailer from "../src/services/mailer.js";
import { sendEmail } from "../src/scopes/email.send.js";
import { EmailInputSchema, type EmailInput } from "../src/lib/schemas.js";
import { TEST_SMTP, TEST_SUBJECT } from "./helpers/harness.js";
import { testContext } from "./fixtures.js";

type WireEmailInput = {
  subject?: string;
  recipient: string;
  body?: string;
  attachments?: EmailInput["attachments"];
  context?: EmailInput["context"];
};

function parseEmailInput(wire: WireEmailInput): EmailInput {
  return EmailInputSchema.parse({
    context: testContext,
    ...wire,
  });
}

function makeCtx(
  wire: WireEmailInput,
  overrides: Partial<ProtectedCtx<EmailInput>> = {},
): ProtectedCtx<EmailInput> {
  const input = parseEmailInput(wire);
  return {
    open: false,
    subject: TEST_SUBJECT,
    input,
    grant: {} as ProtectedCtx<EmailInput>["grant"],
    caller: "requester",
    scope: "email:send",
    requestId: "req-1",
    dryRun: false,
    config: { instanceId: "smtp-1", values: TEST_SMTP },
    ...overrides,
  };
}

describe("deliverEmail", () => {
  it("sends via injected transport factory", async () => {
    const sent: Array<Record<string, unknown>> = [];

    await mailer.deliverEmail(
      TEST_SMTP,
      parseEmailInput({
        subject: "Hello",
        recipient: "recipient@example.com",
        body: "Message body",
      }),
      () => ({
        sendMail: async (options) => {
          sent.push(options as Record<string, unknown>);
          return {
            messageId: "<test-id>",
            accepted: [String(options.to)],
            rejected: [],
            pending: [],
            response: "250 OK",
          };
        },
      }),
    );

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      from: '"Test Sender" <sender@example.com>',
      to: "recipient@example.com",
      subject: "Hello",
      text: "Message body",
    });
  });

  it("omits subject and text when not provided", async () => {
    const sent: Array<Record<string, unknown>> = [];

    await mailer.deliverEmail(
      TEST_SMTP,
      parseEmailInput({
        recipient: "recipient@example.com",
      }),
      () => ({
        sendMail: async (options) => {
          sent.push(options as Record<string, unknown>);
          return {
            messageId: "<test-id>",
            accepted: [String(options.to)],
            rejected: [],
            pending: [],
            response: "250 OK",
          };
        },
      }),
    );

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      from: '"Test Sender" <sender@example.com>',
      to: "recipient@example.com",
    });
    expect(sent[0]).not.toHaveProperty("subject");
    expect(sent[0]).not.toHaveProperty("text");
  });

  it("maps attachments for nodemailer", async () => {
    const sent: Array<Record<string, unknown>> = [];
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();

    await mailer.deliverEmail(
      TEST_SMTP,
      parseEmailInput({
        subject: "With attachment",
        recipient: "recipient@example.com",
        body: "See attached",
        attachments: [
          {
            url: "https://files.example.com/report.pdf",
            content_type: "application/pdf",
            filename: "report.pdf",
            size: 2048,
            expires_at: expiresAt,
          },
        ],
      }),
      () => ({
        sendMail: async (options) => {
          sent.push(options as Record<string, unknown>);
          return {
            messageId: "<test-id>",
            accepted: [String(options.to)],
            rejected: [],
            pending: [],
            response: "250 OK",
          };
        },
      }),
    );

    expect(sent[0]?.attachments).toEqual([
      {
        filename: "report.pdf",
        path: "https://files.example.com/report.pdf",
        contentType: "application/pdf",
      },
    ]);
  });
});

describe("previewEmail", () => {
  it("returns a dry-run preview without sending", () => {
    expect(
      mailer.previewEmail(
        parseEmailInput({
          subject: "Dry run",
          recipient: "recipient@example.com",
          body: "Not sent",
        }),
      ),
    ).toEqual({
      messageId: "dry-run-preview",
      accepted: ["recipient@example.com"],
      rejected: [],
    });
  });
});

describe("sendEmail handler", () => {
  it("returns dry-run preview without calling deliverEmail", async () => {
    const deliverSpy = vi.spyOn(mailer, "deliverEmail");

    const result = await sendEmail(
      makeCtx(
        {
          subject: "Dry run",
          recipient: "recipient@example.com",
          body: "Not sent",
        },
        { dryRun: true },
      ),
    );

    expect(result.messageId).toBe("dry-run-preview");
    expect(deliverSpy).not.toHaveBeenCalled();

    deliverSpy.mockRestore();
  });

  it("delegates to deliverEmail when not a dry run", async () => {
    const deliverSpy = vi.spyOn(mailer, "deliverEmail").mockResolvedValue({
      messageId: "<mock-id>",
      accepted: ["recipient@example.com"],
      rejected: [],
    });

    const result = await sendEmail(
      makeCtx({
        subject: "Hello",
        recipient: "recipient@example.com",
        body: "Message body",
      }),
    );

    expect(result.messageId).toBe("<mock-id>");
    expect(deliverSpy).toHaveBeenCalledOnce();

    deliverSpy.mockRestore();
  });
});
