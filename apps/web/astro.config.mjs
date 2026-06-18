import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import starlight from "@astrojs/starlight";
import sitemap from "@astrojs/sitemap";
import starlightThemeNova from "starlight-theme-nova";
import tailwindcss from "@tailwindcss/vite";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: "static",
  site: "https://unqueue.dev",
  integrations: [
    react(),
    starlight({
      title: "unqueue",
      description: "Documentation for unqueue — real-time BullMQ monitoring.",
      disable404Route: true,
      logo: {
        src: "./src/assets/logo.svg",
        alt: "unqueue logo",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/parthkoshti/unqueue.dev",
        },
      ],
      plugins: [
        starlightThemeNova({
          nav: [
            { label: "Home", href: "/" },
            { label: "Waitlist", href: "/#waitlist" },
            { label: "Blog", href: "/blog" },
          ],
        }),
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: ["docs/introduction", "docs/connecting-redis"],
        },
        {
          label: "Self-Hosting",
          items: ["docs/self-hosting", "docs/configuration"],
        },
      ],
      customCss: ["./src/styles/global.css"],
      components: {
        ThemeProvider: "./src/components/starlight/ThemeProvider.astro",
      },
      editLink: {
        baseUrl:
          "https://github.com/parthkoshti/unqueue.dev/edit/main/apps/web/src/content/docs/docs/",
      },
    }),
    mdx(),
    sitemap(),
  ],
  markdown: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
