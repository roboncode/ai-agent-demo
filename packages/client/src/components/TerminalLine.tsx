import { Switch, Match } from "solid-js";
import type { Component } from "solid-js";
import type { TerminalLine as TLine } from "../types";
import { getLineColorClass } from "../lib/terminal-colors";
import { MarkdownText } from "../lib/markdown";
import OGCard from "./OGCard";

interface Props {
  line: TLine;
}

const TerminalLine: Component<Props> = (props) => {
  return (
    <Switch>
      <Match when={props.line.type === "og-card"}>
        <OGCard data={props.line.content} />
      </Match>
      <Match when={props.line.type === "text"}>
        <div class={`break-words leading-relaxed ${getLineColorClass(props.line.type)}`}>
          <MarkdownText content={props.line.content} />
        </div>
      </Match>
      <Match when={true}>
        <div class={`break-words leading-relaxed ${getLineColorClass(props.line.type)}`}>
          <div class="whitespace-pre-wrap">{props.line.content}</div>
        </div>
      </Match>
    </Switch>
  );
};

export default TerminalLine;
