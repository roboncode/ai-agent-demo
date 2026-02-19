import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

let instance: HighlighterCore | null = null;
let loading: Promise<HighlighterCore> | null = null;

export async function getHighlighter(): Promise<HighlighterCore> {
  if (instance) return instance;
  if (loading) return loading;

  loading = createHighlighterCore({
    themes: [import("@shikijs/themes/tokyo-night")],
    langs: [
      import("@shikijs/langs/typescript"),
      import("@shikijs/langs/json"),
      import("@shikijs/langs/shellscript"),
    ],
    engine: createJavaScriptRegexEngine(),
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
