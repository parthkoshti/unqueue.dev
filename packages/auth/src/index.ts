import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createId } from "@unstall/shared";
import type { Database } from "@unstall/db";
import * as schema from "@unstall/db/schema";
import { createMailer } from "./mailer.js";
import { bootstrapWorkspace } from "./hooks.js";

export type CreateAuthOptions = {
  db: Database;
  baseURL: string;
  secret: string;
  cookieDomain?: string;
  platformURL: string;
};

export function createAuth(options: CreateAuthOptions) {
  const mailer = createMailer();

  return betterAuth({
    appName: "Unstall",
    baseURL: options.baseURL,
    secret: options.secret,
    database: drizzleAdapter(options.db, {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await bootstrapWorkspace(options.db, user.id, user.name);
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await mailer.send({
          to: user.email,
          subject: "Reset your Unstall password",
          html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await mailer.send({
          to: user.email,
          subject: "Verify your Unstall email",
          html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
        });
      },
      sendOnSignUp: true,
    },
    advanced: {
      database: {
        generateId: () => createId(),
      },
      crossSubDomainCookies: options.cookieDomain
        ? {
            enabled: true,
            domain: options.cookieDomain,
          }
        : undefined,
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    trustedOrigins: [options.platformURL],
  });
}

export type Auth = ReturnType<typeof createAuth>;
