import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { SpawnOptionsWithoutStdio } from "node:child_process";
import { ActionError } from "../errors";

interface RunCommandOptions extends SpawnOptionsWithoutStdio {
  allowNonZeroExit?: boolean;
}

interface RunCommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

interface SpawnDetachedOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  logPath: string;
  pidFile?: string;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions = {},
): Promise<RunCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      const exitCode = code ?? 0;
      if (exitCode !== 0 && !options.allowNonZeroExit) {
        reject(
          new ActionError(
            `Command failed: ${command} ${args.join(" ")}\n${stdout}${stderr}`.trim(),
          ),
        );
        return;
      }

      resolve({ code: exitCode, stdout, stderr });
    });
  });
}

export async function spawnDetached(
  command: string,
  args: string[],
  options: SpawnDetachedOptions,
): Promise<number> {
  await fs.mkdir(path.dirname(options.logPath), { recursive: true });
  const handle = await fs.open(options.logPath, "a");

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      detached: true,
      stdio: ["ignore", handle.fd, handle.fd],
    });

    child.on("error", async (error) => {
      await handle.close().catch(() => undefined);
      reject(error);
    });
    child.on("spawn", async () => {
      await handle.close();
      const pid = child.pid;
      if (pid === undefined) {
        reject(new ActionError(`Unable to determine PID for ${command}`));
        return;
      }

      if (options.pidFile) {
        await fs.writeFile(options.pidFile, `${pid}\n`, "utf8");
      }

      child.unref();
      resolve(pid);
    });
  });
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
