import type { Component } from "solid-js";

const JsonView: Component<{ data: unknown }> = (props) => {
  return (
    <pre class="overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-300 font-mono max-h-96 border border-gray-800">
      {JSON.stringify(props.data, null, 2)}
    </pre>
  );
};

export default JsonView;
