export interface DocFrontmatter {
  title: string;
  description: string;
}

export interface DocPage extends DocFrontmatter {
  slug: string;
}

export interface DocNavItem {
  slug: string;
  title: string;
}

export interface DocNavSection {
  label: string;
  items: DocNavItem[];
}

export const DOC_NAV: DocNavSection[] = [
  {
    label: "Getting Started",
    items: [
      { slug: "introduction", title: "Introduction" },
    ],
  },
  {
    label: "Self-Hosting",
    items: [
      { slug: "self-hosting", title: "Docker Compose Setup" },
      { slug: "configuration", title: "Configuration" },
    ],
  },
];

const lazyModules = import.meta.glob<{
  default: React.ComponentType;
  frontmatter: DocFrontmatter;
}>("../content/docs/*.mdx");

export async function loadDocComponent(slug: string) {
  const key = `../content/docs/${slug}.mdx`;
  const loader = lazyModules[key];
  if (!loader) return null;
  return loader();
}

const eagerModules = import.meta.glob<{ frontmatter: DocFrontmatter }>(
  "../content/docs/*.mdx",
  { eager: true },
);

export function getDoc(slug: string): DocFrontmatter | undefined {
  const key = `../content/docs/${slug}.mdx`;
  return eagerModules[key]?.frontmatter;
}
