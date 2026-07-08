#!/usr/bin/env bash
#
# One-time setup for the FMCG Ordering System on macOS.
# Place this file in your project root (~/Downloads/om) next to the
# `backend/` and `frontend/` folders, then run:  ./setup.sh
#
# Safe to re-run: it skips work that's already done.

set -euo pipefail

# Resolve the directory this script lives in, so it works from anywhere.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# --- pretty output helpers ---
bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok()   { printf "\033[32m✓\033[0m %s\n" "$1"; }
info() { printf "\033[34m→\033[0m %s\n" "$1"; }
warn() { printf "\033[33m!\033[0m %s\n" "$1"; }
die()  { printf "\033[31m✗ %s\033[0m\n" "$1" >&2; exit 1; }

[ -d "$BACKEND" ]  || die "backend/ not found next to this script. Put setup.sh in your project root (~/Downloads/om)."
[ -d "$FRONTEND" ] || die "frontend/ not found next to this script."

# --- pick a Python 3.12 (fallbacks to python3) ---
PYTHON="$(command -v python3.12 || command -v python3 || true)"
[ -n "$PYTHON" ] || die "No python3 found. Install with: brew install python@3.12"

bold "FMCG Ordering — one-time setup"
info "Project root: $ROOT"
info "Using Python: $($PYTHON --version)"

# ---------------------------------------------------------------------------
# 1. Database: role + database (idempotent)
# ---------------------------------------------------------------------------
bold "1/4  Database"
if ! command -v psql >/dev/null 2>&1; then
  warn "psql not found. Install/start Postgres first:"
  warn "    brew install postgresql@16 && brew services start postgresql@16"
  die  "Then re-run ./setup.sh"
fi

# Is a server reachable?
if ! psql postgres -c '\q' >/dev/null 2>&1; then
  warn "Can't connect to Postgres. Trying to start it…"
  brew services start postgresql@16 >/dev/null 2>&1 || true
  sleep 2
fi
psql postgres -c '\q' >/dev/null 2>&1 || die "Postgres isn't running. Start it with: brew services start postgresql@16"

# Create role fmcg if missing
if psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='fmcg'" | grep -q 1; then
  ok "Role 'fmcg' already exists"
else
  psql postgres -c "CREATE ROLE fmcg WITH LOGIN PASSWORD 'fmcg';" >/dev/null
  ok "Created role 'fmcg'"
fi

# Create database fmcg_db if missing
if psql postgres -tAc "SELECT 1 FROM pg_database WHERE datname='fmcg_db'" | grep -q 1; then
  ok "Database 'fmcg_db' already exists"
else
  psql postgres -c "CREATE DATABASE fmcg_db OWNER fmcg;" >/dev/null
  ok "Created database 'fmcg_db'"
fi

# Ensure pgcrypto is available (the migration also does this, but do it here in
# case the app user lacks CREATE EXTENSION rights).
psql fmcg_db -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" >/dev/null 2>&1 \
  && ok "pgcrypto extension ready" \
  || warn "Couldn't create pgcrypto as your user — the migration will attempt it."

# ---------------------------------------------------------------------------
# 2. Backend: venv, deps, .env
# ---------------------------------------------------------------------------
bold "2/4  Backend"
cd "$BACKEND"

if [ ! -d .venv ]; then
  "$PYTHON" -m venv .venv
  ok "Created virtual environment (.venv)"
else
  ok "Virtual environment already exists"
fi
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --upgrade pip >/dev/null
info "Installing backend dependencies (first run takes a minute)…"
pip install -r requirements.txt >/dev/null
ok "Backend dependencies installed"

if [ ! -f .env ]; then
  cp .env.example .env
  ok "Created backend/.env from example"
else
  ok "backend/.env already exists (leaving it as-is)"
fi

# Fix the Docker-only host: db -> localhost (only if still 'db')
if grep -q "@db:5432" .env; then
  # macOS sed needs the '' after -i
  sed -i '' 's/@db:5432/@localhost:5432/' .env
  ok "Set DATABASE_URL host to localhost"
fi

# Set a real JWT secret if it's still the placeholder
if grep -qE "JWT_SECRET_KEY=(replace-with-a-long-random-value|CHANGE_ME_IN_ENV)?$" .env; then
  SECRET="$(python -c 'import secrets; print(secrets.token_hex(32))')"
  sed -i '' "s/^JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$SECRET/" .env
  ok "Generated a secure JWT_SECRET_KEY"
else
  ok "JWT_SECRET_KEY already set"
fi

# ---------------------------------------------------------------------------
# 3. Migrations + seed
# ---------------------------------------------------------------------------
bold "3/4  Migrations + seed"
alembic upgrade head >/dev/null
ok "Database schema migrated"
python -m scripts.seed_initial_data | sed 's/^/    /'
ok "Seed complete (admin / ChangeMe123!)"

# ---------------------------------------------------------------------------
# 4. Frontend deps
# ---------------------------------------------------------------------------
bold "4/4  Frontend"
cd "$FRONTEND"
if [ ! -f .env ]; then
  cp .env.example .env
  ok "Created frontend/.env (API proxy handles the URL)"
else
  ok "frontend/.env already exists"
fi
info "Installing frontend dependencies…"
npm install --silent >/dev/null 2>&1 || npm install
ok "Frontend dependencies installed"

# ---------------------------------------------------------------------------
bold "Setup complete."
echo ""
echo "Start the app with two terminals:"
echo "    ./start-backend.sh      (terminal 1)"
echo "    ./start-frontend.sh     (terminal 2)"
echo ""
echo "Then open  http://localhost:5173  and log in:"
echo "    username: admin"
echo "    password: ChangeMe123!"
