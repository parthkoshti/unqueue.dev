import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { DOC_NAV } from "@/lib/docs";

export const Route = createFileRoute("/docs")({
  component: DocsLayout,
});

function DocsLayout() {
  const location = useLocation();
  const currentSlug = location.pathname.replace("/docs/", "").replace("/docs", "");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-24 sm:px-6">
      <div className="flex gap-12">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-24">
            <p className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
              Docs
            </p>
            <nav className="space-y-6">
              {DOC_NAV.map((section) => (
                <div key={section.label}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
                    {section.label}
                  </p>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = currentSlug === item.slug;
                      return (
                        <li key={item.slug}>
                          <Link
                            to="/docs/$slug"
                            params={{ slug: item.slug }}
                            className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                              isActive
                                ? "bg-primary/10 font-medium text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            }`}
                          >
                            {item.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {/* Mobile nav */}
          <div className="mb-8 lg:hidden">
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              value={currentSlug}
              onChange={(e) => {
                window.location.href = `/docs/${e.target.value}`;
              }}
            >
              {DOC_NAV.flatMap((section) =>
                section.items.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {section.label} — {item.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
