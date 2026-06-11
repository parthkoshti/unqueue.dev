import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MailCheckIcon } from "lucide-react";
import { authClient } from "@/lib/auth";
import { authCallbackUrl } from "@/lib/auth-helpers";
import { formatAuthError } from "@/lib/auth-form";
import { AuthFormError } from "@/components/auth/auth-layout";
import { Button } from "@unqueue/ui/components/button";

type VerificationNoticeProps = {
  email: string;
  title?: string;
  description?: string;
};

export function VerificationNotice({
  email,
  title = "Check your email",
  description = "We sent a verification link to finish setting up your account.",
}: VerificationNoticeProps) {
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);

    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: authCallbackUrl("/verify-email"),
    });

    setIsResending(false);

    if (result.error) {
      setResendError(formatAuthError(result.error, "Could not resend verification email"));
      return;
    }

    setResendSuccess(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-5 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          <MailCheckIcon className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-sm font-medium text-foreground">{email}</p>
        </div>
      </div>

      {resendError ? <AuthFormError message={resendError} /> : null}
      {resendSuccess ? (
        <p className="text-center text-sm text-muted-foreground">
          Verification email sent again.
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        loading={isResending}
        loadingText="Sending..."
        onClick={() => void handleResend()}
      >
        Resend verification email
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already verified?{" "}
        <Link to="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
