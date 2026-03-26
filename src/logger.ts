import * as core from "@actions/core";
import { promises as fs } from "node:fs";

export async function logFileContents(title: string, filePath: string): Promise<void> {
  core.startGroup(title);
  try {
    const contents = await fs.readFile(filePath, "utf8");
    process.stdout.write(contents);
    if (!contents.endsWith("\n")) {
      process.stdout.write("\n");
    }
  } catch (error) {
    core.warning(`Unable to read log file at ${filePath}: ${String(error)}`);
  } finally {
    core.endGroup();
  }
}

export async function tailLogFile(title: string, filePath: string, lines = 200): Promise<void> {
  core.startGroup(title);
  try {
    const contents = await fs.readFile(filePath, "utf8");
    const sliced = contents.split(/\r?\n/).slice(-lines).join("\n");
    process.stdout.write(`${sliced}\n`);
  } catch (error) {
    core.warning(`Unable to read log file at ${filePath}: ${String(error)}`);
  } finally {
    core.endGroup();
  }
}
