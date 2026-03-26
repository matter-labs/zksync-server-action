import * as core from "@actions/core";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { ActionError } from "../errors";
import { tailLogFile } from "../logger";
import { isProcessAlive, runCommand, sleep, spawnDetached } from "./process";
import type { ActionContext, ActionInputs, PortMapping, ResolvedConfig } from "../types";

function sortedPorts(mappings: PortMapping[]): PortMapping[] {
  return [...mappings].sort((left, right) => left.chainId.localeCompare(right.chainId));
}

function runtimeEnv(inputs: ActionInputs): NodeJS.ProcessEnv {
  return {
    ...process.env,
    L1_RPC: `http://127.0.0.1:${inputs.l1Port}`,
    RUST_LOG: "info",
    RUST_BACKTRACE: "1",
  };
}

async function foregroundRun(binaryPath: string, configPath: string, env: NodeJS.ProcessEnv): Promise<void> {
  core.startGroup("try foreground run to capture error");
  try {
    const result = await runCommand(binaryPath, ["--config", configPath], {
      env,
      allowNonZeroExit: true,
    });
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
  } finally {
    core.endGroup();
  }
}

export async function startSingleChainZksync(
  inputs: ActionInputs,
  context: ActionContext,
  resolvedConfig: ResolvedConfig,
): Promise<number> {
  const protocolGenesis = path.join(
    context.zksDir,
    "local-chains",
    inputs.protocolVersion,
    "genesis",
    "genesis.json",
  );
  const protocolGenesisStat = await fs.stat(protocolGenesis).catch(() => undefined);
  const genesisPath = protocolGenesisStat?.isFile()
    ? protocolGenesis
    : path.join(context.zksDir, "genesis", "genesis.json");

  const env = {
    ...runtimeEnv(inputs),
    GENESIS: genesisPath,
    PORT: String(inputs.l2Port),
  };

  core.info(`Launching: ${context.downloadedBinaryPath} --config ${resolvedConfig.path}`);

  const pid = await spawnDetached(
    context.downloadedBinaryPath!,
    ["--config", resolvedConfig.path],
    {
      cwd: context.zksDir,
      env,
      logPath: context.zksyncLogPath,
      pidFile: path.join(context.zksDir, "l2.pid"),
    },
  );

  await sleep(inputs.bootGraceSeconds * 1000);

  if (!isProcessAlive(pid)) {
    await tailLogFile("zksync-os-server exited early", context.zksyncLogPath);
    await foregroundRun(context.downloadedBinaryPath!, resolvedConfig.path, env);
    throw new ActionError(`zksync-os-server exited early (pid ${pid}).`);
  }

  core.info(`ZKsync OS launched (pid: ${pid}).`);
  return pid;
}

export async function startMultiChainZksync(
  inputs: ActionInputs,
  context: ActionContext,
): Promise<void> {
  const multiDir = path.join(
    context.zksDir,
    "local-chains",
    inputs.protocolVersion,
    "multi_chain",
  );
  const multiDirStat = await fs.stat(multiDir).catch(() => undefined);
  if (!multiDirStat?.isDirectory()) {
    throw new ActionError(`Multi-chain directory not found: ${multiDir}`);
  }

  const env = runtimeEnv(inputs);

  for (const mapping of sortedPorts(inputs.l2Ports)) {
    const configFile = path.join(multiDir, `chain_${mapping.chainId}.yaml`);
    const configStat = await fs.stat(configFile).catch(() => undefined);
    if (!configStat?.isFile()) {
      throw new ActionError(`Config file not found for chain ${mapping.chainId}: ${configFile}`);
    }

    const logFile = path.join(context.zksDir, `zksyncos_${mapping.chainId}.log`);
    core.info(`Starting chain ${mapping.chainId} with config: ${configFile}`);
    await spawnDetached(context.downloadedBinaryPath!, ["--config", configFile], {
      cwd: context.zksDir,
      env,
      logPath: logFile,
      pidFile: path.join(context.zksDir, `l2_${mapping.chainId}.pid`),
    });
    await sleep(inputs.bootGraceSeconds * 1000);
  }

  for (const mapping of sortedPorts(inputs.l2Ports)) {
    const pidPath = path.join(context.zksDir, `l2_${mapping.chainId}.pid`);
    const pid = Number.parseInt((await fs.readFile(pidPath, "utf8")).trim(), 10);
    if (!Number.isFinite(pid) || !isProcessAlive(pid)) {
      await tailLogFile(
        `chain ${mapping.chainId} exited early`,
        path.join(context.zksDir, `zksyncos_${mapping.chainId}.log`),
      );
      throw new ActionError(`Chain ${mapping.chainId} exited early.`);
    }
    core.info(`Chain ${mapping.chainId} launched (pid: ${pid}).`);
  }
}
