-- +goose Up

CREATE TABLE IF NOT EXISTS tenants (
    id          TEXT PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    address     TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    open_time   TEXT NOT NULL DEFAULT '09:00',
    close_time  TEXT NOT NULL DEFAULT '20:00',
    pin_hash    TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barbers (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_barbers_tenant_id ON barbers(tenant_id);

CREATE TABLE IF NOT EXISTS services (
    id           TEXT PRIMARY KEY,
    tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    price_idr    INT NOT NULL DEFAULT 0,
    duration_min INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON services(tenant_id);

CREATE TABLE IF NOT EXISTS customers (
    id               TEXT PRIMARY KEY,
    tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    phone_raw        TEXT NOT NULL DEFAULT '',
    phone_normalized TEXT NOT NULL,
    last_visit_at    TIMESTAMPTZ,
    visit_count      INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT idx_tenant_phone UNIQUE (tenant_id, phone_normalized)
);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);

CREATE TABLE IF NOT EXISTS queue_items (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id     TEXT NOT NULL REFERENCES customers(id),
    barber_id       TEXT REFERENCES barbers(id),
    service_id      TEXT NOT NULL REFERENCES services(id),
    status          TEXT NOT NULL DEFAULT 'WAITING',
    ticket_number   INT NOT NULL DEFAULT 0,
    ticket_token    TEXT NOT NULL UNIQUE,
    is_paid         BOOLEAN NOT NULL DEFAULT FALSE,
    total_amount_idr INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    called_at       TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_queue_items_tenant_id ON queue_items(tenant_id);

CREATE TABLE IF NOT EXISTS bookings (
    id             TEXT PRIMARY KEY,
    tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id    TEXT NOT NULL REFERENCES customers(id),
    barber_id      TEXT REFERENCES barbers(id),
    service_id     TEXT NOT NULL REFERENCES services(id),
    status         TEXT NOT NULL DEFAULT 'UPCOMING',
    scheduled_date TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    notes          TEXT NOT NULL DEFAULT '',
    ticket_token   TEXT NOT NULL UNIQUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at   TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON bookings(tenant_id);

-- +goose Down

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS queue_items;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS barbers;
DROP TABLE IF EXISTS tenants;
