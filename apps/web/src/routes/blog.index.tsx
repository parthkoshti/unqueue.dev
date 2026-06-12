import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getAllPosts, type BlogPost } from "@/lib/blog";
import { usePageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/blog/")({
  loader: () => { throw notFound(); },
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const { posts } = Route.useLoaderData();

  usePageMeta({
    title: "Writing — unqueue",
    description: "Queue infrastructure, BullMQ internals, and notes on building unqueue.",
  });

  return (
    <div className="mx-auto max-w-4xl px-4 pb-32 pt-32 sm:px-6">
      {/* Header */}
      <div className="mb-16 border-b border-border pb-12">
        <p className="mb-5 font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
          unqueue / writing
        </p>
        <h1 className="mb-4 font-mono text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          The queue engineering blog.
        </h1>
        <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
          Deep dives into BullMQ, Redis queue internals, production war stories, and how unqueue is built.
        </p>
      </div>

      {/* Post list */}
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <ol className="space-y-0">
          {posts.map((post, i) => (
            <li key={post.slug}>
              <PostRow post={post} index={posts.length - i} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PostRow({ post, index }: { post: BlogPost; index: number }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group grid grid-cols-[3rem_1fr] gap-6 border-b border-border/50 py-10 sm:grid-cols-[4rem_1fr] sm:gap-10"
    >
      {/* Index number */}
      <div className="pt-1">
        <span className="font-mono text-2xl font-bold tabular-nums text-border group-hover:text-primary/30 transition-colors sm:text-3xl">
          {String(index).padStart(2, "0")}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0">
        {/* Tags + date */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <time className="font-mono text-xs text-muted-foreground">
            {formatDate(post.date)}
          </time>
          {post.tags && post.tags.length > 0 && (
            <>
              <span className="text-border/60" aria-hidden>·</span>
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-xs text-muted-foreground/60"
                >
                  {tag}
                </span>
              ))}
            </>
          )}
        </div>

        {/* Title */}
        <h2 className="mb-3 text-xl font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-2xl">
          {post.title}
        </h2>

        {/* Description */}
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {post.description}
        </p>

        {/* Author */}
        {post.author && (
          <p className="mt-4 text-xs text-muted-foreground/50">{post.author}</p>
        )}
      </div>
    </Link>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
