import { useState } from "react";
import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { authClient } from "@/lib/auth";
import {
  authCallbackUrl,
  refreshSession,
  safeRedirectPath,
} from "@/lib/auth-helpers";
import { formatAuthError, isEmailNotVerifiedError, loginSchema } from "@/lib/auth-form";
import { sessionQueryOptions } from "@/lib/session-query";
import {
  AuthFieldError,
  AuthFormError,
  AuthLayout,
} from "@/components/auth/auth-layout";
import { PasswordInput } from "@/components/auth/password-input";
import { VerificationNotice } from "@/components/auth/verification-notice";
import { Button } from "@unqueue/ui/components/button";
import { Input } from "@unqueue/ui/components/input";
import { Label } from "@unqueue/ui/components/label";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions());
    if (session.data?.user) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(
    null,
  );

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      const parsed = loginSchema.safeParse(value);
      if (!parsed.success) {
        setFormError(parsed.error.errors[0]?.message ?? "Invalid form values");
        return;
      }

      setFormError(null);
      setPendingVerificationEmail(null);

      const result = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: authCallbackUrl("/verify-email"),
      });

      if (result.error) {
        if (isEmailNotVerifiedError(result.error)) {
          setPendingVerificationEmail(parsed.data.email);
        }
        setFormError(formatAuthError(result.error, "Invalid email or password"));
        return;
      }

      const session = await refreshSession(queryClient);
      if (!session.data?.user) {
        setFormError("Sign in succeeded but no session was created. Try again.");
        return;
      }

      navigate({ href: safeRedirectPath(redirectTo) });
    },
  });

  if (pendingVerificationEmail) {
    return (
      <AuthLayout
        title="Verify your email"
        description="You need to confirm your email before signing in."
        footer={
          <>
            <button
              type="button"
              className="font-medium text-foreground hover:underline"
              onClick={() => setPendingVerificationEmail(null)}
            >
              Back to sign in
            </button>
          </>
        }
      >
        <VerificationNotice email={pendingVerificationEmail} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your account to continue."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-medium text-foreground hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        noValidate
      >
        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) => {
              if (!value.trim()) return "Email is required";
              if (!z.string().email().safeParse(value.trim()).success) {
                return "Enter a valid email";
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  if (formError) setFormError(null);
                }}
                onBlur={field.handleBlur}
                aria-invalid={!!field.state.meta.errors.length}
                disabled={form.state.isSubmitting}
              />
              <AuthFieldError message={field.state.meta.errors[0]} />
            </div>
          )}
        </form.Field>

        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) =>
              !value ? "Password is required" : undefined,
          }}
        >
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <PasswordInput
                id="login-password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  if (formError) setFormError(null);
                }}
                onBlur={field.handleBlur}
                aria-invalid={!!field.state.meta.errors.length}
                disabled={form.state.isSubmitting}
              />
              <AuthFieldError message={field.state.meta.errors[0]} />
            </div>
          )}
        </form.Field>

        {formError ? <AuthFormError message={formError} /> : null}

        <Button
          type="submit"
          className="h-9 w-full"
          loading={form.state.isSubmitting}
          loadingText="Signing in..."
        >
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
