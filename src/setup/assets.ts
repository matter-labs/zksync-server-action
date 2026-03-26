import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { ActionError } from "../errors";
import type { ActionContext, ActionInputs, ResolvedRelease } from "../types";

async function retry<T>(attempts: number, action: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }
      core.warning(`Attempt ${attempt} failed: ${String(error)}`);
    }
  }

  throw lastError;
}

async function download(url: string, destination: string): Promise<string> {
  return retry(5, async () => tc.downloadTool(url, destination));
}

export async function prepareWorkspace(context: ActionContext): Promise<void> {
  await fs.mkdir(context.zksDir, { recursive: true });
}

export async function downloadAssets(
  inputs: ActionInputs,
  context: ActionContext,
  release: ResolvedRelease,
): Promise<void> {
  const serverArchive = `zksync-os-server-${release.tag}-${inputs.linuxArch}-unknown-linux-gnu.tar.gz`;
  const serverArchivePath = path.join(context.zksDir, serverArchive);
  const localChainsArchivePath = path.join(context.zksDir, "local-chains.tar.gz");

  core.info(`Downloading ${serverArchive}`);
  await download(`${release.baseUrl}/${serverArchive}`, serverArchivePath);
  await tc.extractTar(serverArchivePath, context.zksDir);

  const binaryPath = path.join(context.zksDir, "zksync-os-server");
  await fs.chmod(binaryPath, 0o755);
  context.downloadedBinaryPath = binaryPath;

  try {
    core.info("Downloading local-chains.tar.gz");
    await download(`${release.baseUrl}/local-chains.tar.gz`, localChainsArchivePath);
  } catch (error) {
    core.info(
      `local-chains.tar.gz not found for ${release.tag}; falling back to legacy state assets.`,
    );
    core.info(`Fallback reason: ${String(error)}`);

    await download(`${release.baseUrl}/zkos-l1-state.json`, path.join(context.zksDir, "zkos-l1-state.json"));
    await fs.mkdir(path.join(context.zksDir, "genesis"), { recursive: true });
    await download(
      `${release.baseUrl}/genesis.json`,
      path.join(context.zksDir, "genesis", "genesis.json"),
    );
    return;
  }

  await tc.extractTar(localChainsArchivePath, context.zksDir);

  const protocolDir = path.join(context.zksDir, "local-chains", inputs.protocolVersion);
  const protocolStat = await fs.stat(protocolDir).catch(() => undefined);
  if (!protocolStat?.isDirectory()) {
    const available = await fs.readdir(path.join(context.zksDir, "local-chains")).catch(() => []);
    throw new ActionError(
      `Protocol directory '${protocolDir}' was not found in local-chains.tar.gz. Available protocol versions: ${available.join(", ")}`,
    );
  }
}
