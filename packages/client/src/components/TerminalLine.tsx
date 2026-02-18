import type { Component } from "solid-js";
import type { TerminalLine as TLine } from "../types";
import { getLineColorClass } from "../lib/terminal-colors";

interface Props {
  line: TLine;
}

const TerminalLine: Component<Props> = (props) => {
  return (
    <div
      class={`whitespace-pre-wrap break-words leading-relaxed ${getLineColorClass(props.line.type)}`}
    >
      {props.line.content}
    </div>
  );
};

export default TerminalLine;
