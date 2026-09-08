#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec bash "${script_dir}/sites-env.sh" -- bash "$0" "$@"
fi

cd "${SITES_PROJECT_ROOT}"
echo "[sites] installing locked dependencies"
npm ci
echo "[sites] dependency install complete"
