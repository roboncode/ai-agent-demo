import { Show, type Component } from "solid-js";

interface Props {
  system?: string;
  prompt?: string;
  agent?: string;
  format?: string;
  tools?: string[];
}

const RequestInfo: Component<Props> = (props) => {
  return (
    <div class="rounded border border-gray-800 bg-gray-900/50 p-3 space-y-2 text-sm">
      <Show when={props.agent}>
        <div>
          <span class="text-gray-500">Agent:</span>{" "}
          <span class="text-blue-400 font-medium">{props.agent}</span>
          <Show when={props.format}>
            <span class="text-gray-600 ml-2">({props.format})</span>
          </Show>
        </div>
      </Show>
      <Show when={props.tools?.length}>
        <div>
          <span class="text-gray-500">Tools:</span>{" "}
          <span class="text-purple-400">{props.tools!.join(", ")}</span>
        </div>
      </Show>
      <Show when={props.system}>
        <div>
          <span class="text-gray-500 block mb-1">System Prompt:</span>
          <div class="rounded bg-gray-950 px-3 py-2 text-xs text-gray-400 font-mono whitespace-pre-wrap max-h-32 overflow-auto border border-gray-800">
            {props.system}
          </div>
        </div>
      </Show>
      <Show when={props.prompt}>
        <div>
          <span class="text-gray-500 block mb-1">User Prompt:</span>
          <div class="rounded bg-blue-950/50 px-3 py-2 text-xs text-blue-200 font-mono whitespace-pre-wrap border border-blue-900">
            {props.prompt}
          </div>
        </div>
      </Show>
    </div>
  );
};

export default RequestInfo;
