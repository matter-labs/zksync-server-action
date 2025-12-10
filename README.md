# ZKsync Server Action (L1 + L2)

Start a local **L1 (Anvil)** and **L2 (zksync_os_server)** directly from official [`matter-labs/zksync-os-server`](https://github.com/matter-labs/zksync-os-server) release assets.

## Features

- Downloads official binaries + state (`genesis.json`, `zkos-l1-state.json`)
- Boots both **L1 (Anvil)** and **L2 (zksync_os_server)**
- Exports `ETH_RPC` and `ZKSYNC_RPC` for your subsequent test steps

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

### **Minimal usage (latest stable)**

```yaml
- name: Run ZKsync OS
  uses: dutterbutter/zksync-server-action@v0.1.0
  with:
    version: latest
```

### **Pinned version**

```yaml
- name: Run ZKsync OS 
  uses: dutterbutter/zksync-server-action@v0.1.0
  with:
    version: v0.8.2
    l1_port: 8545
    l2_port: 3050
```

### **Include pre-releases**

```yaml
- name: Run ZKsync OS
  uses: dutterbutter/zksync-server-action@v0.1.0
  with:
    version: latest
    include_prerelease: true
```

## Inputs

| Name                 | Default                        | Description                                         |
| -------------------- | ------------------------------ | --------------------------------------------------- |
| `version`            | `latest`                       | Release tag (e.g. `v0.8.2`) or `latest`             |
| `include_prerelease` | `false`                        | If `true` and `version=latest`, allows pre-releases |
| `l1_port`            | `8545`                         | L1 RPC port (Anvil)                                 |
| `l2_port`            | `3050`                         | L2 RPC port (zksync_os_server)                         |
| `linux_arch`         | `x86_64`                       | Architecture for binary (`x86_64` or `aarch64`)     |
| `set_env`            | `true`                         | Export `ETH_RPC` and `ZKSYNC_RPC` to `GITHUB_ENV`   |
| `anvil_logs`         | `false`                        | Print Anvil log (`.zks/anvil.log`) at the end       |
| `zksync_logs`        | `false`                        | Print zksync-os-server log (`.zks/zksyncos.log`) at the end |

## Outputs

| Name               | Description                         |
| ------------------ | ----------------------------------- |
| `l1_rpc_url`       | Local L1 RPC URL                    |
| `l2_rpc_url`       | Local L2 RPC URL                    |
| `resolved_version` | Actual tag resolved (e.g. `v0.8.2`) |
| `anvil_log_path`   | Path to Anvil log (`.zks/anvil.log`) |
| `zksync_log_path`  | Path to zksync-os-server log (`.zks/zksyncos.log`) |

## Environment Variables

If `set_env` is true (default), these are automatically exported:

```bash
ETH_RPC=http://127.0.0.1:8545
ZKSYNC_RPC=http://127.0.0.1:3050
```

## Troubleshooting

* **Ports busy:** Adjust `l1_port` / `l2_port` if the runner already uses 8545 or 3050.
* **Logs:**

  * `.zks/anvil.log` — Anvil output
  * `.zks/zksyncos.log` — zksync-os-server output

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
  uses: dutterbutter/zksync-server-action@v0.1.0
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

If you encounter issues not covered in the troubleshooting section, feel free to [open an issue](https://github.com/dutterbutter/zksync-server-action/issues) in the repository.

## Contributing 🤝

Feel free to open issues or PRs if you find any problems or have suggestions for improvements. Your contributions are more than welcome!

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Happy Testing! 🚀**
