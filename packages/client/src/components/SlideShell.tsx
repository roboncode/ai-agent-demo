import { type Component, type JSX, children } from "solid-js";

interface Props {
  hasDemo: boolean;
  content: JSX.Element;
  terminal?: JSX.Element;
}

const SlideShell: Component<Props> = (props) => {
  // Memoize JSX props so they're resolved once — prevents re-creation
  // when reactive values inside the content/terminal change.
  const resolvedContent = children(() => props.content);
  const resolvedTerminal = children(() => props.terminal);

  return (
    <div class="flex h-full">
      {/* Content panel */}
      <div
        class={`slide-panel flex-shrink-0 ${
          props.hasDemo ? "w-[55%]" : "w-full"
        }`}
      >
        {resolvedContent()}
      </div>

      {/* Terminal panel — with gradient divider */}
      {props.hasDemo && (
        <div class="panel-divider terminal-panel flex w-[45%] flex-col p-4 pl-5">
          {resolvedTerminal()}
        </div>
      )}
    </div>
  );
};

export default SlideShell;
