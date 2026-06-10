import { createHighlighter, type BundledLanguage } from "shiki";

export type CodeLanguage = Extract<BundledLanguage, "json" | "log" | "javascript">;

const highlighterPromise = createHighlighter({
  themes: ["github-light", "github-dark"],
  langs: ["json", "log", "javascript"],
});

export async function highlightCode(code: string, lang: CodeLanguage) {
  const highlighter = await highlighterPromise;
  return highlighter.codeToHtml(code, {
    lang,
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
  });
}

export function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}
