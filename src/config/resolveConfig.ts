import { promises as fs } from "node:fs";
import * as path from "node:path";
import YAML from "yaml";
import { ActionError } from "../errors";
import type { ActionContext, ActionInputs, ResolvedConfig } from "../types";

const DEFAULT_CONFIG = {
  genesis: {
    bridgehub_address: "0xb9247a375fffc63b3383c75024946fa9c3a8601f",
    bytecode_supplier_address: "0x194505775af2efaee14fcefe21ab0b271b61f35d",
    genesis_input_path: "",
    chain_id: 6565,
  },
  l1_sender: {
    operator_commit_sk:
      "0xe9b7176c87e267fdfea1b47f2d340a98692a2d9a32811abc9983d6d46d8745e0",
    operator_prove_sk:
      "0x58a7d54878fe84e74c85e9a333de3abb46203be6d38b6f7a7d72494b5d871f2f",
    operator_execute_sk:
      "0x31f5aa09d23d41bad736cc6e2b4332cf76cdf40c256b5b7cd660a06940ea8629",
  },
  external_price_api_client: {
    source: "Forced",
    forced_prices: {
      "0x0000000000000000000000000000000000000001": 3000,
    },
  },
};

function ensureObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new ActionError(`Expected ${label} to be a YAML mapping.`);
  }
  return value as Record<string, unknown>;
}

function setOverride(
  document: Record<string, unknown>,
  key: "operator_commit_sk" | "operator_prove_sk" | "operator_execute_sk",
  value: string | undefined,
): void {
  if (!value) {
    return;
  }

  const l1Sender = ensureObject(document.l1_sender, "l1_sender");
  if (!(key in l1Sender)) {
    throw new ActionError(`Could not find key '${key}' in resolved config`);
  }

  l1Sender[key] = value;
}

export async function resolveConfig(
  inputs: ActionInputs,
  context: ActionContext,
): Promise<ResolvedConfig> {
  const generatedConfigPath = path.join(context.zksDir, "config.yaml");
  const protocolConfigPath = path.join(
    context.zksDir,
    "local-chains",
    inputs.protocolVersion,
    "default",
    "config.yaml",
  );

  let configPath = generatedConfigPath;
  let source: ResolvedConfig["source"] = "generated";

  if (inputs.configYaml) {
    await fs.writeFile(generatedConfigPath, inputs.configYaml.endsWith("\n") ? inputs.configYaml : `${inputs.configYaml}\n`, "utf8");
    source = "input";
  } else {
    const protocolConfig = await fs.stat(protocolConfigPath).catch(() => undefined);
    if (protocolConfig?.isFile()) {
      configPath = protocolConfigPath;
      source = "protocol";
    } else {
      const fallbackConfig = structuredClone(DEFAULT_CONFIG);
      fallbackConfig.genesis.genesis_input_path = path.join(
        context.zksDir,
        "genesis",
        "genesis.json",
      );
      await fs.writeFile(generatedConfigPath, YAML.stringify(fallbackConfig), "utf8");
    }
  }

  const hasOverrides =
    !!inputs.operatorCommitSk || !!inputs.operatorProveSk || !!inputs.operatorExecuteSk;

  if (!hasOverrides) {
    return { path: configPath, source, generatedOverride: false };
  }

  const rawYaml = await fs.readFile(configPath, "utf8");
  const document = ensureObject(YAML.parse(rawYaml), "config root");

  setOverride(document, "operator_commit_sk", inputs.operatorCommitSk);
  setOverride(document, "operator_prove_sk", inputs.operatorProveSk);
  setOverride(document, "operator_execute_sk", inputs.operatorExecuteSk);

  const overridePath = path.join(context.zksDir, "config.override.yaml");
  await fs.writeFile(overridePath, YAML.stringify(document), "utf8");

  return {
    path: overridePath,
    source,
    generatedOverride: true,
  };
}
