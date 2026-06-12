import { createFileRoute, notFound } from "@tanstack/react-router";
import { loadDocComponent } from "@/lib/docs";
import { usePageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/docs/$slug")({
  loader: async ({ params }) => {
    const mod = await loadDocComponent(params.slug);
    if (!mod) throw notFound();
    return { Doc: mod.default, frontmatter: mod.frontmatter };
  },
  component: DocPage,
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <p className="text-muted-foreground">Page not found.</p>
    </div>
  ),
});

function DocPage() {
  const { Doc, frontmatter } = Route.useLoaderData();

  usePageMeta({
    title: `${frontmatter.title} — unqueue docs`,
    description: frontmatter.description,
  });

  return (
    <article className="max-w-3xl">
      <header className="mb-10 border-b border-border/60 pb-8">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
          Documentation
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {frontmatter.title}
        </h1>
        {frontmatter.description && (
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {frontmatter.description}
          </p>
        )}
      </header>
      <div className="prose">
        <Doc />
      </div>
    </article>
  );
}
