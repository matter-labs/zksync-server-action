# ZKsync Server Action (L1 + L2)

Start a local **L1 (Anvil)** and **L2 (zksync_os_server)** directly from official [`matter-labs/zksync-os-server`](https://github.com/matter-labs/zksync-os-server) release assets.

This action is implemented as a **Node 20 TypeScript action** with a committed `dist/` bundle, while preserving the same public inputs and outputs as the earlier composite version.

## Features

- Downloads official binaries + `local-chains.tar.gz`
- Uses protocol-aware local chains from `./local-chains/<protocol_version>`
- Falls back to legacy assets for older tags that do not include `local-chains.tar.gz`
- Supports **single-chain** and **multi-chain** setups
- Boots both **L1 (Anvil)** and one or more **L2 (zksync_os_server)** instances
- Prints inline logs at the end of the action when `anvil_logs: true` and `zksync_logs: true`
- Exports `ETH_RPC` and `ZKSYNC_RPC` (single chain) or `ZKSYNC_RPC_<chain_id>` (multi chain) for your subsequent test steps

## Quick Start

### Requirements

* **Runner:** `ubuntu-latest` (Anvil requires Linux)
* **Foundry:** must be available (to provide `anvil` binary)

Example setup:

```yaml
- name: Setup Foundry
  uses: foundry-rs/foundry-toolchain@v1
  with:
    version: v1.4.1
```

### Minimal usage (single chain, latest stable)

```yaml
- name: Run ZKsync OS
  uses: matter-labs/zksync-server-action@v0.1.0
  with:
    version: latest
    protocol_version: v31.0
```

### Pinned version

```yaml
- name: Run ZKsync OS
  uses: matter-labs/zksync-server-action@v0.1.0
  with:
    version: v0.8.2
    l1_port: 8545
    l2_port: 3050
```

### Include pre-releases

```yaml
- name: Run ZKsync OS
  uses: matter-labs/zksync-server-action@v0.1.0
  with:
    version: latest
    include_prerelease: true
```

### Multi-chain setup

Starts one `zksync-os-server` instance per chain listed in `l2_ports`, all sharing a single Anvil L1.

```yaml
- name: Run ZKsync OS (multi chain)
  uses: matter-labs/zksync-server-action@v0.1.0
  with:
    version: latest
    protocol_version: v31.0
    setup: multi_chain
    # l2_ports defaults to:
    #   6565: 3050
    #   6566: 3051
```

To start only a subset of chains, or use custom ports, override `l2_ports`:

```yaml
- name: Run ZKsync OS (multi chain, custom)
  uses: matter-labs/zksync-server-action@v0.1.0
  with:
    setup: multi_chain
    l2_ports: |
      6565: 3050
```

## Inputs

| Name                 | Default                        | Description                                                                 |
| -------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `version`            | `latest`                       | Release tag (e.g. `v0.8.2`) or `latest`                                    |
| `include_prerelease` | `false`                        | If `true` and `version=latest`, allows pre-releases                         |
| `l1_port`            | `8545`                         | L1 RPC port (Anvil)                                                         |
| `l2_port`            | `3050`                         | L2 RPC port — **single_chain only**                                         |
| `linux_arch`         | `x86_64`                       | Architecture for binary (`x86_64` or `aarch64`)                             |
| `protocol_version`   | `v31.0`                        | Protocol folder under `local-chains` (e.g. `v30.2`, `v31.0`)               |
| `setup`              | `single_chain`                 | Setup type: `single_chain` or `multi_chain`                                 |
| `l2_ports`           | `6565: 3050` / `6566: 3051`    | Chain ID → port map — **multi_chain only** (one entry per line)             |
| `set_env`            | `true`                         | Export RPC URLs to `GITHUB_ENV`                                             |
| `boot_grace_seconds` | `3`                            | Seconds to wait after starting each server                                  |
| `anvil_logs`         | `false`                        | Print Anvil log (`.zks/anvil.log`) at the end                               |
| `zksync_logs`        | `false`                        | Print zksync-os-server log at the end — **single_chain only**               |
| `config_yaml`        | *(none)*                       | Full YAML config for zksync-os-server — **single_chain only**               |
| `operator_commit_sk` | *(dev default)*                | Override `l1_sender.operator_commit_sk` — **single_chain only**             |
| `operator_prove_sk`  | *(dev default)*                | Override `l1_sender.operator_prove_sk` — **single_chain only**              |
| `operator_execute_sk`| *(dev default)*                | Override `l1_sender.operator_execute_sk` — **single_chain only**            |

## Outputs

| Name               | Description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `l1_rpc_url`       | Local L1 RPC URL                                                            |
| `l2_rpc_url`       | Local L2 RPC URL (single_chain; maps to first chain's port in multi_chain)  |
| `resolved_version` | Actual tag resolved (e.g. `v0.8.2`)                                         |
| `anvil_log_path`   | Path to Anvil log (`.zks/anvil.log`)                                        |
| `zksync_log_path`  | Path to zksync-os-server log (`.zks/zksyncos.log`) — **single_chain only** |

## Configuration (single_chain)

From `zksync-os-server` `v0.15.0+`, this action uses `local-chains.tar.gz` and:

- Decompresses `./local-chains/<protocol_version>/l1-state.json.gz` (or `l1.state.json.gz`) for Anvil
- Starts server with `--config ./local-chains/<protocol_version>/default/config.yaml` (unless overridden)

For tags before `v0.15.0`, it automatically falls back to legacy release assets (`zkos-l1-state.json`, `genesis.json`).

You may configure the server in one of two ways:

### Option 1: Provide a full YAML config (recommended)

| Name          | Default  | Description                                                                            |
| ------------- | -------- | -------------------------------------------------------------------------------------- |
| `config_yaml` | *(none)* | Full YAML configuration passed verbatim to `zksync-os-server`. Overrides all defaults. |

Example:

```yaml
- uses: matter-labs/zksync-server-action@vX
  with:
    config_yaml: |
      genesis:
        chain_id: 6565
      l1_sender:
        operator_commit_sk: ${{ secrets.OPERATOR_COMMIT_SK }}
        operator_prove_sk:  ${{ secrets.OPERATOR_PROVE_SK }}
        operator_execute_sk:${{ secrets.OPERATOR_EXECUTE_SK }}
```

---

### Option 2: Override individual operator keys

If `config_yaml` is **not** provided, the action uses the protocol default config from `local-chains` and allows selective overrides of the L1 sender operator keys:

| Name                  | Default         | Description                              |
| --------------------- | --------------- | ---------------------------------------- |
| `operator_commit_sk`  | *(dev default)* | Override `l1_sender.operator_commit_sk`  |
| `operator_prove_sk`   | *(dev default)* | Override `l1_sender.operator_prove_sk`   |
| `operator_execute_sk` | *(dev default)* | Override `l1_sender.operator_execute_sk` |

These are typically passed from GitHub Secrets:

```yaml
- uses: matter-labs/zksync-server-action@vX
  with:
    operator_commit_sk: ${{ secrets.OPERATOR_COMMIT_SK }}
    operator_prove_sk:  ${{ secrets.OPERATOR_PROVE_SK }}
    operator_execute_sk:${{ secrets.OPERATOR_EXECUTE_SK }}
```

---

### Example configuration file

An example `config.yaml` is included in this repository **for reference only**.

> ⚠️ This file is **not loaded automatically** by the action.

To use it, copy its contents and pass it via the `config_yaml` input.

---

## Environment Variables

If `set_env` is `true` (default), RPC URLs are automatically exported to `GITHUB_ENV`.

**Single chain:**

```bash
ETH_RPC=http://127.0.0.1:8545
ZKSYNC_RPC=http://127.0.0.1:3050
```

**Multi chain** (one variable per chain):

```bash
ETH_RPC=http://127.0.0.1:8545
ZKSYNC_RPC_6565=http://127.0.0.1:3050
ZKSYNC_RPC_6566=http://127.0.0.1:3051
```

## Troubleshooting

* **Ports busy:** Adjust `l1_port` / `l2_port` (single chain) or the ports in `l2_ports` (multi chain) if the runner already uses those ports.
* **Logs:**
  * `.zks/anvil.log` — Anvil output
  * `.zks/zksyncos.log` — zksync-os-server output (single chain)
  * `.zks/zksyncos_<chain_id>.log` — per-chain output (multi chain)

Upload them on failure for debugging:

```yaml
- name: Upload logs
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: zks-logs
    path: .zks/*.log
```

You have two ways to view logs:

* Inline: set `anvil_logs: true` / `zksync_logs: true` and the action will print them in the job output.
* Manual: skip the inputs and use the exposed output paths to `cat` (or upload) the files yourself.

Example with both inline printing and manual access to the paths:

```yaml
- name: Run ZKsync OS
  id: zks
  uses: matter-labs/zksync-server-action@v0.1.0
  with:
    version: latest
    anvil_logs: true
    zksync_logs: true

- name: Print Anvil log
  if: always()
  run: cat ${{ steps.zks.outputs.anvil_log_path }}

- name: Print server log
  if: always()
  run: cat ${{ steps.zks.outputs.zksync_log_path }}
```

### Support

If you encounter issues not covered in the troubleshooting section, feel free to [open an issue](https://github.com/matter-labs/zksync-server-action/issues) in the repository.

## Development

For local maintenance of the action bundle:

```bash
npm ci
npm run typecheck
npm run build
```

The committed `dist/index.js` should stay in sync with `src/`.

## Contributing 🤝

Feel free to open issues or PRs if you find any problems or have suggestions for improvements. Your contributions are more than welcome!

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Happy Testing! 🚀**
