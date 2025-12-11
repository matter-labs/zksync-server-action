# `CONTRIBUTING.md`

## Contributing to ZKsync Server Action

Thank you for your interest in contributing to the ZKsync Server Action! We welcome bug reports, feature requests, and pull requests to help make ZKsync L1/L2 testing easier for everyone.

## Table of Contents

- [How to Contribute](#how-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Development Workflow](#development-workflow)
  - [Understanding the action](#understanding-the-action)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)

---

## How to Contribute

1. **Found a bug?** Open a GitHub Issue.
2. **Have a feature request?** Open a GitHub Issue to discuss it first.
3. **Ready to write code?** Fork the repo, create a branch, and open a Pull Request.

## Reporting Bugs

This action wraps the upstream `matter-labs/zksync-os-server`.

- If the **Action fails to start** (e.g., download errors, port conflicts, script crashes), please report it here.
- If the **L2 node behaves unexpectedly** (e.g., transaction logic errors), checking the [zksync-os-server issues](https://github.com/matter-labs/zksync-os-server/issues) might be more appropriate.

When opening an issue, please include:

- The version of the action you are using.
- The `inputs` configuration you provided.
- Relevant logs (you can enable logs by setting `anvil_logs: true` and `zksync_logs: true`).

## Development Workflow

### Understanding the Architecture

This is a **Composite Action**. This means:
1.  There is no build step (no Webpack/NCC).
2.  The source of truth is `action.yml`.
3.  Logic is written in Bash and embedded JavaScript (`actions/github-script`).

**Key components:**
* **Version Resolution:** Uses GitHub API to find the correct `zksync-os-server` release tag.
* **Asset Download:** Fetches the binary, genesis file, and L1 state.
* **Process Management:** Runs Anvil and ZKsync OS in the background using `nohup`/`setsid`.

### Testing Changes

Since this is a GitHub Action, the most reliable way to test your changes is by running them in a GitHub workflow.

1. **Fork the repository.**
2. Create a new branch for your feature.
3. Edit `action.yml`.
4. Push your changes to your fork.

## Pull Request Process

1. Ensure you have tested your changes using your branched workflow.
2. Update the `README.md` if you are adding new `inputs` or `outputs`.
3. Open a Pull Request against the `main` branch.
4. Describe what your changes do and link to any relevant issues.

## Coding Standards

### action.yml

- **Indentation:** Use 2 spaces.
- **Shell:** Always use `shell: bash`.
- **Error Handling:** Keep `set -euo pipefail` at the top of run blocks to fail fast on errors.

### Versioning

- This project follows [Semantic Versioning](https://semver.org/).
- Do not bump the version number in your PR; maintainers will handle tagging releases.
