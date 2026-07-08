#!/usr/bin/env bash
#
# Start the Vite dev server at http://localhost:5173
# Run ./setup.sh once before using this.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT/frontend"

if [ ! -d node_modules ]; then
  echo "→ node_modules missing, installing dependencies first…"
  npm install
fi

echo "→ Frontend starting on http://localhost:5173"
exec npm run dev
