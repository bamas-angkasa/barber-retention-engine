# Barbershop Queue Hub

Monorepo: Next.js frontend + Go (Echo + GORM + PostgreSQL) backend.

## Structure

```
/
  frontend/    — Next.js 16 app (App Router, TypeScript, Tailwind, shadcn/ui)
  backend/     — Go 1.24 API server (Echo, GORM, PostgreSQL)
  docker-compose.yml
  .env.example
```

## Quick start (local dev)

### 1. Start Postgres + Go backend

```bash
cp .env.example .env
docker compose up --build
# Backend runs on http://localhost:8080
# Seed data is created automatically (SEED_ON_START=true)
```

### 2. Start Next.js frontend

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

### 3. Open in browser

| URL | Description |
|-----|-------------|
| `http://localhost:3000/cugo/queue` | Customer queue page |
| `http://localhost:3000/cugo/booking` | Booking wizard |
| `http://localhost:3000/cugo/admin/login` | Admin login (PIN: 1234) |
| `http://localhost:3000/cugo/admin` | Owner dashboard |
| `http://localhost:3000/cugo/display` | TV display board |

## API

All API routes are under `/api/tenants/:tenant/`.

Responses are wrapped in `{ "data": ... }` on success, or `{ "error": { "code": "...", "message": "..." } }` on error.

## Deployment (Railway/Render)

1. **Backend**: Railway service pointing to `backend/` folder, using `Dockerfile`. Add env vars:
   - `DATABASE_URL` (Railway Postgres plugin URL)
   - `JWT_SECRET` (long random string)
   - `SEED_ON_START=false`

2. **Frontend**: Railway/Vercel service pointing to `frontend/` folder. Add env var:
   - `BACKEND_URL=https://your-go-service.railway.app`

3. **Postgres**: Railway Postgres plugin (free tier).

## Admin PIN

Default PIN for seed tenant `cugo` is `1234`. Change it by updating `PinHash` in the database.

## Real-time

Queue updates are broadcast via Server-Sent Events at `GET /api/tenants/:tenant/queue/stream`. The frontend automatically falls back to 10-second polling if SSE fails.
