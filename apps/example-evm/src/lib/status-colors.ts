/**
 * Map a status phase to a Tailwind text-color class.
 *
 * Shared across StakingProgress, StakeAndDeployProgress, and UnstakingProgress.
 */
export function getStatusColor(phase: string): string {
  switch (phase) {
    case "complete":
      return "text-success";
    case "error":
      return "text-error";
    case "confirming":
    case "minting":
    case "depositing":
    case "authorizing":
    case "executing":
      return "text-warning";
    default:
      return "text-primary";
  }
}
