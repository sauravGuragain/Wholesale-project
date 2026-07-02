# FMCG Ordering — Backend (Phase 2 complete)

Modular FastAPI monolith. Each module under `app/modules/<name>/` owns its own
`router / schemas / models / service / repository`; no business logic lives in
routers.

## Modules (all implemented)

| Module | Highlights |
|--------|-----------|
| **auth** | JWT access tokens + rotating, server-side revocable refresh tokens (httpOnly cookie); no public signup |
| **users** | Admin user management, password reset |
| **customers** | Admin provisions login + profile atomically; disable force-logs-out; credit limit, price group |
| **categories / brands** | Self-referencing category tree, auto slugs, delete guards |
| **products** | CRUD, multi-image upload (via storage abstraction), search by name/SKU/barcode, category/brand filters, customer catalog with **per-customer resolved pricing + live stock** |
| **pricing** | One resolver enforcing **customer override > price group > default**; admin endpoints to manage groups + overrides |
| **inventory** | Stock levels, append-only adjustment log, `FOR UPDATE`-locked decrement (no overselling), low-stock report, thresholds |
| **orders** | Full checkout (price resolution, tax, snapshots, atomic stock decrement, payment row), guarded status transitions, cancel restores stock, reorder |
| **payments** | Static-QR proof upload + admin verify/reject; verifying auto-confirms the order. COD supported |
| **offers** | CRUD with validity windows; customers see only active offers |
| **reports** | Dashboard (today's orders, MTD revenue, pending/completed, new customers, low stock, best sellers) + sales/customers/products analytics |
| **settings** | Business info, tax, invoice config, QR + logo upload |
| **Excel** | Bulk price export/import (`openpyxl`) with per-row validation and error reporting |
| **rate limiting** | In-process sliding-window middleware; tighter limit on `/auth` |

24 tables, UUID PKs, timestamps, soft deletes where history matters. All compile
to valid PostgreSQL DDL.

## API surface

48 endpoints under `/api/v1`. Browse them at `/docs` once running.

## Tests

```bash
pytest    # 22 passing
```

Covers pricing precedence (all 3 layers), the checkout transaction
(totals/tax/snapshots), oversell rejection + rollback, cancel-restores-stock,
status-transition guards, category slugs + delete guards, Excel round-trip +
error reporting, payment-verify-confirms-order, offer validity filtering,
dashboard revenue, and full HTTP flows (auth, RBAC, checkout). Runs on
in-memory SQLite (`FOR UPDATE` is a portable no-op there).

## Run with Docker

From the project root:

```bash
cp backend/.env.example backend/.env   # set JWT_SECRET_KEY!
docker compose up --build
# API:  http://localhost:8080/api/v1
# Docs: http://localhost:8080/docs
```

The backend container runs migrations, seeds roles + a bootstrap admin, then serves.
Default admin: `admin / ChangeMe123!` (override via `SEED_ADMIN_*`; change on first login).

## Run without Docker

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export JWT_SECRET_KEY=$(openssl rand -hex 32)
export DATABASE_URL=postgresql+psycopg://fmcg:fmcg@localhost:5432/fmcg_db
alembic upgrade head
python -m scripts.seed_initial_data
uvicorn app.main:app --reload
```

## Next phases

Phase 3 frontend (React/TS/Vite), Phase 4 integration, Phase 5 broader tests,
Phase 6 deploy hardening, Phase 7 docs. Backend items intentionally deferred:
audit-log write decorator (models exist), Redis-backed rate limiting for
multi-replica, and offer application at checkout (offers are currently managed
+ surfaced but not auto-applied to order totals).
