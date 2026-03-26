import * as core from "@actions/core";
import type { ActionContext } from "./types";

export function setOutputs(context: ActionContext): void {
  core.setOutput("l1_rpc_url", context.l1RpcUrl);
  core.setOutput("l2_rpc_url", context.l2RpcUrl);
  core.setOutput("resolved_version", context.resolvedRelease?.tag ?? "");
  core.setOutput("anvil_log_path", ".zks/anvil.log");
  core.setOutput("zksync_log_path", ".zks/zksyncos.log");
}
