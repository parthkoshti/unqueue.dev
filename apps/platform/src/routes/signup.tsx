import { useState } from "react";
import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { authClient } from "@/lib/auth";
import { authCallbackUrl, refreshSession } from "@/lib/auth-helpers";
import { formatAuthError, signupSchema } from "@/lib/auth-form";
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

export const Route = createFileRoute("/signup")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions());
    if (session.data?.user) throw redirect({ to: "/" });
  },
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(
    null,
  );

  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    onSubmit: async ({ value }) => {
      const parsed = signupSchema.safeParse(value);
      if (!parsed.success) {
        setFormError(parsed.error.errors[0]?.message ?? "Invalid form values");
        return;
      }

      setFormError(null);

      const result = await authClient.signUp.email({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: authCallbackUrl("/verify-email"),
      });

      if (result.error) {
        setFormError(formatAuthError(result.error, "Could not create your account"));
        return;
      }

      const session = await refreshSession(queryClient);
      if (session.data?.user) {
        navigate({ to: "/" });
        return;
      }

      setPendingVerificationEmail(parsed.data.email);
    },
  });

  if (pendingVerificationEmail) {
    return (
      <AuthLayout
        title="Almost there"
        description="Verify your email to finish creating your account."
        footer={
          <>
            <button
              type="button"
              className="font-medium text-foreground hover:underline"
              onClick={() => {
                setPendingVerificationEmail(null);
                form.reset();
              }}
            >
              Use a different email
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
      title="Create your account"
      description="Get started with Unqueue in a few seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground hover:underline">
            Sign in
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
          name="name"
          validators={{
            onChange: ({ value }) => {
              const trimmed = value.trim();
              if (!trimmed) return "Name is required";
              if (trimmed.length < 2) return "Name must be at least 2 characters";
              return undefined;
            },
          }}
        >
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">Name</Label>
              <Input
                id="signup-name"
                autoComplete="name"
                placeholder="Jane Doe"
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
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
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
            onChange: ({ value }) => {
              if (!value) return "Password is required";
              if (value.length < 8) return "Password must be at least 8 characters";
              return undefined;
            },
          }}
        >
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <PasswordInput
                id="signup-password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
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
          loadingText="Creating account..."
        >
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
