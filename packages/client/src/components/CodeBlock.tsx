import { type Component, createResource } from "solid-js";
import { getHighlighter, detectLanguage } from "../lib/highlighter";

interface Props {
  code: string;
}

const CodeBlock: Component<Props> = (props) => {
  const [html] = createResource(
    () => props.code,
    async (code) => {
      const highlighter = await getHighlighter();
      const lang = detectLanguage(code);
      return highlighter.codeToHtml(code, {
        lang,
        theme: "tokyo-night",
      });
    },
  );

  return (
    <div class="code-block rounded-xl p-5">
      <div
        class="code-highlight overflow-x-auto font-mono text-[13px] leading-relaxed"
        innerHTML={html() ?? `<pre class="text-primary/90"><code>${escapeHtml(props.code)}</code></pre>`}
      />
    </div>
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default CodeBlock;
