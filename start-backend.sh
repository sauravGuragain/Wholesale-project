#!/usr/bin/env bash
#
# Start the FastAPI backend (with auto-reload) at http://localhost:8000
# Run ./setup.sh once before using this.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT/backend"

if [ ! -d .venv ]; then
  echo "✗ No virtual environment found. Run ./setup.sh first." >&2
  exit 1
fi
if [ ! -f .env ]; then
  echo "✗ No backend/.env found. Run ./setup.sh first." >&2
  exit 1
fi

# shellcheck disable=SC1091
source .venv/bin/activate

# Make sure the DB is up to date (cheap no-op if already current).
alembic upgrade head >/dev/null 2>&1 || true

echo "→ Backend starting on http://localhost:8000  (docs at /docs)"
exec uvicorn app.main:app --reload --port 8000
