import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { GithubIcon, MenuIcon, MonitorIcon, MoonIcon, SunIcon, XIcon } from "lucide-react";
import { LogoQueueLinesIcon } from "@/components/logo-options";
import { useTheme, type Theme } from "@/lib/theme";
import { env } from "@/lib/env";

const CYCLE: Theme[] = ["system", "light", "dark"];

function scrollToHash(hash: string) {
  document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
}

function useHashNav(hash: string) {
  const router = useRouter();
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (router.state.location.pathname === "/") {
      scrollToHash(hash);
    } else {
      void router.navigate({ to: "/", hash });
      // after navigation, snap-scroll is fine — no flash since the element is in view
    }
  };
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  function cycleTheme() {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    setTheme(next);
  }

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <div className="w-full max-w-6xl">
        {/* Island bar */}
        <nav className="relative flex items-center justify-between rounded-2xl border border-border/50 bg-background/70 px-4 py-2.5 backdrop-blur-md backdrop-saturate-150">
          <Link
            to="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <LogoQueueLinesIcon size={28} />
            <span className="font-mono text-sm font-semibold text-foreground">
              unqueue
            </span>
          </Link>

          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-5 md:flex">
            <HashLink hash="features" label="Features" />
            <HashLink hash="how-it-works" label="How it works" />
            <Link
              to="/pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              to="/docs"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </Link>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle theme={theme} onClick={cycleTheme} />
            <a
              href="https://github.com/unqueue/unqueue"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <GithubIcon className="size-4" />
            </a>
            <a
              href={env.links.login}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </a>
            <a
              href={env.links.signup}
              className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get started
            </a>
          </div>

          <button
            type="button"
            className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <XIcon className="size-4" /> : <MenuIcon className="size-4" />}
          </button>
        </nav>

        {/* Mobile drawer — drops below the island */}
        {open && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-border/50 bg-background/80 p-3 backdrop-blur-md backdrop-saturate-150 md:hidden">
            <div className="flex flex-col gap-0.5">
              {[
                { label: "Features", hash: "features" },
                { label: "How it works", hash: "how-it-works" },
              ].map((item) => (

                <HashLink
                  key={item.label}
                  hash={item.hash}
                  label={item.label}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onNavigate={() => setOpen(false)}
                />
              ))}
              <Link
                to="/pricing"
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                Pricing
              </Link>
              <Link
                to="/docs"
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                Docs
              </Link>
              <a
                href="https://github.com/unqueue/unqueue"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                GitHub ↗
              </a>
              <div className="mt-2 flex flex-col gap-2 border-t border-border/40 pt-2">
                <button
                  type="button"
                  onClick={cycleTheme}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ThemeIcon theme={theme} />
                  {theme === "system" ? "System theme" : theme === "dark" ? "Dark theme" : "Light theme"}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={env.links.login}
                    className="rounded-lg border border-border px-3 py-2 text-center text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    Sign in
                  </a>
                  <a
                    href={env.links.signup}
                    className="rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Get started
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "dark") return <MoonIcon className="size-3.5" />;
  if (theme === "light") return <SunIcon className="size-3.5" />;
  return <MonitorIcon className="size-3.5" />;
}

function HashLink({
  hash,
  label,
  className = "text-sm text-muted-foreground transition-colors hover:text-foreground",
  onNavigate,
}: {
  hash: string;
  label: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const handleClick = useHashNav(hash);
  return (
    <a
      href={`/#${hash}`}
      className={className}
      onClick={(e) => {
        handleClick(e);
        onNavigate?.();
      }}
    >
      {label}
    </a>
  );
}

function ThemeToggle({ theme, onClick }: { theme: Theme; onClick: () => void }) {
  const labels: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Theme: ${labels[theme]}. Click to cycle.`}
      className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}
