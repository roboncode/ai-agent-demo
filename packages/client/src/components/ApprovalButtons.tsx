import type { Component } from "solid-js";

interface Props {
  onApprove: (approved: boolean) => void;
}

const ApprovalButtons: Component<Props> = (props) => {
  return (
    <div class="flex items-center gap-3">
      <span class="font-mono text-xs text-ansi-yellow">
        Awaiting approval:
      </span>
      <button
        onClick={() => props.onApprove(true)}
        class="rounded-lg bg-ansi-green/15 px-5 py-2 font-mono text-xs font-bold text-ansi-green transition-all hover:bg-ansi-green/25 hover:shadow-[0_0_12px_rgba(74,222,128,0.2)]"
      >
        Approve
      </button>
      <button
        onClick={() => props.onApprove(false)}
        class="rounded-lg bg-ansi-red/15 px-5 py-2 font-mono text-xs font-bold text-ansi-red transition-all hover:bg-ansi-red/25 hover:shadow-[0_0_12px_rgba(248,113,113,0.2)]"
      >
        Reject
      </button>
    </div>
  );
};

export default ApprovalButtons;
