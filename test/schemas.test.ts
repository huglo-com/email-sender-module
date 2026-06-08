import { describe, it, expect } from "vitest";
import { assembleConfigValues } from "@huglo/module-sdk";
import {
  SmtpConfigSchema,
  EmailInputSchema,
  emailConfigDefinition,
} from "../src/lib/schemas.js";
import { testContext } from "./fixtures.js";

describe("schemas", () => {
  it("validates a complete SMTP config", () => {
    const parsed = SmtpConfigSchema.parse({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      username: "user@example.com",
      password: "secret",
      fromAddress: "sender@example.com",
      fromName: "Sender",
    });

    expect(parsed.port).toBe(587);
    expect(parsed.secure).toBe(false);
  });

  it("applies SMTP defaults for port and secure", () => {
    const parsed = SmtpConfigSchema.parse({
      host: "smtp.example.com",
      username: "user@example.com",
      password: "secret",
      fromAddress: "sender@example.com",
    });

    expect(parsed.port).toBe(587);
    expect(parsed.secure).toBe(false);
  });

  it("parses RFC 5322 recipient string into normalized recipient", () => {
    const parsed = EmailInputSchema.parse({
      subject: "Ahoj",
      recipient: '"Oliver Michalík" <olomichalik@gmail.com>',
      body: "ahoj",
      context: testContext,
    });

    expect(parsed.recipient.address).toBe("olomichalik@gmail.com");
    expect(parsed.recipient.name).toBe("Oliver Michalík");
    expect(parsed.recipient.formatted).toBe(
      '"Oliver Michalík" <olomichalik@gmail.com>',
    );
  });

  it("rejects invalid recipient strings", () => {
    expect(() =>
      EmailInputSchema.parse({
        subject: "Hi",
        recipient: "not-valid",
        body: "text",
        context: testContext,
      }),
    ).toThrow();
  });

  it("accepts email input without subject or body", () => {
    const parsed = EmailInputSchema.parse({
      recipient: "recipient@example.com",
      context: testContext,
    });

    expect(parsed.subject).toBeUndefined();
    expect(parsed.body).toBeUndefined();
    expect(parsed.recipient.address).toBe("recipient@example.com");
  });

  it("validates email input with optional attachments", () => {
    const parsed = EmailInputSchema.parse({
      subject: "Hello",
      recipient: "recipient@example.com",
      body: "Message body",
      context: testContext,
      attachments: [
        {
          url: "https://files.example.com/doc.pdf",
          content_type: "application/pdf",
          filename: "doc.pdf",
          size: 1024,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
        },
      ],
    });

    expect(parsed.attachments).toHaveLength(1);
    expect(parsed.attachments?.[0]?.filename).toBe("doc.pdf");
  });

  it("assembles config values from userEntered fields", () => {
    const assembled = assembleConfigValues({
      definition: emailConfigDefinition,
      userValues: {
        host: "smtp.example.com",
        port: 465,
        secure: true,
        username: "user@example.com",
        password: "secret",
        fromAddress: "sender@example.com",
        fromName: "Sender",
      },
      hostValues: {},
    });

    expect(assembled.parsed.host).toBe("smtp.example.com");
    expect(assembled.parsed.port).toBe(465);
    expect(assembled.parsed.secure).toBe(true);
  });
});
