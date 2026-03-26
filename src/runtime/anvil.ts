import * as core from "@actions/core";
import * as io from "@actions/io";
import { createReadStream, createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { ActionError } from "../errors";
import { tailLogFile } from "../logger";
import { isProcessAlive, runCommand, sleep, spawnDetached } from "./process";
import type { ActionContext, ActionInputs } from "../types";

async function unzipStateFile(archivePath: string): Promise<string> {
  const outputPath = archivePath.replace(/\.gz$/, "");
  await pipeline(createReadStream(archivePath), createGunzip(), createWriteStream(outputPath));
  return outputPath;
}

async function resolveStateFile(inputs: ActionInputs, context: ActionContext): Promise<string> {
  const protocolDir = path.join(context.zksDir, "local-chains", inputs.protocolVersion);
  const protocolDirStat = await fs.stat(protocolDir).catch(() => undefined);

  if (protocolDirStat?.isDirectory()) {
    let archivePath = path.join(protocolDir, "l1-state.json.gz");
    const archiveStat = await fs.stat(archivePath).catch(() => undefined);
    if (!archiveStat?.isFile()) {
      const altArchivePath = path.join(protocolDir, "l1.state.json.gz");
      const altArchiveStat = await fs.stat(altArchivePath).catch(() => undefined);
      if (!altArchiveStat?.isFile()) {
        throw new ActionError(
          `Missing L1 state archive. Expected one of: ${archivePath}, ${altArchivePath}`,
        );
      }
      archivePath = altArchivePath;
    }

    return unzipStateFile(archivePath);
  }

  const fallbackState = path.join(context.zksDir, "zkos-l1-state.json");
  const fallbackStat = await fs.stat(fallbackState).catch(() => undefined);
  if (!fallbackStat?.isFile()) {
    throw new ActionError(
      `Missing L1 state file. Expected either protocol state under local-chains or ${fallbackState}`,
    );
  }

  return fallbackState;
}

export async function startAnvil(
  inputs: ActionInputs,
  context: ActionContext,
): Promise<number> {
  const anvilPath = await io.which("anvil", false);
  if (!anvilPath) {
    throw new ActionError(
      "Anvil binary was not found in PATH.\nInstall Foundry before using this action (e.g. foundry-rs/foundry-toolchain@v1).",
    );
  }

  core.info(`Using anvil: ${anvilPath}`);
  await runCommand(anvilPath, ["--version"], { allowNonZeroExit: true });

  const statePath = await resolveStateFile(inputs, context);
  const stateAbsPath = path.resolve(statePath);
  core.info(`Starting anvil with --load-state ${stateAbsPath}`);

  const pid = await spawnDetached(anvilPath, ["--load-state", stateAbsPath, "--port", String(inputs.l1Port)], {
    cwd: context.zksDir,
    env: process.env,
    logPath: context.anvilLogPath,
    pidFile: path.join(context.zksDir, "anvil.pid"),
  });

  await sleep(inputs.bootGraceSeconds * 1000);

  if (!isProcessAlive(pid)) {
    await tailLogFile("anvil exited early", context.anvilLogPath);
    throw new ActionError(`Anvil exited early (pid ${pid}).`);
  }

  return pid;
}
