# Barbershop Queue Hub — Full Documentation

> Version: 2.2 | Stack: Go 1.24 · Echo · GORM · PostgreSQL · Next.js 16 · TypeScript · Tailwind CSS · shadcn/ui

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture (HLA)](#2-high-level-architecture-hla)
3. [Data Models & ERD](#3-data-models--erd)
4. [Flow Diagrams](#4-flow-diagrams)
5. [Backend API Reference](#5-backend-api-reference)
6. [Frontend Routes & Pages](#6-frontend-routes--pages)
7. [Auth System](#7-auth-system)
8. [Tenant Onboarding](#8-tenant-onboarding)
9. [Queue System](#9-queue-system)
10. [Booking System](#10-booking-system)
11. [Real-Time (SSE)](#11-real-time-sse)
12. [Multi-Tenant Design](#12-multi-tenant-design)
13. [Admin Dashboard](#13-admin-dashboard)
14. [Internationalization](#14-internationalization)
15. [Theme System](#15-theme-system)
16. [Local Development](#16-local-development)
17. [Deployment](#17-deployment)
18. [Roadmap](#18-roadmap)

---

## 1. Project Overview

**Barbershop Queue Hub** is a multi-tenant, production-ready queue management and online booking platform for barbershops. Every barbershop (tenant) is identified by a URL slug and has fully isolated data. New tenants self-register in under 2 minutes via the onboarding wizard.

### Key Capabilities

| Capability | Status |
|---|---|
| Walk-in queue with live status | Live |
| Online booking (5-step wizard) | Live |
| Admin dashboard (7 tabs) | Live |
| Admin PIN authentication (JWT) | Live |
| Persistent PostgreSQL database | Live |
| Real-time SSE queue updates | Live |
| Customer self-service ticket | Live |
| WhatsApp booking confirmation | Live |
| Bilingual UI (ID / EN) | Live |
| Dark / Light theme | Live |
| TV display board | Live |
| Weekly analytics & reports | Live |
| Multi-tenant support | Live (URL-scoped) |
| Service-duration-aware slots | Live |
| Rate limiting (public write endpoints) | Live |
| **Self-service tenant onboarding** | **Live** |
| **Setup completion banner (admin)** | **Live** |
| **Queue pause / resume** | **Live** |
| **Admin PIN change** | **Live** |
| **Shop QR code + copy link** | **Live** |
| **WA queue call notification** | **Live** |
| **Business hours enforcement** | **Live** |
| **Display board pause indicator** | **Live** |
| Email / SMS notifications | Planned |
| Payment gateway | Planned |
| PWA / offline support | Planned |

---

## 2. High-Level Architecture (HLA)

### System Overview

```
                        ┌─────────────────────────────────────────────────┐
                        │              Clients (Browser)                  │
                        │                                                 │
                        │  Landing /     Onboarding   Customer Portal     │
                        │  page.tsx      /onboard     /[tenant]/queue     │
                        │                             /[tenant]/booking   │
                        │  Admin Dashboard            /[tenant]/display   │
                        │  /[tenant]/admin                                │
                        └────────┬────────────────────────┬──────────────┘
                                 │ HTTPS                  │ HTTPS + SSE
                        ┌────────▼────────────────────────▼──────────────┐
                        │           Next.js 16 (Frontend)                │
                        │           Port 3000                            │
                        │                                                │
                        │  App Router · TypeScript · shadcn/ui           │
                        │  Tailwind CSS · i18n · Theme system            │
                        │                                                │
                        │  next.config.ts: /api/* → :8080/api/*         │
                        └────────────────┬───────────────────────────────┘
                                         │ HTTP Proxy (rewrites)
                        ┌────────────────▼───────────────────────────────┐
                        │           Go Backend (Echo v4)                 │
                        │           Port 8080                            │
                        │                                                │
                        │  Handlers · Middleware · Services              │
                        │  JWT Auth · CORS · Rate Limiter · SSE Hub      │
                        │  GORM ORM · Goose Migrations                   │
                        │  TenantMiddleware (1 DB hit per request)       │
                        └────────────────┬───────────────────────────────┘
                                         │ SQL (GORM)
                        ┌────────────────▼───────────────────────────────┐
                        │           PostgreSQL 16                        │
                        │           Port 5432                            │
                        │                                                │
                        │  Persistent data, Docker volume                │
                        │  Composite indexes on (tenant_id, status/date) │
                        └────────────────────────────────────────────────┘
```

### Component Map

```
D:\Project\Barbershop
├── frontend/                       ← Next.js 16 App
│   ├── app/
│   │   ├── layout.tsx              ← Root layout (providers, fonts)
│   │   ├── page.tsx                ← Landing page (hero + onboard CTA + find shop)
│   │   ├── globals.css             ← CSS variables, status badge styles
│   │   ├── onboard/
│   │   │   └── page.tsx            ← 3-step tenant onboarding wizard
│   │   └── [tenant]/
│   │       ├── queue/page.tsx      ← Customer Queue Hub (public)
│   │       ├── booking/page.tsx    ← 5-step booking wizard (public)
│   │       ├── display/page.tsx    ← TV display board (public, SSE)
│   │       └── admin/
│   │           ├── page.tsx        ← Owner Dashboard (auth-guarded, 7 tabs)
│   │           └── login/page.tsx  ← PIN login page
│   ├── components/
│   │   ├── theme-provider.tsx      ← ThemeProvider + useTheme()
│   │   ├── theme-toggle.tsx        ← Sun/Moon toggle
│   │   ├── lang-provider.tsx       ← LangProvider + useLang() / t()
│   │   ├── lang-toggle.tsx         ← ID/EN toggle
│   │   └── ui/                     ← shadcn/ui components
│   ├── lib/
│   │   ├── types.ts                ← All TypeScript interfaces (Go-backend aligned)
│   │   ├── i18n.ts                 ← Translation strings (ID + EN, all sections)
│   │   ├── utils.ts                ← cn, formatRupiah, formatTime, adminAuthHeaders
│   │   └── mockStore.ts            ← Legacy mock (not used; @ts-nocheck suppressed)
│   └── next.config.ts              ← API proxy rewrites → BACKEND_URL
│
├── backend/                        ← Go 1.24 API Server
│   ├── cmd/server/main.go          ← Entry point, Echo routes
│   ├── internal/
│   │   ├── domain/models.go        ← GORM models + DTOs (incl. OnboardRequest)
│   │   ├── handler/
│   │   │   ├── handler.go          ← Handler struct + TenantMiddleware + helpers
│   │   │   ├── auth.go             ← Login / Logout (PIN → JWT)
│   │   │   ├── queue.go            ← Queue CRUD + actions + atomic upsertCustomer
│   │   │   ├── booking.go          ← Booking CRUD + actions
│   │   │   ├── barber.go           ← Barber CRUD + toggle
│   │   │   ├── svc.go              ← Service CRUD
│   │   │   ├── customer.go         ← Customer list
│   │   │   ├── dashboard.go        ← Today + weekly stats (N+1-free)
│   │   │   ├── stream.go           ← SSE endpoint
│   │   │   └── tenant.go           ← Tenant info + settings + OnboardTenant + CheckSlug
│   │   ├── middleware/
│   │   │   └── auth.go             ← JWT middleware (RequireAuth)
│   │   ├── repository/
│   │   │   ├── db.go               ← PostgreSQL init + Goose migrations
│   │   │   └── seed.go             ← Seed data (SEED_ON_START=true)
│   │   └── service/
│   │       ├── uid.go              ← Prefixed ID generator
│   │       ├── phone.go            ← Phone normalizer (08x → 628x)
│   │       ├── wa.go               ← WhatsApp link generator
│   │       ├── slots.go            ← Available slot calculator
│   │       └── sse_hub.go          ← In-process SSE broadcast hub
│   ├── migrations/                 ← Goose SQL migration files
│   │   ├── 00001_init.sql          ← Schema creation
│   │   └── 00002_add_indexes.sql   ← Composite performance indexes
│   ├── Dockerfile
│   └── go.mod
│
├── docker-compose.yml              ← Postgres + Backend services
└── DOCUMENTATION.md
```

---

## 3. Data Models & ERD

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              TENANT                                     │
│  id (PK) · slug (unique) · name · address · phone                      │
│  open_time · close_time · pin_hash                                      │
└───────┬────────────────────────────────────────────────────────────────┘
        │ 1
        │
        ├─── has many ──► ┌──────────────────────────────────────────────┐
        │                 │                  BARBER                      │
        │                 │  id (PK) · tenant_id (FK) · name · is_active │
        │                 └─────────────────────┬────────────────────────┘
        │                                       │ 0..1
        │                                       │ (optional)
        ├─── has many ──► ┌──────────────────────────────────────────────┐
        │                 │                 SERVICE                      │
        │                 │  id (PK) · tenant_id (FK) · name             │
        │                 │  price_idr · duration_min                    │
        │                 └─────────────────────┬────────────────────────┘
        │                                       │ 1
        │                                       │
        ├─── has many ──► ┌──────────────────────────────────────────────┐
        │                 │                CUSTOMER                      │
        │                 │  id (PK) · tenant_id (FK) · name             │
        │                 │  phone_raw · phone_normalized (unique/tenant) │
        │                 │  visit_count · last_visit_at                 │
        │                 └─────────────────────┬────────────────────────┘
        │                                       │ 1
        │                                       │
        ├─── has many ──► ┌──────────────────────────────────────────────┐
        │                 │               QUEUE_ITEM                     │
        │                 │  id (PK) · tenant_id (FK) · customer_id (FK) │
        │                 │  barber_id (FK, nullable) · service_id (FK)  │
        │                 │  status · ticket_number · ticket_token        │
        │                 │  is_paid · total_amount_idr                  │
        │                 │  created_at · called_at · completed_at        │
        │                 └──────────────────────────────────────────────┘
        │
        └─── has many ──► ┌──────────────────────────────────────────────┐
                          │                 BOOKING                      │
                          │  id (PK) · tenant_id (FK) · customer_id (FK) │
                          │  barber_id (FK, nullable) · service_id (FK)  │
                          │  status · scheduled_date · scheduled_time     │
                          │  notes · ticket_token                         │
                          │  created_at · confirmed_at · completed_at     │
                          └──────────────────────────────────────────────┘
```

### Domain Models

**Tenant**
```go
type Tenant struct {
    ID        string    // "tenant_cugo"
    Slug      string    // "cugo" (unique URL key)
    Name      string    // "Cugo Barbershop"
    Address   string
    Phone     string
    OpenTime  string    // "09:00"
    CloseTime string    // "20:00"
    PinHash   string    // bcrypt hash of admin PIN (never in JSON)
}
```

**QueueItem** — statuses: `WAITING` → `IN_SERVICE` → `DONE` | `CANCELLED`

**Booking** — statuses: `UPCOMING` → `IN_PROGRESS` → `DONE` | `CANCELLED`

### Performance Indexes

```sql
-- Hot query paths — added via migration 00002_add_indexes.sql
CREATE INDEX idx_queue_items_tenant_status      ON queue_items(tenant_id, status);
CREATE INDEX idx_queue_items_tenant_date        ON queue_items(tenant_id, DATE(created_at));
CREATE INDEX idx_queue_items_tenant_barber      ON queue_items(tenant_id, barber_id, status)
  WHERE barber_id IS NOT NULL;
CREATE INDEX idx_bookings_tenant_date_status    ON bookings(tenant_id, scheduled_date, status);
CREATE INDEX idx_barbers_tenant_active          ON barbers(tenant_id, is_active);
```

---

## 4. Flow Diagrams

### 4.1 Tenant Onboarding Flow (New)

```
Owner (New)                      Frontend                          Backend (Go)
   │                                │                                   │
   │  Open /                        │                                   │
   │◄── Landing page ───────────────│                                   │
   │                                │                                   │
   │  Click "Register Your Shop"    │                                   │
   │ ─────────────────────────────► │  navigate to /onboard             │
   │                                │                                   │
   │  STEP 0: Type shop URL slug    │                                   │
   │  (debounced 500ms)             │  GET /api/onboard/check-slug      │
   │                                │  ?slug=cugo-new                   │
   │                                │ ─────────────────────────────────►│
   │                                │◄─────────────────────────────────-│
   │  "URL available!" shown        │  { data: { available: true } }    │
   │                                │                                   │
   │  STEP 1: Shop name, address,   │                                   │
   │          phone                 │                                   │
   │                                │                                   │
   │  STEP 2: Hours + Admin PIN     │                                   │
   │  (Review summary shown)        │                                   │
   │  Click "Create Shop"           │  POST /api/onboard                │
   │ ─────────────────────────────► │  { slug, name, address, phone,    │
   │                                │    openTime, closeTime,           │
   │                                │    pin, confirmPin }              │
   │                                │ ─────────────────────────────────►│
   │                                │                  ┌────────────────┤
   │                                │                  │ Validate slug  │
   │                                │                  │ Hash PIN (bcrypt)
   │                                │                  │ Create Tenant  │
   │                                │                  │ Sign JWT       │
   │                                │                  │ Set cookie     │
   │                                │                  └────────────────┤
   │                                │◄─────────────────────────────────-│
   │                                │  201 { data: { tenant, token } }  │
   │  Save token to localStorage    │                                   │
   │  Redirect to /[slug]/admin     │                                   │
   │                                │                                   │
   │  Admin dashboard shown         │                                   │
   │  "Complete Setup" banner       │                                   │
   │  (no barbers or services yet)  │                                   │
```

### 4.2 Walk-In Queue Flow

```
Customer                         Frontend                          Backend (Go)
   │                                │                                   │
   │  Open /[tenant]/queue          │                                   │
   │ ─────────────────────────────► │  GET /api/tenants/:tenant/queue   │
   │                                │ ─────────────────────────────────►│
   │                                │◄─────────────────────────────────-│
   │                                │  { stats, items[] }               │
   │◄─────────────────────────────  │                                   │
   │  See live queue + stats        │                                   │
   │                                │                                   │
   │  Click "Join Queue"            │                                   │
   │ ─────────────────────────────► │                                   │
   │                                │  (modal opens, fill form)        │
   │  Submit: name, phone, svc, brb │                                   │
   │ ─────────────────────────────► │  POST /api/tenants/:tenant/       │
   │                                │       queue/join                  │
   │                                │  { customerName, customerPhone,   │
   │                                │    serviceId, barberId }          │
   │                                │ ─────────────────────────────────►│
   │                                │                  ┌────────────────┤
   │                                │                  │ Upsert customer│
   │                                │                  │ (ON CONFLICT   │
   │                                │                  │  DO UPDATE)    │
   │                                │                  │ Assign ticket# │
   │                                │                  │ Gen TicketToken│
   │                                │                  │ Create WAITING │
   │                                │                  │ Broadcast SSE  │
   │                                │                  └────────────────┤
   │                                │◄─────────────────────────────────-│
   │                                │  { data: QueueItem + token }      │
   │◄─────────────────────────────  │                                   │
   │  Ticket card shown             │  (token saved to localStorage)    │
   │  Queue# · Status · Wait est.   │                                   │
   │                                │                                   │
   │  [EventSource connected]       │  GET /queue/stream (SSE)          │
   │                                │ ─────────────────────────────────►│
   │◄──────────── SSE push ─────────│◄── QUEUE_UPDATE event ────────────│
   │  Real-time status updates      │                                   │
   │                                │                                   │
   │  (optional) Cancel ticket      │                                   │
   │ ─────────────────────────────► │  POST /queue/my-ticket/cancel     │
   │                                │  Header: X-Ticket-Token: <token>  │
   │                                │ ─────────────────────────────────►│
```

### 4.3 Online Booking Flow

```
Customer                         Frontend                          Backend
   │                                │                                   │
   │  Open /[tenant]/booking        │                                   │
   │                                │                                   │
   │  STEP 1: Pick Service          │                                   │
   │  STEP 2: Pick Barber           │                                   │
   │  STEP 3: Pick Date             │  GET /bookings/slots              │
   │  (select date)                 │  ?date=YYYY-MM-DD&barberId=...    │
   │                                │ ─────────────────────────────────►│
   │                                │                  ┌────────────────┤
   │                                │                  │ Generate slots  │
   │                                │                  │ openTime→close │
   │                                │                  │ Block if booked │
   │                                │                  │ Block past time │
   │                                │                  │ Duration-aware  │
   │                                │                  └────────────────┤
   │                                │◄─────────────────────────────────-│
   │  Available slots shown         │  { data: { slots: [TimeSlot] } }  │
   │  STEP 4: Personal Data         │                                   │
   │  STEP 5: Review & Confirm      │                                   │
   │  Click Confirm                 │  POST /bookings                   │
   │ ─────────────────────────────► │  { customerName, customerPhone,   │
   │                                │    serviceId, barberId,           │
   │                                │    scheduledDate, scheduledTime } │
   │                                │ ─────────────────────────────────►│
   │                                │                  ┌────────────────┤
   │                                │                  │ Upsert customer│
   │                                │                  │ Check slot avail│
   │                                │                  │ Create UPCOMING │
   │                                │                  └────────────────┤
   │                                │◄─────────────────────────────────-│
   │  Booking confirmed screen      │  { data: Booking }                │
   │                                │                                   │
   │                    Owner sees booking in /admin                    │
   │                    Owner clicks "Confirm"                          │
   │                                │  POST /bookings/:id/confirm       │
   │                                │ ─────────────────────────────────►│
   │                                │                  ┌────────────────┤
   │                                │                  │ UPCOMING →     │
   │                                │                  │ IN_PROGRESS    │
   │                                │                  │ Gen WA link    │
   │                                │                  └────────────────┤
   │                                │◄─────────────────────────────────-│
   │                    Owner clicks WA link → sends to customer        │
   │◄──── WhatsApp message ─────────────────────────────────────────────│
```

### 4.4 Admin Authentication Flow

```
Owner                            Frontend                          Backend
   │                                │                                   │
   │  Open /[tenant]/admin          │                                   │
   │ ─────────────────────────────► │  GET /dashboard/today             │
   │                                │  (no token)                       │
   │                                │ ─────────────────────────────────►│
   │                                │◄──── 401 Unauthorized ────────────│
   │◄─── redirect to /admin/login ──│                                   │
   │                                │                                   │
   │  Enter PIN (e.g. 1234)         │                                   │
   │ ─────────────────────────────► │  POST /auth/login                 │
   │                                │  { pin: "1234" }                  │
   │                                │ ─────────────────────────────────►│
   │                                │                  ┌────────────────┤
   │                                │                  │ bcrypt compare  │
   │                                │                  │ pin vs pin_hash │
   │                                │                  │ Sign JWT        │
   │                                │                  │ Set httpOnly   │
   │                                │                  │ cookie         │
   │                                │                  └────────────────┤
   │                                │◄─────────────────────────────────-│
   │                                │  { data: { token } }              │
   │◄─── redirect to /admin ────────│  localStorage[admin_token_<slug>] │
   │                                │  = token                          │
   │                                │                                   │
   │  All subsequent admin API calls│                                   │
   │                                │  Authorization: Bearer <token>    │
   │                                │ ─────────────────────────────────►│
   │                                │◄─────────────────────────────────-│
```

### 4.5 SSE Real-Time Update Flow

```
Client (Browser)                 Next.js Proxy                 Go SSE Hub
   │                                │                               │
   │  new EventSource(              │                               │
   │    '/api/tenants/:t/           │                               │
   │     queue/stream')             │                               │
   │ ─────────────────────────────► │  GET /queue/stream            │
   │                                │  (long-lived connection)      │
   │                                │ ─────────────────────────────►│
   │                                │                  ┌────────────┤
   │                                │                  │ Register   │
   │                                │                  │ client ch  │
   │                                │                  └────────────┤
   │                                │◄── SSE keepalive comment ─────│
   │◄──── open event ───────────────│
   │                                │
   │           [Any queue mutation: start/complete/cancel/join]
   │                                │                  ┌────────────┤
   │                                │                  │ Broadcast  │
   │                                │                  │ to all     │
   │                                │                  │ tenant ch  │
   │                                │                  └────────────┤
   │◄──── message event ────────────│◄── data: {"type":"QUEUE_UPDATE"│
   │  { type, stats, items[] }      │    stats:{...},items:[...]} ──│
   │                                │                               │
   │  [Client disconnects]          │                               │
   │ ─── connection close ─────────►│                               │
   │                                │──── close notify ────────────►│
   │                                │                  ┌────────────┤
   │                                │                  │ Deregister │
   │                                │                  │ client ch  │
   │                                │                  └────────────┤
   │  [SSE fails → fallback]        │                               │
   │  setInterval(10s, fetchQueue)  │                               │
```

### 4.6 Slot Calculation Flow

```
GET /bookings/slots?date=D&barberId=B&serviceId=S
              │
              ▼
      Fetch tenant openTime/closeTime
              │
              ▼
      Generate all 30-min slots from open→close
      ["09:00","09:30","10:00",...,"19:30"]
              │
              ▼
      Fetch existing bookings for date + barber(s)
      (status: UPCOMING or IN_PROGRESS)
              │
              ▼
      For each booking: block start_slot and
      additional ceil(durationMin/30)-1 slots
      (duration-aware blocking)
              │
              ▼
      If past time today → mark unavailable
              │
              ▼
      If barberId = "any":
        slot available = at least 1 active barber free
      Else:
        slot available = not blocked for this barber
              │
              ▼
      Return [{ time, available }]
```

---

## 5. Backend API Reference

### Global Routes (no tenant scope)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/onboard/check-slug` | No | Check slug availability `?slug=xxx` |
| POST | `/api/onboard` | No | Create new tenant + auto-login JWT |

### Tenant-Scoped Routes

All endpoints: `GET|POST|PUT|DELETE /api/tenants/:tenant/...`

Auth-protected routes require: `Authorization: Bearer <jwt-token>`

The backend resolves the tenant **once per request** via `TenantMiddleware` (cached in Echo context — zero extra DB cost in handlers).

### Response Envelope

```json
// Success
{ "data": <payload> }

// Error
{ "error": { "code": "TENANT_NOT_FOUND", "message": "..." } }
```

### Onboarding

**POST /api/onboard**
```json
{
  "slug": "my-shop",
  "name": "My Barbershop",
  "address": "Jl. Sudirman No. 1",
  "phone": "081234567890",
  "openTime": "09:00",
  "closeTime": "21:00",
  "pin": "1234",
  "confirmPin": "1234"
}
```
Returns: `201 { data: { tenant: Tenant, token: string } }`
- Token is immediately valid — frontend saves to localStorage and redirects to admin.

**GET /api/onboard/check-slug?slug=xxx**
Returns: `{ data: { available: true|false } }`

Slug rules: 3–30 characters, lowercase letters/numbers/hyphens, must start and end with letter/number.

### Tenant

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Tenant info, active barbers, all services |
| GET | `/settings` | No | Current shop settings |
| PUT | `/settings` | Yes | Update name, address, phone, hours |

### Queue

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/queue` | No | Today's queue items + stats (includes `isPaused`) |
| POST | `/queue/join` | No (rate-limited) | Join the queue — blocked when paused or outside hours |
| POST | `/queue/pause` | Yes | Pause queue — blocks new joins |
| POST | `/queue/resume` | Yes | Resume queue |
| GET | `/queue/my-ticket` | No | Get own ticket by `?t=<ticketToken>` |
| POST | `/queue/my-ticket/cancel` | No | Cancel own WAITING ticket (token in body) |
| GET | `/queue/stream` | No | SSE stream (long-lived) |
| POST | `/queue/:id/start` | Yes | WAITING → IN_SERVICE + returns `waLink` |
| POST | `/queue/:id/complete` | Yes | IN_SERVICE → DONE |
| POST | `/queue/:id/cancel` | Yes | Any active → CANCELLED |

**POST /queue/join**
```json
{
  "customerName": "John",
  "customerPhone": "08123456789",
  "serviceId": "svc_abc123",
  "barberId": "brb_abc123"   // optional
}
```
Returns: `{ data: { ...QueueItem, ticketToken: "..." } }`

**POST /queue/:id/complete**
```json
{
  "isPaid": true,
  "totalAmountIDR": 35000
}
```

### Bookings

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/bookings` | Yes | List bookings. `?date=YYYY-MM-DD` or `?all=1` |
| POST | `/bookings` | No (rate-limited) | Create booking |
| GET | `/bookings/slots` | No | Available slots `?date=&barberId=&serviceId=` |
| POST | `/bookings/:id/confirm` | Yes | UPCOMING → IN_PROGRESS + WA link |
| POST | `/bookings/:id/cancel` | Yes | → CANCELLED |
| POST | `/bookings/:id/complete` | Yes | IN_PROGRESS → DONE |

**POST /bookings**
```json
{
  "customerName": "John",
  "customerPhone": "08123456789",
  "serviceId": "svc_abc123",
  "barberId": "brb_abc123",
  "scheduledDate": "2026-03-05",
  "scheduledTime": "10:00",
  "notes": "Potong pendek"
}
```

### Dashboard

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard/today` | Yes | Today's summary + per-barber stats |
| GET | `/dashboard/stats` | Yes | Last 7 days + top barbers + top services |

**GET /dashboard/today** returns:
```json
{
  "data": {
    "customersToday": 12,
    "revenueToday": 420000,
    "activeQueue": 3,
    "barberStats": [
      { "barber": { "id": "...", "name": "Andi", ... }, "servedToday": 5, "revenueToday": 175000 }
    ]
  }
}
```

**GET /dashboard/stats** returns:
```json
{
  "data": {
    "last7Days": [{ "date": "2026-03-05", "count": 12, "revenue": 420000 }],
    "topBarbers":  [{ "barber": {...}, "servedToday": 5, "revenueToday": 175000 }],
    "topServices": [{ "service": {...}, "count": 8, "revenue": 280000 }],
    "totalRevenue": 1200000,
    "totalCustomers": 35
  }
}
```

### Customers

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/customers` | Yes | All customers, sorted by visit count desc |

### Barbers

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/barbers` | Yes | Add barber `{ name }` |
| PUT | `/barbers/:id` | Yes | Rename barber `{ name }` |
| DELETE | `/barbers/:id` | Yes | Delete barber |
| POST | `/barbers/:id/toggle` | Yes | Toggle isActive |

### Services

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/services` | Yes | Add service `{ name, priceIDR, durationMin }` |
| PUT | `/services/:id` | Yes | Update service |
| DELETE | `/services/:id` | Yes | Delete service |

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | No | `{ pin }` → `{ token }` |
| POST | `/auth/logout` | No | Clears httpOnly cookie |
| POST | `/auth/change-pin` | Yes | `{ currentPin, newPin, confirmPin }` |

### Error Codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed or missing request body |
| 400 | `INVALID_SLUG` | Slug format invalid or out of range |
| 400 | `MISSING_NAME` | Shop name is required |
| 400 | `INVALID_PIN` | PIN must be 4–6 digits |
| 400 | `PIN_MISMATCH` | PIN and confirmPin do not match |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 401 | `INVALID_PIN` | Wrong admin PIN on login |
| 404 | `TENANT_NOT_FOUND` | Tenant slug not found |
| 404 | `QUEUE_ITEM_NOT_FOUND` | Queue item not found |
| 404 | `BOOKING_NOT_FOUND` | Booking not found |
| 404 | `BARBER_NOT_FOUND` | Barber not found |
| 404 | `SERVICE_NOT_FOUND` | Service not found |
| 409 | `SLUG_TAKEN` | Slug already registered by another tenant |
| 409 | `QUEUE_PAUSED` | Queue is paused — new joins blocked |
| 409 | `SHOP_CLOSED` | Current time is outside business hours |
| 409 | `INVALID_STATUS_TRANSITION` | Action not valid in current status |
| 409 | `SLOT_TAKEN` | Booking slot already occupied |
| 429 | `RATE_LIMIT` | Too many requests from this IP |

---

## 6. Frontend Routes & Pages

### Route Map

| URL | Page | Auth | Description |
|---|---|---|---|
| `/` | `app/page.tsx` | No | Landing page — hero, features, find shop |
| `/onboard` | `onboard/page.tsx` | No | 3-step tenant registration wizard |
| `/[tenant]/queue` | `queue/page.tsx` | No | Customer Queue Hub |
| `/[tenant]/booking` | `booking/page.tsx` | No | 5-step booking wizard |
| `/[tenant]/display` | `display/page.tsx` | No | TV display board (SSE) |
| `/[tenant]/admin` | `admin/page.tsx` | Yes (JWT) | Owner Dashboard |
| `/[tenant]/admin/login` | `admin/login/page.tsx` | No | PIN login |

### Page Descriptions

**`/`** — Landing Page
- Hero section with tagline and "Register Your Shop" CTA → `/onboard`
- Three feature cards: Digital Queue, Online Booking, Real-time Dashboard
- "Find your shop" input: type slug → redirects to `/{slug}/queue`

**`/onboard`** — Tenant Onboarding Wizard (3 steps)
1. **URL**: Slug input with 500ms debounced availability check; live preview of shop URL
2. **Shop Info**: Name (required), address, phone
3. **Hours & PIN**: Opening/closing time + admin PIN + confirmation; review summary card
- On success: receives JWT, saves to `localStorage[admin_token_<slug>]`, redirects to `/{slug}/admin`

**`/[tenant]/queue`** — Customer Queue Hub
- Shop info header (name, address, phone)
- Live stats bar: waiting count, estimated wait, active barbers
- "Join Queue" button → modal form
- Queue list (WAITING + IN_SERVICE) with status badges
- Services menu with prices/durations
- Barber availability cards
- Ticket card after joining (shows queue#, status, wait estimate — live via SSE)
- EventSource for SSE; falls back to 10s polling on error

**`/[tenant]/booking`** — 5-Step Wizard
1. Pick Service (price + duration shown)
2. Pick Barber (or "Any barber")
3. Pick Date → available slots loaded from API
4. Personal data (name + WhatsApp)
5. Review & Confirm

**`/[tenant]/display`** — TV Display Board
- Full-screen layout for wall/TV display
- Shows currently IN_SERVICE tickets (large text)
- Shows next WAITING tickets ("Now Calling")
- SSE-powered, auto-updates without interaction

**`/[tenant]/admin`** — Owner Dashboard (7 tabs)
- Protected: checks `localStorage[admin_token_<slug>]`; 401 → login redirect
- **Setup Banner**: shown when shop has no barbers or services yet (new shops); links to Barbers/Services tabs
- See [Section 13](#13-admin-dashboard) for full tab details

**`/[tenant]/admin/login`** — PIN Login
- Single PIN input (4–6 digits)
- POST to `/auth/login`
- Token saved to localStorage + httpOnly cookie set by server

---

## 7. Auth System

### Flow

```
1. Owner visits /[tenant]/admin
2. Frontend reads localStorage["admin_token_<slug>"]
3. If no token → redirect to /admin/login
4. Owner enters PIN → POST /auth/login { pin }
5. Backend: bcrypt.Compare(pin, tenant.PinHash)
6. On success: sign JWT (HS256, 24h, claims: tenantId, tenantSlug, role)
7. JWT returned in response body + set as httpOnly cookie
8. Frontend saves token to localStorage
9. All admin API calls include: Authorization: Bearer <token>
10. Backend middleware validates JWT and extracts tenant claims
```

### JWT Claims

```json
{
  "tenantId": "tenant_cugo",
  "tenantSlug": "cugo",
  "role": "OWNER",
  "exp": 1234567890
}
```

### Security Notes

- PIN stored as bcrypt hash (cost 12) in `tenants.pin_hash`
- JWT secret from `JWT_SECRET` env var (change in production!)
- Default dev PIN for `cugo` tenant: `1234`
- All protected routes reject requests from other tenant slugs
- Onboarding auto-issues JWT on success — owner is immediately logged in

---

## 8. Tenant Onboarding

### Registration Rules

| Field | Constraints |
|---|---|
| `slug` | 3–30 chars, lowercase letters/numbers/hyphens, start/end with alphanumeric |
| `name` | Required, min 2 chars |
| `pin` | 4–6 digits |
| `confirmPin` | Must match `pin` |
| `openTime` / `closeTime` | `HH:MM`, default `09:00` / `20:00` |
| `address`, `phone` | Optional |

### Slug Availability Check

```
GET /api/onboard/check-slug?slug=<value>

Returns: { data: { available: true|false } }

Checks:
  1. Format validation (regex + length)
  2. Database uniqueness query
```

The frontend debounces this check 500ms on every keystroke in the slug input. A green "URL is available!" indicator appears before the user can proceed.

### Post-Registration State

After successful registration:
1. Tenant row created in DB
2. JWT issued (24h) — same format as login JWT
3. Token saved to `localStorage[admin_token_<slug>]`
4. Redirect to `/{slug}/admin`
5. Admin dashboard shows **Setup Completion Banner** until at least one barber and one service are added

---

## 9. Queue System

### How the Queue Works

1. Customer joins → `QueueItem` created with status `WAITING`
2. Sequential `ticket_number` per tenant per day
3. Unique `ticket_token` generated for customer self-service
4. Owner's dashboard lists active queue items
5. Owner clicks "Start" → `WAITING` → `IN_SERVICE` (sets `called_at`)
6. Owner clicks "Done" → `IN_SERVICE` → `DONE` (sets `completed_at`, records payment)
7. Any mutation broadcasts SSE event to all connected clients

### Atomic Customer Upsert

When a customer joins the queue or books, their record is upserted atomically:

```sql
INSERT INTO customers (id, tenant_id, name, phone_raw, phone_normalized, ...)
VALUES (?, ?, ?, ?, ?, ...)
ON CONFLICT (tenant_id, phone_normalized) DO UPDATE
  SET name = EXCLUDED.name, updated_at = NOW()
```

This eliminates race conditions when the same customer joins from multiple tabs simultaneously.

### Queue Stats Calculation

```
waiting         = COUNT(status='WAITING')
inService       = COUNT(status='IN_SERVICE')
doneToday       = COUNT(status='DONE', date=today)
activeBarbers   = COUNT(barbers where is_active=true)
estWaitMinutes  = CEIL(SUM(service.duration_min of WAITING items) / activeBarbers)
```

### Ticket Token (Customer Self-Service)

- Random token returned on `POST /queue/join`
- Saved by frontend to `localStorage["ticket_token_<slug>"]`
- On page load: `GET /queue/my-ticket?t=<token>` restores ticket card
- Customer can cancel own WAITING ticket via `POST /queue/my-ticket/cancel`

### Status Lifecycle

```
          ┌─────────────┐
          │   WAITING   │ ──── cancel ────► CANCELLED
          └──────┬──────┘
                 │ start (owner)
          ┌──────▼──────┐
          │ IN_SERVICE  │ ──── cancel ────► CANCELLED
          └──────┬──────┘
                 │ complete (owner)
          ┌──────▼──────┐
          │    DONE     │
          └─────────────┘
```

---

## 10. Booking System

### Slot Calculation Rules

- Slots generated from `openTime` to `closeTime` in 30-min increments
- A slot is blocked if a booking exists for that barber at that time with status `UPCOMING` or `IN_PROGRESS`
- **Duration-aware blocking**: a service taking 40 min blocks 2 consecutive slots (at 10:00 and 10:30)
- Past slots (for today's date, before current time) are marked unavailable
- If `barberId = "any"`: slot is available if at least one active barber is free

### WhatsApp Confirmation

1. Customer books → status `UPCOMING`
2. Owner confirms → status `IN_PROGRESS`
3. API returns `waLink`: `https://wa.me/628xxx?text=...` (pre-filled message)
4. Owner clicks link → WhatsApp opens with booking details for customer
5. (No automatic sending — manual action by owner)

### Booking Status Lifecycle

```
          ┌────────────┐
          │  UPCOMING  │ ──── cancel ────► CANCELLED
          └─────┬──────┘
                │ confirm (owner)
          ┌─────▼──────┐
          │IN_PROGRESS │ ──── cancel ────► CANCELLED
          └─────┬──────┘
                │ complete (owner)
          ┌─────▼──────┐
          │    DONE    │
          └────────────┘
```

---

## 11. Real-Time (SSE)

### Architecture

```
GET /api/tenants/:tenant/queue/stream

Backend SSE Hub (per-process, in-memory):
  - Map[tenantSlug → []chan SSEEvent]
  - On connect: add channel to tenant's list
  - On disconnect: remove channel (via context cancellation)
  - On any queue mutation: broadcast to all tenant channels

Frontend:
  - new EventSource('/api/tenants/:tenant/queue/stream')
  - on 'message': parse JSON, update state
  - on error: fall back to setInterval(fetchQueue, 10_000)
```

### SSE Event Shape

```json
{
  "type": "QUEUE_UPDATE",
  "stats": {
    "waiting": 3,
    "inService": 1,
    "doneToday": 5,
    "activeBarbers": 2,
    "estWaitMinutes": 40
  },
  "items": [ /* QueueItem[] for today */ ]
}
```

### Triggers

SSE broadcast fires after: `JoinQueue`, `StartQueue`, `CompleteQueue`, `CancelQueue`, `CancelMyTicket`

---

## 12. Multi-Tenant Design

### Isolation Strategy

- Every database row has a `tenant_id` column
- Every backend query filters by `tenant_id` derived from `:tenant` slug URL param
- `TenantMiddleware` resolves tenant once per request and stores in Echo context — all handlers read from context at zero extra DB cost
- JWT claims include `tenantId` + `tenantSlug` — admin operations verify JWT tenant matches URL slug
- SSE hub maintains separate channel lists per tenant slug
- Frontend stores per-tenant tokens: `admin_token_<slug>`, `ticket_token_<slug>`

### Tenant Registration

New tenants self-register at `/onboard`:
1. Owner picks a unique slug (real-time availability check)
2. Fills shop info and sets admin PIN
3. `POST /api/onboard` creates the tenant row, hashes the PIN, issues a JWT
4. Owner is auto-redirected to their admin dashboard
5. No manual DB operations required by a system administrator

### Scalability Considerations

| Concern | Current Approach | Production Recommendation |
|---|---|---|
| SSE connections | In-process hub, single instance | Redis pub/sub for multi-instance |
| Connection limit | OS file descriptors | Nginx keepalive tuning, load balancer |
| DB queries | GORM + PostgreSQL, composite indexes | Covered — indexes on (tenant_id, status/date) |
| Rate limiting | Echo rate-limit middleware (10 req/s, burst 20) per IP | Add Redis-backed limiter for multi-instance |
| Session store | JWT stateless | Fine for scale; add token revocation if needed |
| N+1 queries | Eliminated — bulk `WHERE id IN ?` fetches in dashboard | Covered |

---

## 13. Admin Dashboard

### Setup Completion Banner

Shown automatically when `barbers.length === 0 || services.length === 0`. Displays "Complete Your Shop Setup" with shortcut buttons that switch directly to the Barbers or Services tab. Disappears once both conditions are met.

### Summary Cards (always visible)

| Card | Source |
|---|---|
| Customers Today | `doneToday` from queue stats |
| Revenue Today | Sum of `total_amount_idr` where `is_paid=true` today |
| Active Queue | `waiting + inService` count |

### Tab 1 — Queue

- **Live Queue**: WAITING + IN_SERVICE items. Actions: Start / Done & Pay / Cancel
- **History**: Today's DONE + CANCELLED items in a table

### Tab 2 — Bookings

- **Upcoming**: UPCOMING bookings. Actions: Confirm (generates WA link) / Cancel
- **In Progress**: IN_PROGRESS bookings. Actions: Done / Cancel
- **Past**: DONE + CANCELLED bookings

### Tab 3 — Barbers

- List with active/inactive badge + today's stats (served, revenue)
- Toggle active status (inactive barbers hidden from customer view)
- Add / Edit name / Delete

### Tab 4 — Services

- List with price (IDR) and duration (min)
- Add / Edit (name, price, duration) / Delete

### Tab 5 — Customers

- Table: Name, Phone, Visit Count, Last Visit
- Sorted by visit count descending
- Auto-created from queue joins or bookings (atomic upsert by phone)

### Tab 6 — Settings

- Edit: shop name, address, phone, open time, close time
- Saved via `PUT /settings` with auth token
- **Change Admin PIN**: current PIN + new PIN + confirm (4–6 digits)
- **Shop QR Code**: auto-generated QR for `/{slug}/queue` — download as PNG or copy URL

### Tab 7 — Reports

- Revenue last 7 days (per-day bar chart)
- Top barbers (by customers served + revenue)
- Top services (by booking count + revenue)
- Summary: total revenue, total customers, avg per day

---

## 14. Internationalization

### How It Works

```
lib/i18n.ts
  ├── translations.id = { ... }    (Indonesian)
  └── translations.en = { ... }    (English)

components/lang-provider.tsx
  └── LangProvider
       ├── useLang() → { lang, setLang, t }
       └── t("key") → string for current lang

Persistence: localStorage["barbershop-lang"]
Default: browser navigator.language || "id"
```

### Coverage

All user-visible strings are translated across all pages:
- Common actions (Save, Cancel, Edit, Delete, Confirm)
- Status labels (Waiting, In Service, Done, Cancelled, Upcoming, In Progress)
- Queue Hub page (join modal, ticket view, stats)
- Booking wizard (all 5 steps)
- Admin dashboard (all 7 tabs + setup banner)
- Display board
- Landing page (hero, features, find shop)
- Onboarding wizard (all 3 steps, slug validation messages)
- Error and validation messages

---

## 15. Theme System

### Light Mode

| Token | Value |
|---|---|
| Background | `#ffffff` |
| Foreground | `#0a0a0a` |
| Primary (accent) | `#2D5BFF` (Electric Blue) |
| Secondary bg | `#f4f6fa` |

### Dark Mode (Strict B&W)

| Token | Value |
|---|---|
| Background | `#000000` |
| Foreground | `#ffffff` |
| Primary | `#ffffff` |
| All accents | Monochrome only |

### Status Badge Colors

| Status | Light Mode | Dark Mode |
|---|---|---|
| WAITING | Light blue bg, blue text | White border, white text |
| IN_SERVICE | Yellow bg, dark text | White border, white text |
| DONE | Green bg, dark text | Dark gray bg, white text |
| CANCELLED | Red bg, dark text | Dark gray bg, muted text |

Persistence: `localStorage["barbershop-theme"]`
Fallback: OS `prefers-color-scheme`

---

## 16. Local Development

### Prerequisites

- Docker Desktop
- Node.js 20+
- Go 1.24+ (optional, only if developing backend outside Docker)

### Start Everything

```bash
# 1. Start PostgreSQL + Go backend (via Docker)
docker compose up --build

# 2. Start Next.js frontend
cd frontend
npm install
npm run dev
```

### Access URLs

| URL | Description |
|---|---|
| `http://localhost:3000` | Landing page |
| `http://localhost:3000/onboard` | Register a new barbershop |
| `http://localhost:3000/cugo/queue` | Customer Queue Hub (seed shop) |
| `http://localhost:3000/cugo/booking` | Booking Wizard |
| `http://localhost:3000/cugo/display` | TV Display Board |
| `http://localhost:3000/cugo/admin` | Admin Dashboard |
| `http://localhost:3000/cugo/admin/login` | PIN login (default: `1234`) |
| `http://localhost:8080/api/onboard/check-slug?slug=test` | Check slug availability |
| `http://localhost:8080/api/tenants/cugo/queue` | Backend API direct |

### Environment Variables

**Backend** (`backend/.env` or Docker env):

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/barbershop` | PostgreSQL DSN |
| `JWT_SECRET` | `dev-secret-change-me` | JWT signing key (change in prod!) |
| `SEED_ON_START` | `"true"` | Seed demo data on startup |
| `PORT` | `8080` | HTTP port |

**Frontend** (`frontend/.env.local`):

| Variable | Default | Description |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8080` | Go backend URL (server-side proxy) |

### Seed Data

When `SEED_ON_START=true`, the following data is created (if not already present):

| Entity | Details |
|---|---|
| Tenant | Cugo Barbershop · slug: `cugo` · PIN: `1234` |
| Barber 1 | Andi (active) |
| Barber 2 | Budi (active) |
| Barber 3 | Cahyo (inactive) |
| Service 1 | Reguler Haircut — Rp 35,000 / 20 min |
| Service 2 | Haircut + Shave — Rp 55,000 / 35 min |
| Service 3 | Fade + Styling — Rp 65,000 / 40 min |
| Service 4 | Kids Haircut — Rp 25,000 / 15 min |

---

## 17. Deployment

### Docker Compose (Single Host)

```yaml
# docker-compose.yml (production override)
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: barbershop
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: <strong-password>
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    image: barbershop-backend:latest
    environment:
      DATABASE_URL: postgres://postgres:<pwd>@postgres:5432/barbershop
      JWT_SECRET: <32-char-random-secret>
      SEED_ON_START: "false"    # disable in production
      PORT: "8080"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    image: barbershop-frontend:latest
    environment:
      BACKEND_URL: http://backend:8080
    ports:
      - "80:3000"

volumes:
  pgdata:
```

### Production Checklist

- [ ] Change `JWT_SECRET` to a strong random value (32+ chars)
- [ ] Set `SEED_ON_START=false`
- [ ] Set strong PostgreSQL password
- [ ] Configure CORS `AllowOrigins` to your domain only
- [ ] Enable HTTPS (Nginx reverse proxy with Let's Encrypt)
- [ ] Set `POSTGRES_PASSWORD` in a secrets manager (not plaintext)
- [ ] Configure backup for `pgdata` Docker volume
- [ ] Set up health check monitoring

### Nginx Reverse Proxy (Example)

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # SSE requires buffering disabled
    location ~ ^/api/tenants/[^/]+/queue/stream {
        proxy_pass http://localhost:3000;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding on;
    }
}
```

---

## 18. Roadmap

### Completed in v2.1

- [x] Rate limiting on `POST /queue/join` and `POST /bookings` (per-IP, Echo middleware)
- [x] Self-service tenant onboarding (`/onboard` wizard + `POST /api/onboard`)
- [x] Slug availability real-time check (`GET /api/onboard/check-slug`)
- [x] Admin setup completion banner (first-run UX)
- [x] TenantMiddleware (single DB lookup per request, cached in Echo context)
- [x] Atomic customer upsert (`ON CONFLICT DO UPDATE`)
- [x] N+1 eliminated in dashboard (bulk `WHERE id IN ?`)
- [x] Composite PostgreSQL indexes (tenant_id + status/date hot paths)
- [x] EstWaitMinutes: actual service-duration sum ÷ active barbers
- [x] Complete frontend type cleanup (all legacy mock-store dual-format fields removed)

### Completed in v2.2

- [x] **Queue pause / resume** — admin can temporarily halt new joins; SSE propagates `isPaused` to all clients; display board header turns red
- [x] **Admin PIN change** — `POST /auth/change-pin` (verifies current PIN, bcrypt re-hash)
- [x] **Shop QR code** — auto-generated in Settings tab (via `qrcode` npm), download PNG + copy link
- [x] **WA queue call notification** — `POST /queue/:id/start` returns `waLink`; admin gets an actionable toast to open WhatsApp with pre-filled "your turn" message
- [x] **Business hours enforcement** — `POST /queue/join` returns `SHOP_CLOSED` outside `openTime`–`closeTime`; customer queue shows closed banner + disables Join button
- [x] **Display board pause indicator** — header turns red and shows "Queue Paused" when `isPaused` is true

### Priority 1 — Production Hardening

- [ ] Proper timezone handling (store UTC, display in tenant local time)
- [ ] Ticket number persistence (reset daily by cron, not on restart)
- [ ] Admin audit log (who did what, when)
- [ ] Multi-instance SSE via Redis pub/sub
- [ ] Input sanitization beyond current validation

### Priority 2 — Customer Experience

- [ ] Customer booking self-cancel (via ticket token)
- [ ] SMS / Email notifications via Twilio or Resend
- [ ] Queue position push updates ("You're #2 in line")
- [ ] Booking reminder notification (1 hour before scheduled time)

### Priority 3 — Operations

- [ ] Barber working schedule / shifts (unavailable date ranges)
- [ ] Admin browser push notifications (new booking arrived)
- [ ] CSV / PDF export (daily report, customer list)
- [ ] Payment gateway integration (Midtrans / Xendit)
- [ ] Loyalty / visit tracking (badges, discounts)

### Priority 4 — Multi-Tenant Scaling

- [ ] Custom branding per tenant (logo, brand color)
- [ ] Custom domain support (`cugo.barbershophub.com`)
- [ ] Subscription / billing management
- [ ] PWA with offline support and Web Push API
- [ ] Horizontal scaling guide (stateless backend + Redis SSE hub)

---

*Last updated: 2026-03-06 | Version: 2.2*
