import { describe, it, expect } from "vitest";
import { formatMailbox, parseMailbox } from "../src/lib/mailbox.js";

describe("parseMailbox", () => {
  it("parses a plain email address", () => {
    expect(parseMailbox("user@example.com")).toEqual({
      address: "user@example.com",
    });
  });

  it("parses RFC 5322 quoted display name with angle addr", () => {
    expect(parseMailbox('"Oliver Michalík" <olomichalik@gmail.com>')).toEqual({
      address: "olomichalik@gmail.com",
      name: "Oliver Michalík",
    });
  });

  it("parses unquoted display name with angle addr", () => {
    expect(parseMailbox("Oliver <user@example.com>")).toEqual({
      address: "user@example.com",
      name: "Oliver",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseMailbox("  user@example.com  ")).toEqual({
      address: "user@example.com",
    });
  });

  it("returns null for empty string", () => {
    expect(parseMailbox("")).toBeNull();
  });

  it("returns null for invalid email", () => {
    expect(parseMailbox("not-an-email")).toBeNull();
  });

  it("returns null for angle addr without address", () => {
    expect(parseMailbox("Name <>")).toBeNull();
  });
});

describe("formatMailbox", () => {
  it("returns plain address when no display name", () => {
    expect(formatMailbox({ address: "user@example.com" })).toBe(
      "user@example.com",
    );
  });

  it("formats display name and address", () => {
    expect(
      formatMailbox({
        address: "olomichalik@gmail.com",
        name: "Oliver Michalík",
      }),
    ).toBe('"Oliver Michalík" <olomichalik@gmail.com>');
  });

  it("escapes quotes in display name", () => {
    expect(
      formatMailbox({
        address: "a@b.com",
        name: 'Say "hi"',
      }),
    ).toBe('"Say \\"hi\\"" <a@b.com>');
  });
});
