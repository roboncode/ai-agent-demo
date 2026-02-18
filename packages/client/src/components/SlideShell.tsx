import type { Component, JSX } from "solid-js";

interface Props {
  hasDemo: boolean;
  content: JSX.Element;
  terminal?: JSX.Element;
}

const SlideShell: Component<Props> = (props) => {
  return (
    <div class="flex h-full gap-0">
      {/* Content panel */}
      <div
        class={`flex-shrink-0 overflow-y-auto bg-slide ${
          props.hasDemo ? "w-[55%]" : "w-full"
        }`}
      >
        {props.content}
      </div>

      {/* Terminal panel - only shown when slide has a demo */}
      {props.hasDemo && (
        <div class="w-[45%] border-l border-border bg-terminal p-3">
          {props.terminal}
        </div>
      )}
    </div>
  );
};

export default SlideShell;
