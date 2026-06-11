import { MoonIcon, SunIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@unqueue/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@unqueue/ui/components/card";

type AuthLayoutProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.92_0_0/0.5),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.25_0.02_264/0.35),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(0.85_0_0/0.08)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.85_0_0/0.08)_1px,transparent_1px)] bg-size-[3rem_3rem] dark:bg-[linear-gradient(to_right,oklch(1_0_0/0.04)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.04)_1px,transparent_1px)]"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
      </Button>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link
            to="/login"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
              U
            </div>
            <span className="text-lg font-semibold tracking-tight">Unqueue</span>
          </Link>
          <p className="max-w-sm text-sm text-muted-foreground">
            Monitor and manage your BullMQ queues in one place.
          </p>
        </div>

        <Card className="border-border/80 shadow-lg shadow-black/5 dark:shadow-black/20">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>

        {footer ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function AuthFormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

export function AuthFieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="text-xs text-destructive">{message}</p>;
}
