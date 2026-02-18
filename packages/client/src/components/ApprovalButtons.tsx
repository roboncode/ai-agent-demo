import type { Component } from "solid-js";

interface Props {
  onApprove: (approved: boolean) => void;
}

const ApprovalButtons: Component<Props> = (props) => {
  return (
    <div class="flex items-center gap-2">
      <span class="font-mono text-xs text-ansi-yellow">
        Awaiting approval:
      </span>
      <button
        onClick={() => props.onApprove(true)}
        class="rounded-md bg-ansi-green/20 px-4 py-1.5 font-mono text-xs font-bold text-ansi-green transition-colors hover:bg-ansi-green/30"
      >
        Approve
      </button>
      <button
        onClick={() => props.onApprove(false)}
        class="rounded-md bg-ansi-red/20 px-4 py-1.5 font-mono text-xs font-bold text-ansi-red transition-colors hover:bg-ansi-red/30"
      >
        Reject
      </button>
    </div>
  );
};

export default ApprovalButtons;
