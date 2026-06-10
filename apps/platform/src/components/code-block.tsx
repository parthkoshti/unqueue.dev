import { CheckIcon, CopyIcon } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { cn } from "@unqueue/ui/lib/utils";
import {
  highlightCode,
  stringifyJson,
  type CodeLanguage,
} from "@/lib/shiki";

type CodeBlockProps = {
  code?: string;
  value?: unknown;
  lang?: CodeLanguage;
  variant?: "default" | "destructive";
  className?: string;
  maxHeight?: string;
};

export function CodeBlock({
  code,
  value,
  lang = "log",
  variant = "default",
  className,
  maxHeight = "16rem",
}: CodeBlockProps) {
  const source =
    code ?? (value !== undefined ? stringifyJson(value) : "");
  const resolvedLang = value !== undefined && !code ? "json" : lang;

  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(source).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  useLayoutEffect(() => {
    let cancelled = false;

    void highlightCode(source, resolvedLang).then((next) => {
      if (!cancelled) setHtml(next);
    });

    return () => {
      cancelled = true;
    };
  }, [source, resolvedLang]);

  if (!source) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={copy}
        className="absolute right-1.5 top-1.5 z-10 inline-flex items-center justify-center rounded-sm p-1 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
        aria-label={copied ? "Copied" : "Copy"}
      >
        {copied ? (
          <CheckIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <CopyIcon className="size-3" />
        )}
      </button>
      <div
        className={cn(
          "code-block overflow-auto rounded-md p-2 pr-8 text-[11px]",
          variant === "destructive" ? "bg-destructive/10" : "bg-muted",
        )}
        style={maxHeight === "none" ? undefined : { maxHeight }}
      >
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="font-mono whitespace-pre-wrap break-words">{source}</pre>
        )}
      </div>
    </div>
  );
}
