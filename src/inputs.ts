import * as core from "@actions/core";
import { ActionError } from "./errors";
import type { ActionInputs, LinuxArch, PortMapping, SetupMode } from "./types";

const DEFAULT_L2_PORTS = "6565: 3050\n6566: 3051";

function readInput(name: string, fallback?: string): string {
  const value = core.getInput(name, { trimWhitespace: false });
  if (value !== "") {
    return value;
  }
  return fallback ?? "";
}

function parseBoolean(name: string, value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  throw new ActionError(`Input '${name}' must be 'true' or 'false'. Received: ${value}`);
}

function parseInteger(name: string, value: string): number {
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed)) {
    throw new ActionError(`Input '${name}' must be an integer. Received: ${value}`);
  }
  return parsed;
}

function parseSetup(value: string): SetupMode {
  if (value === "single_chain" || value === "multi_chain") {
    return value;
  }
  throw new ActionError(`Input 'setup' must be 'single_chain' or 'multi_chain'. Received: ${value}`);
}

function parseLinuxArch(value: string): LinuxArch {
  if (value === "x86_64" || value === "aarch64") {
    return value;
  }
  throw new ActionError(`Input 'linux_arch' must be 'x86_64' or 'aarch64'. Received: ${value}`);
}

export function parsePorts(raw: string): PortMapping[] {
  const mappings: PortMapping[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const [chainIdRaw, portRaw, ...rest] = trimmed.split(":");
    if (!chainIdRaw || !portRaw || rest.length > 0) {
      throw new ActionError(
        `Invalid l2_ports entry '${line}'. Expected format '<chain_id>: <port>'`,
      );
    }

    const chainId = chainIdRaw.trim();
    const port = parseInteger(`l2_ports port for chain ${chainId}`, portRaw);
    mappings.push({ chainId, port });
  }

  return mappings;
}

function optionalInput(name: string): string | undefined {
  const value = core.getInput(name, { trimWhitespace: false });
  return value === "" ? undefined : value;
}

export function getInputs(): ActionInputs {
  const version = readInput("version", "latest").trim() || "latest";
  const setup = parseSetup(readInput("setup", "single_chain").trim() || "single_chain");
  const l2PortsRaw = readInput("l2_ports", DEFAULT_L2_PORTS);
  const l2Ports = parsePorts(l2PortsRaw);

  if (setup === "multi_chain" && l2Ports.length === 0) {
    throw new ActionError("No entries found in l2_ports input.");
  }

  return {
    version,
    includePrerelease: parseBoolean(
      "include_prerelease",
      readInput("include_prerelease", "false"),
    ),
    l1Port: parseInteger("l1_port", readInput("l1_port", "8545")),
    l2Port: parseInteger("l2_port", readInput("l2_port", "3050")),
    linuxArch: parseLinuxArch(readInput("linux_arch", "x86_64").trim() || "x86_64"),
    protocolVersion: readInput("protocol_version", "v31.0").trim() || "v31.0",
    setup,
    l2PortsRaw,
    l2Ports,
    setEnv: parseBoolean("set_env", readInput("set_env", "true")),
    bootGraceSeconds: parseInteger(
      "boot_grace_seconds",
      readInput("boot_grace_seconds", "3"),
    ),
    anvilLogs: parseBoolean("anvil_logs", readInput("anvil_logs", "false")),
    zksyncLogs: parseBoolean("zksync_logs", readInput("zksync_logs", "false")),
    configYaml: optionalInput("config_yaml"),
    operatorCommitSk: optionalInput("operator_commit_sk"),
    operatorProveSk: optionalInput("operator_prove_sk"),
    operatorExecuteSk: optionalInput("operator_execute_sk"),
  };
}
