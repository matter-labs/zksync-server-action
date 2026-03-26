import * as core from "@actions/core";
import * as path from "node:path";
import { exportEnvironment } from "./env/exportEnv";
import { formatError } from "./errors";
import { resolveRelease } from "./github/releases";
import { getInputs } from "./inputs";
import { logFileContents } from "./logger";
import { setOutputs } from "./outputs";
import { resolveConfig } from "./config/resolveConfig";
import { prepareWorkspace, downloadAssets } from "./setup/assets";
import { startAnvil } from "./runtime/anvil";
import { startMultiChainZksync, startSingleChainZksync } from "./runtime/zksync";
import type { ActionContext } from "./types";

async function run(): Promise<void> {
  const inputs = getInputs();
  const workspaceDir = process.cwd();
  const context: ActionContext = {
    workspaceDir,
    zksDir: path.join(workspaceDir, ".zks"),
    l1RpcUrl: `http://127.0.0.1:${inputs.l1Port}`,
    l2RpcUrl:
      inputs.setup === "multi_chain"
        ? `http://127.0.0.1:${inputs.l2Ports[0]?.port ?? inputs.l2Port}`
        : `http://127.0.0.1:${inputs.l2Port}`,
    anvilLogPath: path.join(workspaceDir, ".zks", "anvil.log"),
    zksyncLogPath: path.join(workspaceDir, ".zks", "zksyncos.log"),
  };

  await prepareWorkspace(context);

  const release = await resolveRelease(inputs);
  context.resolvedRelease = release;

  await downloadAssets(inputs, context, release);
  setOutputs(context);

  await startAnvil(inputs, context);

  if (inputs.setup === "single_chain") {
    const resolvedConfig = await resolveConfig(inputs, context);
    context.singleChainConfig = resolvedConfig;
    await startSingleChainZksync(inputs, context, resolvedConfig);
  } else {
    await startMultiChainZksync(inputs, context);
  }

  exportEnvironment(inputs, context);
  setOutputs(context);

  if (inputs.anvilLogs) {
    await logFileContents("anvil log", context.anvilLogPath);
  }
  if (inputs.zksyncLogs && inputs.setup === "single_chain") {
    await logFileContents("zksync-os-server log", context.zksyncLogPath);
  }
}

run().catch((error) => {
  core.setFailed(formatError(error));
});
