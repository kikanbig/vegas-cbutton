import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn().mockResolvedValue({ messageId: "test" });
const createTransport = vi.fn(() => ({ sendMail }));
const resendSend = vi.fn().mockResolvedValue({});

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

const ENV_KEYS = [
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_PORT",
  "SMTP_SECURE",
  "MAIL_FROM",
  "RESEND_API_KEY",
];

describe("mail", () => {
  beforeEach(() => {
    vi.resetModules();
    sendMail.mockClear();
    createTransport.mockClear();
    resendSend.mockClear();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it("is configured only when SMTP or Resend is complete", async () => {
    const { isEmailConfigured } = await import("./mail.js");
    expect(isEmailConfigured()).toBe(false);

    process.env.SMTP_HOST = "smtp.hoster.by";
    process.env.SMTP_USER = "cbutton@vegas.by";
    expect(isEmailConfigured()).toBe(false);

    process.env.SMTP_PASS = "secret";
    expect(isEmailConfigured()).toBe(true);

    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    process.env.RESEND_API_KEY = "re_test";
    process.env.MAIL_FROM = "Vegas <cbutton@vegas.by>";
    expect(isEmailConfigured()).toBe(true);
  });

  it("sends OTP through SMTP with SSL defaults", async () => {
    process.env.SMTP_HOST = "smtp.hoster.by";
    process.env.SMTP_USER = "cbutton@vegas.by";
    process.env.SMTP_PASS = "secret";
    const { sendOtpEmail } = await import("./mail.js");
    await sendOtpEmail("anna@vegas.by", "12345678", "Анна");

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.hoster.by",
        port: 465,
        secure: true,
        auth: { user: "cbutton@vegas.by", pass: "secret" },
      })
    );
    expect(sendMail).toHaveBeenCalledOnce();
    const payload = sendMail.mock.calls[0][0];
    expect(payload.to).toBe("anna@vegas.by");
    expect(payload.subject).toContain("Код входа");
    expect(payload.html).toContain("12345678");
    expect(payload.html).toContain("Анна");
    expect(payload.text).toContain("12345678");
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("falls back to Resend when SMTP is missing", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.MAIL_FROM = "Vegas <cbutton@vegas.by>";
    const { sendOtpEmail } = await import("./mail.js");
    await sendOtpEmail("anna@vegas.by", "87654321", null);

    expect(createTransport).not.toHaveBeenCalled();
    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "anna@vegas.by",
        from: "Vegas <cbutton@vegas.by>",
      })
    );
    expect(resendSend.mock.calls[0][0].html).toContain("87654321");
    expect(resendSend.mock.calls[0][0].html).toContain("Здравствуйте!");
  });
});
