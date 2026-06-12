export interface BlogFrontmatter {
  title: string;
  description: string;
  date: string;
  author: string;
  tags?: string[];
}

export interface BlogPost extends BlogFrontmatter {
  slug: string;
}

const modules = import.meta.glob<{ frontmatter: BlogFrontmatter }>(
  "../content/blog/*.mdx",
  { eager: true },
);

export function getAllPosts(): BlogPost[] {
  return Object.entries(modules)
    .map(([filePath, mod]) => {
      const slug = filePath
        .replace("../content/blog/", "")
        .replace(".mdx", "");
      return { ...mod.frontmatter, slug };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPost(slug: string): BlogFrontmatter | undefined {
  const key = `../content/blog/${slug}.mdx`;
  return modules[key]?.frontmatter;
}

const lazyModules = import.meta.glob<{
  default: React.ComponentType;
  frontmatter: BlogFrontmatter;
}>("../content/blog/*.mdx");

export async function loadPostComponent(slug: string) {
  const key = `../content/blog/${slug}.mdx`;
  const loader = lazyModules[key];
  if (!loader) return null;
  return loader();
}
