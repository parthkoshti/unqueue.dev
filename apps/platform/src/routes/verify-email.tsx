import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/auth-layout";
import { refreshSession, safeRedirectPath } from "@/lib/auth-helpers";
import { sessionQueryOptions } from "@/lib/session-query";
import { Button } from "@unqueue/ui/components/button";

const searchSchema = z.object({
  error: z.string().optional(),
  redirect: z.string().optional(),
});

const verificationErrors: Record<string, string> = {
  INVALID_TOKEN: "This verification link is invalid or has expired.",
  TOKEN_EXPIRED: "This verification link has expired.",
};

export const Route = createFileRoute("/verify-email")({
  validateSearch: searchSchema,
  beforeLoad: async ({ context, search }) => {
    if (search.error) return;

    const session = await context.queryClient.ensureQueryData(sessionQueryOptions());
    if (session.data?.user?.emailVerified) {
      throw redirect({ href: safeRedirectPath(search.redirect) });
    }
  },
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { error, redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    if (error) return;
    void refreshSession(queryClient);
  }, [error, queryClient]);

  if (error) {
    const message = verificationErrors[error] ?? "We could not verify your email.";

    return (
      <AuthLayout
        title="Verification failed"
        description="Your email could not be verified."
        footer={
          <>
            Need a new link?{" "}
            <Link to="/login" className="font-medium text-foreground hover:underline">
              Sign in to resend
            </Link>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-5 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <XCircleIcon className="size-5" />
            </div>
            <p className="text-sm text-destructive">{message}</p>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  const handleContinue = async () => {
    setIsContinuing(true);
    const session = await refreshSession(queryClient);
    setIsContinuing(false);

    if (session.data?.user) {
      navigate({ href: safeRedirectPath(redirectTo) });
      return;
    }

    navigate({ to: "/login" });
  };

  return (
    <AuthLayout
      title="Email verified"
      description="Your email is confirmed. You can continue into Unqueue."
      footer={
        <>
          Wrong account?{" "}
          <Link to="/login" className="font-medium text-foreground hover:underline">
            Sign in with another email
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-5 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2Icon className="size-5" />
          </div>
          <p className="text-sm text-muted-foreground">
            You&apos;re all set. Continue to open your workspace.
          </p>
        </div>

        <Button
          type="button"
          className="w-full"
          loading={isContinuing}
          loadingText="Continuing..."
          onClick={() => void handleContinue()}
        >
          Continue to Unqueue
        </Button>
      </div>
    </AuthLayout>
  );
}
