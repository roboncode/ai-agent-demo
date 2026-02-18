import { createHighlighter, type Highlighter } from "shiki";

let instance: Highlighter | null = null;
let loading: Promise<Highlighter> | null = null;

export async function getHighlighter(): Promise<Highlighter> {
  if (instance) return instance;
  if (loading) return loading;

  loading = createHighlighter({
    themes: ["tokyo-night"],
    langs: ["typescript", "json", "shellscript"],
  });

  instance = await loading;
  return instance;
}

/** Simple language detection from code content */
export function detectLanguage(code: string): "typescript" | "json" | "shellscript" {
  const trimmed = code.trimStart();

  // Lines starting with POST/GET/PUT/DELETE or curl → shell
  if (/^(POST|GET|PUT|DELETE|PATCH|curl)\s/.test(trimmed)) return "shellscript";

  // Starts with { or [ (after stripping // comments) → JSON
  const stripped = trimmed.replace(/^\/\/.*\n/gm, "").trimStart();
  if (/^[{\[]/.test(stripped)) return "json";

  return "typescript";
}
