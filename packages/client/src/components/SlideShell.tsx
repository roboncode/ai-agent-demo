import type { Component, JSX } from "solid-js";

interface Props {
  hasDemo: boolean;
  content: JSX.Element;
  terminal?: JSX.Element;
}

const SlideShell: Component<Props> = (props) => {
  return (
    <div class="flex h-full">
      {/* Content panel */}
      <div
        class={`slide-panel flex-shrink-0 ${
          props.hasDemo ? "w-[55%]" : "w-full"
        }`}
      >
        {props.content}
      </div>

      {/* Terminal panel — with gradient divider */}
      {props.hasDemo && (
        <div class="panel-divider terminal-panel flex w-[45%] flex-col p-4 pl-5">
          {props.terminal}
        </div>
      )}
    </div>
  );
};

export default SlideShell;
