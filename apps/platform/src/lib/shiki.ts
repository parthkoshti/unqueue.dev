import json from "@shikijs/langs/json";
import javascript from "@shikijs/langs/javascript";
import log from "@shikijs/langs/log";
import githubDark from "@shikijs/themes/github-dark";
import githubLight from "@shikijs/themes/github-light";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

export type CodeLanguage = "json" | "log" | "javascript";

const highlighterPromise = createHighlighterCore({
  themes: [githubLight, githubDark],
  langs: [json, log, javascript],
  engine: createJavaScriptRegexEngine(),
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
