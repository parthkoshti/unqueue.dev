import nodemailer from "nodemailer";

export function createMailer() {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  return {
    async send(options: { to: string; subject: string; html: string }) {
      if (!process.env.SMTP_HOST) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("SMTP is not configured");
        }
        console.warn(
          `[auth] SMTP not configured; skipped email to ${options.to}: ${options.subject}`,
        );
        return;
      }

      await transport.sendMail({
        from: process.env.SMTP_FROM ?? "noreply@unqueue.dev",
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    },
  };
}
