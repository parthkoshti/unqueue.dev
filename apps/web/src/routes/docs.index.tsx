import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/")({
  loader: () => {
    throw redirect({ to: "/docs/$slug", params: { slug: "introduction" } });
  },
  component: () => null,
});
