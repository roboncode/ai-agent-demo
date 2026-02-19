import { Show } from "solid-js";
import type { Component } from "solid-js";
import type { TerminalLine as TLine } from "../types";
import { getLineColorClass } from "../lib/terminal-colors";
import { MarkdownText } from "../lib/markdown";

interface Props {
  line: TLine;
}

const TerminalLine: Component<Props> = (props) => {
  return (
    <div
      class={`break-words leading-relaxed ${getLineColorClass(props.line.type)}`}
    >
      <Show
        when={props.line.type === "text"}
        fallback={
          <div class="whitespace-pre-wrap">{props.line.content}</div>
        }
      >
        <MarkdownText content={props.line.content} />
      </Show>
    </div>
  );
};

export default TerminalLine;
