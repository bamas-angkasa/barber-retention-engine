-- +goose Up

-- queue_items: hot paths for list, stats, and barber assignment
CREATE INDEX IF NOT EXISTS idx_queue_items_tenant_status
    ON queue_items(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_queue_items_tenant_date
    ON queue_items(tenant_id, DATE(created_at));

CREATE INDEX IF NOT EXISTS idx_queue_items_tenant_barber_status
    ON queue_items(tenant_id, barber_id, status)
    WHERE barber_id IS NOT NULL;

-- bookings: hot path for slot calculation and admin list
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_date_status
    ON bookings(tenant_id, scheduled_date, status);

-- barbers: hot path for active barber queries
CREATE INDEX IF NOT EXISTS idx_barbers_tenant_active
    ON barbers(tenant_id, is_active);

-- +goose Down

DROP INDEX IF EXISTS idx_queue_items_tenant_status;
DROP INDEX IF EXISTS idx_queue_items_tenant_date;
DROP INDEX IF EXISTS idx_queue_items_tenant_barber_status;
DROP INDEX IF EXISTS idx_bookings_tenant_date_status;
DROP INDEX IF EXISTS idx_barbers_tenant_active;
