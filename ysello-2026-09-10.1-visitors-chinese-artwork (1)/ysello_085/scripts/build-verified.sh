#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec bash "${script_dir}/sites-env.sh" -- bash "$0" "$@"
fi

cd "${SITES_PROJECT_ROOT}"
echo "[sites] building the Vite application and Worker artifact"
npm run build:web
bash "${script_dir}/validate-artifact.sh"
