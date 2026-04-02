#!/usr/bin/env bash

set -euo pipefail

if [[ ! -f dist/index.js ]]; then
  echo "Missing dist/index.js. Run 'npm run build' and commit the result."
  exit 1
fi

if ! git ls-files --error-unmatch dist/index.js >/dev/null 2>&1; then
  echo "dist/index.js is not tracked by git. Commit the built bundle."
  exit 1
fi

untracked_dist="$(git ls-files --others --exclude-standard -- dist)"
if [[ -n "${untracked_dist}" ]]; then
  echo "Found untracked files in dist/:"
  printf '%s\n' "${untracked_dist}"
  exit 1
fi

if ! git diff --quiet -- dist; then
  echo "Committed dist/ is out of date. Rebuild and commit the updated bundle."
  git diff --stat -- dist
  exit 1
fi

if ! git diff --quiet --cached -- dist; then
  echo "Staged dist/ changes are present. Commit or unstage them before releasing."
  git diff --cached --stat -- dist
  exit 1
fi
