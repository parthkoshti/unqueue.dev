import { Link } from "@tanstack/react-router";
import { env } from "@/lib/env";
import { LogoQueueLinesIcon } from "@/components/logo-options";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex justify-center px-4 pb-6 pt-4">
      <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-border/50 bg-background/70 backdrop-blur-md backdrop-saturate-150">
        <div className="px-8 py-10">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            {/* Brand */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <LogoQueueLinesIcon size={28} />
                <span className="font-mono text-sm font-semibold text-foreground">
                  unqueue
                </span>
              </div>
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                Real-time BullMQ monitoring. Reads directly from Redis — no agents, no code changes, no stored data.
              </p>
              <p className="font-mono text-xs text-muted-foreground/50">AGPL-3.0 · Open source</p>
            </div>

            {/* Link columns */}
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div className="flex flex-col gap-3">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
                  Product
                </p>
                <nav className="flex flex-col gap-2.5">
                  <FooterLink href="/#features">Features</FooterLink>
                  <FooterLink href="/#how-it-works">How it works</FooterLink>
                  <FooterLink href="/pricing">Pricing</FooterLink>
                  <FooterLink href={env.links.signup}>Get started</FooterLink>
                  <FooterLink href={env.links.login}>Sign in</FooterLink>
                </nav>
              </div>

              <div className="flex flex-col gap-3">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
                  Resources
                </p>
                <nav className="flex flex-col gap-2.5">
                  <FooterLink href="/docs">Docs</FooterLink>
                <FooterLink href="https://github.com/unqueue/unqueue" external>GitHub</FooterLink>
                  <FooterLink href="https://github.com/unqueue/unqueue#docker--dokploy" external>Self-host</FooterLink>
                  <FooterLink href="https://github.com/unqueue/unqueue/issues" external>Issues</FooterLink>
                </nav>
              </div>

              <div className="flex flex-col gap-3">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
                  Legal
                </p>
                <nav className="flex flex-col gap-2.5">
                  <FooterLink href="https://github.com/unqueue/unqueue/blob/main/LICENSE" external>
                    AGPL-3.0
                  </FooterLink>
                </nav>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 px-8 py-4">
          <p className="text-xs text-muted-foreground/50">© {year} unqueue. Built in public.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const cls = "text-sm text-muted-foreground transition-colors hover:text-foreground";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }

  if (href.startsWith("/") && !href.startsWith("/#")) {
    return (
      <Link to={href as "/"} className={cls}>
        {children}
      </Link>
    );
  }

  return <a href={href} className={cls}>{children}</a>;
}
