export type SetupMode = "single_chain" | "multi_chain";
export type LinuxArch = "x86_64" | "aarch64";

export interface PortMapping {
  chainId: string;
  port: number;
}

export interface ActionInputs {
  version: string;
  includePrerelease: boolean;
  l1Port: number;
  l2Port: number;
  linuxArch: LinuxArch;
  protocolVersion: string;
  setup: SetupMode;
  l2PortsRaw: string;
  l2Ports: PortMapping[];
  setEnv: boolean;
  bootGraceSeconds: number;
  anvilLogs: boolean;
  zksyncLogs: boolean;
  configYaml?: string;
  operatorCommitSk?: string;
  operatorProveSk?: string;
  operatorExecuteSk?: string;
}

export interface ResolvedRelease {
  tag: string;
  baseUrl: string;
}

export interface ResolvedConfig {
  path: string;
  source: "input" | "protocol" | "generated";
  generatedOverride: boolean;
}

export interface ActionContext {
  workspaceDir: string;
  zksDir: string;
  l1RpcUrl: string;
  l2RpcUrl: string;
  anvilLogPath: string;
  zksyncLogPath: string;
  resolvedRelease?: ResolvedRelease;
  downloadedBinaryPath?: string;
  singleChainConfig?: ResolvedConfig;
}
