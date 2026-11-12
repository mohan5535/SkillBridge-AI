# SkillBridge AI — Deployment & Production Operations Guide

**Project:** SkillBridge AI — Universal Career Gap Tracker & Learning Engine  
**Release:** MVP 1.0.0  
**Stack:** Node.js 24 ESM • Express 4.21 • PostgreSQL 18.6 (Docker compatible w/ 17+) • Strict CSP SPA Portal

---

## 1. Quickstart — Running Locally

### Prerequisites
- Node.js >= 20.0.0
- PostgreSQL 18 (or 17) running on `127.0.0.1:5432` with database `skillbridge_db`

### Setup & Start
```bash
cp backend/.env.example backend/.env
# Fill PGPASSWORD, JWT_SECRET, CSRF_SECRET, COOKIE_SECRET in backend/.env
npm --prefix backend install
npm --prefix backend start
```

### Portal URLs
- **Interactive Web Portal:** `http://localhost:5000/portal`
- **Candidate View:** `http://localhost:5000/candidate`
- **Counselor Portal:** `http://localhost:5000/counselor`
- **API Health Check:** `http://localhost:5000/api/health`

---

## 2. Production Docker & Hosting Deployment

### Required Environment Variables (`NODE_ENV=production`)
Production startup validates these variables and **fails closed** if any signing secret is missing, under 32 characters, or uses a dev/placeholder string:

| Variable | Required | Production Guidance |
|---|---|---|
| `NODE_ENV` | Yes | Must be `production` (enables `Secure` cookies & strict error masking) |
| `PORT` | Yes | HTTP listener port (default `5000`) |
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` | Yes | Target PostgreSQL instance connection parameters |
| `PGPASSWORD` | Yes | Strong database password (never commit or embed fallback values) |
| `PGSSL` | Managed DB | Set `true` (or `PGSSLMODE=require`) for TLS-enforced cloud PostgreSQL |
| `CORS_ORIGIN` | Yes | Exact public origin(s), e.g. `https://app.skillbridge.example` (comma-separated supported) |
| `JWT_SECRET`, `CSRF_SECRET`, `COOKIE_SECRET` | Yes | Distinct 48+ byte CSPRNG secrets (`crypto.randomBytes(48).toString('hex')`) |
| `ALLOW_DEMO_SESSION` | Recommended `false` | Defaults to `false` in production; blocks `/api/auth/demo-session` impersonation |

Generate fresh cryptographic secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Running with Docker Compose
Export `PGPASSWORD`, `CORS_ORIGIN`, `JWT_SECRET`, `CSRF_SECRET`, and `COOKIE_SECRET` (or provide a Compose `.env` file outside Git), then run:
```bash
docker compose up --build -d
```
Stop containers safely (`SIGTERM` triggers graceful HTTP close + PostgreSQL pool drain):
```bash
docker compose down
```

### Reverse Proxy / HTTPS Requirement
Because `sb_auth_token` and `sb_csrf_token` set `secure: true` when `NODE_ENV=production`, terminate TLS at your reverse proxy/load balancer (`Nginx`, `Caddy`, AWS ALB, Render, Railway) forwarding `X-Forwarded-Proto: https` (supported via `app.set('trust proxy', 1)`).

---

## 3. PostgreSQL Backup & Recovery Procedures

### Logical Backup (`pg_dump` Custom Format)
Store backups strictly outside Git repositories (`*.dump` is excluded in `.gitignore`):
```bash
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -Fc -f "skillbridge_$(date +%Y%m%d_%H%M%S).dump" "$PGDATABASE"
```

### Verification & Point-in-Time Restore
Verify archive contents before restore:
```bash
pg_restore --list skillbridge_YYYYMMDD_HHMMSS.dump
```
Restore cleanly into a freshly initialized target database:
```bash
pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" --clean --if-exists skillbridge_YYYYMMDD_HHMMSS.dump
```

---

## 4. Automated Test Suite

```bash
# Full unit + PostgreSQL integration suite
npm --prefix backend run test

# Unit security & domain tests (no DB socket required)
npm --prefix backend run test:unit

# Zero-mutation & database integrity audit (22 tables, 157 baseline records)
npm --prefix backend run test:audit
```
