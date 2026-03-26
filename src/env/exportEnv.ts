import * as core from "@actions/core";
import type { ActionContext, ActionInputs } from "../types";

export function exportEnvironment(inputs: ActionInputs, context: ActionContext): void {
  if (!inputs.setEnv) {
    return;
  }

  core.exportVariable("ETH_RPC", context.l1RpcUrl);
  if (inputs.setup === "multi_chain") {
    for (const mapping of inputs.l2Ports) {
      core.exportVariable(`ZKSYNC_RPC_${mapping.chainId}`, `http://127.0.0.1:${mapping.port}`);
    }
    return;
  }

  core.exportVariable("ZKSYNC_RPC", context.l2RpcUrl);
}
