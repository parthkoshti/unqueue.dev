import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { loadPostComponent } from "@/lib/blog";
import { usePageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/blog/$slug")({
  loader: async () => { throw notFound(); },
  component: BlogPostPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-40 text-center sm:px-6">
      <p className="mb-3 font-mono text-xs text-muted-foreground">404</p>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
        Post not found
      </h1>
      <p className="mb-8 text-muted-foreground">
        This post doesn't exist or may have moved.
      </p>
      <Link to="/blog" className="text-sm text-primary hover:underline underline-offset-4">
        ← All posts
      </Link>
    </div>
  ),
});

function BlogPostPage() {
  const { Post, frontmatter } = Route.useLoaderData();

  usePageMeta({
    title: `${frontmatter.title} — unqueue`,
    description: frontmatter.description,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6">
      {/* Back */}
      <div className="pt-28 pb-12">
        <Link
          to="/blog"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Writing
        </Link>
      </div>

      {/* Header */}
      <header className="mb-16 border-b border-border/60 pb-10">
        {/* Meta row */}
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <time className="font-mono text-xs text-muted-foreground">
            {formatDate(frontmatter.date)}
          </time>
          {frontmatter.tags && frontmatter.tags.length > 0 && (
            <>
              <span className="text-border" aria-hidden>·</span>
              <span className="font-mono text-xs text-muted-foreground/70">
                {frontmatter.tags.join(" · ")}
              </span>
            </>
          )}
        </div>

        <h1 className="mb-5 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
          {frontmatter.title}
        </h1>

        <p className="text-base leading-relaxed text-muted-foreground">
          {frontmatter.description}
        </p>

        {frontmatter.author && (
          <p className="mt-7 font-mono text-xs text-muted-foreground">
            {frontmatter.author}
          </p>
        )}
      </header>

      {/* Body */}
      <div className="prose pb-24">
        <Post />
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
