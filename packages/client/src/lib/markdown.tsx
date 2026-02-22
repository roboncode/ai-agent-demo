import { type JSX, For } from "solid-js";

// ─── Inline parser ─────────────────────────────────────────────────────────
// **bold**   → bright white  (text-heading)
// *italic*   → cyan          (text-ansi-cyan)
// _italic_   → cyan          (text-ansi-cyan)
// `code`     → yellow        (text-ansi-yellow)

function parseInline(text: string): JSX.Element {
  const segments: JSX.Element[] = [];
  // Match: **bold**, *italic*, _italic_, `code`, [text](url), ![alt](url)
  const re = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|`([^`]+)`/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push(<span>{text.slice(cursor, match.index)}</span>);
    }
    if (match[1] !== undefined && match[2] !== undefined) {
      // ![alt](url) → skip images in text flow
    } else if (match[3] !== undefined && match[4] !== undefined) {
      // [text](url) → link
      segments.push(
        <a href={match[4]} target="_blank" rel="noopener noreferrer" class="text-accent underline underline-offset-2 hover:text-accent/80">
          {match[3]}
        </a>
      );
    } else if (match[5] !== undefined) {
      // **bold**
      segments.push(<span class="text-heading">{match[5]}</span>);
    } else if (match[6] !== undefined) {
      // *italic*
      segments.push(<span class="text-ansi-cyan">{match[6]}</span>);
    } else if (match[7] !== undefined) {
      // _italic_
      segments.push(<span class="text-ansi-cyan">{match[7]}</span>);
    } else if (match[8] !== undefined) {
      // `code`
      segments.push(<span class="text-ansi-yellow">{match[8]}</span>);
    }
    cursor = re.lastIndex;
  }

  if (cursor < text.length) {
    segments.push(<span>{text.slice(cursor)}</span>);
  }

  return <>{segments}</>;
}

// ─── Line parser ───────────────────────────────────────────────────────────
// # / ## / ###  → accent teal  (text-accent)
// - / *         → accent dot + inherited text
// 1.            → accent number + inherited text

function parseLine(line: string): JSX.Element {
  // Headings — accent color, all levels
  if (line.startsWith("### ")) {
    return (
      <div class="text-accent">{parseInline(line.slice(4))}</div>
    );
  }
  if (line.startsWith("## ")) {
    return (
      <div class="text-accent">{parseInline(line.slice(3))}</div>
    );
  }
  if (line.startsWith("# ")) {
    return (
      <div class="text-accent">{parseInline(line.slice(2))}</div>
    );
  }

  // Unordered bullet: - item  or  * item
  if (/^[-*] /.test(line)) {
    return (
      <div class="flex items-start gap-2">
        <span class="mt-[0.35em] shrink-0 text-[0.55em] text-accent">●</span>
        <span>{parseInline(line.slice(2))}</span>
      </div>
    );
  }

  // Ordered list: 1. item
  const orderedMatch = line.match(/^(\d+)\. /);
  if (orderedMatch) {
    return (
      <div class="flex items-start gap-2">
        <span class="shrink-0 text-accent">{orderedMatch[1]}.</span>
        <span>{parseInline(line.slice(orderedMatch[0].length))}</span>
      </div>
    );
  }

  // Empty line → small gap
  if (line === "") {
    return <div class="h-[0.4em]" />;
  }

  // Plain text with inline formatting
  return <div>{parseInline(line)}</div>;
}

// ─── Public component ──────────────────────────────────────────────────────

interface Props {
  content: string;
  class?: string;
}

export const MarkdownText = (props: Props) => {
  const lines = () => props.content.split("\n");

  return (
    <div class={props.class}>
      <For each={lines()}>{(line) => parseLine(line)}</For>
    </div>
  );
};
