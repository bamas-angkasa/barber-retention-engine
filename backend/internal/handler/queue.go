package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/barbershop/backend/internal/domain"
	"github.com/barbershop/backend/internal/service"
)

// ── GET /api/tenants/:tenant/queue ────────────────────────────────────────────

func (h *Handler) ListQueue(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	items, stats := h.getQueueData(tenant)
	return ok(c, domain.QueueResponse{Stats: stats, Items: items})
}

func (h *Handler) getQueueData(tenant *domain.Tenant) ([]domain.QueueItem, domain.QueueStats) {
	today := time.Now().Format("2006-01-02")

	var items []domain.QueueItem
	h.DB.Where("tenant_id = ? AND DATE(created_at) = ?", tenant.ID, today).
		Preload("Customer").
		Preload("Barber").
		Preload("Service").
		Order("created_at ASC").
		Find(&items)

	var activeBarbers int64
	h.DB.Model(&domain.Barber{}).
		Where("tenant_id = ? AND is_active = true", tenant.ID).
		Count(&activeBarbers)

	stats := buildStats(items, activeBarbers)
	stats.IsPaused = tenant.IsQueuePaused
	return items, stats
}

func buildStats(items []domain.QueueItem, activeBarbers int64) domain.QueueStats {
	var waiting, inService, done int
	totalWaitDuration := 0
	for _, it := range items {
		switch it.Status {
		case domain.QueueWaiting:
			waiting++
			if it.Service != nil {
				totalWaitDuration += it.Service.DurationMin
			} else {
				totalWaitDuration += 25
			}
		case domain.QueueInService:
			inService++
		case domain.QueueDone:
			done++
		}
	}

	// Estimate: total waiting duration spread across active barbers.
	estWait := 0
	if waiting > 0 {
		divisor := int(activeBarbers)
		if divisor < 1 {
			divisor = 1
		}
		estWait = (totalWaitDuration + divisor - 1) / divisor
	}

	return domain.QueueStats{
		Waiting:        waiting,
		InService:      inService,
		DoneToday:      done,
		ActiveBarbers:  int(activeBarbers),
		EstWaitMinutes: estWait,
	}
}

// ── POST /api/tenants/:tenant/queue/join ──────────────────────────────────────

func (h *Handler) JoinQueue(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var req domain.JoinQueueRequest
	if err := c.Bind(&req); err != nil {
		return apiErr(c, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
	}
	if req.CustomerName == "" || req.CustomerPhone == "" || req.ServiceID == "" {
		return apiErr(c, http.StatusBadRequest, "MISSING_FIELDS", "Name, phone, and service are required")
	}
	if tenant.IsQueuePaused {
		return apiErr(c, http.StatusConflict, "QUEUE_PAUSED", "Queue is currently paused, please try again later")
	}
	if !isWithinBusinessHours(tenant.OpenTime, tenant.CloseTime) {
		return apiErr(c, http.StatusConflict, "SHOP_CLOSED", fmt.Sprintf("Shop is closed. Hours: %s – %s", tenant.OpenTime, tenant.CloseTime))
	}

	// Validate service exists
	var svc domain.Service
	if err := h.DB.Where("id = ? AND tenant_id = ?", req.ServiceID, tenant.ID).First(&svc).Error; err != nil {
		return apiErr(c, http.StatusBadRequest, "INVALID_SERVICE", "Service not found")
	}

	// Find or create customer
	customer, err := h.upsertCustomer(tenant.ID, req.CustomerName, req.CustomerPhone)
	if err != nil {
		return apiErr(c, http.StatusInternalServerError, "CUSTOMER_ERROR", "Failed to register customer")
	}

	// Auto-assign barber if not specified
	barberID := req.BarberID
	if barberID == nil || *barberID == "" || *barberID == "any" {
		barberID = h.autoAssignBarber(tenant.ID)
	}

	// Determine next ticket number
	var maxTicket struct{ Max int }
	today := time.Now().Format("2006-01-02")
	h.DB.Model(&domain.QueueItem{}).
		Select("COALESCE(MAX(ticket_number), 0) as max").
		Where("tenant_id = ? AND DATE(created_at) = ?", tenant.ID, today).
		Scan(&maxTicket)
	ticketNum := maxTicket.Max + 1

	item := domain.QueueItem{
		ID:           service.UID(),
		TenantID:     tenant.ID,
		CustomerID:   customer.ID,
		BarberID:     barberID,
		ServiceID:    req.ServiceID,
		Status:       domain.QueueWaiting,
		TicketNumber: ticketNum,
		TicketToken:  service.UID(),
	}
	h.DB.Create(&item)

	// Populate for response
	h.DB.Preload("Customer").Preload("Barber").Preload("Service").First(&item, "id = ?", item.ID)

	// Broadcast SSE
	h.broadcastQueueUpdate(tenant)

	return created(c, item)
}

// ── POST /api/tenants/:tenant/queue/:queueItemId/start ────────────────────────

func (h *Handler) StartQueue(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var item domain.QueueItem
	if err := h.DB.Where("id = ? AND tenant_id = ?", c.Param("queueItemId"), tenant.ID).First(&item).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Queue item not found")
	}
	if item.Status != domain.QueueWaiting {
		return apiErr(c, http.StatusBadRequest, "INVALID_STATUS", "Only WAITING items can be started")
	}

	now := time.Now()
	h.DB.Model(&item).Updates(map[string]any{
		"status":    domain.QueueInService,
		"called_at": now,
	})

	h.DB.Preload("Customer").Preload("Barber").Preload("Service").First(&item, "id = ?", item.ID)
	h.broadcastQueueUpdate(tenant)

	// Build WA call link if customer has a phone number
	waLink := ""
	if item.Customer != nil && item.Customer.PhoneNormalized != "" {
		waLink = service.BuildQueueCallWALink(item.Customer.PhoneNormalized, tenant.Name, item.Customer.Name, item.TicketNumber)
	}

	return ok(c, map[string]any{"item": item, "waLink": waLink})
}

// ── POST /api/tenants/:tenant/queue/:queueItemId/complete ─────────────────────

func (h *Handler) CompleteQueue(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var item domain.QueueItem
	if err := h.DB.Where("id = ? AND tenant_id = ?", c.Param("queueItemId"), tenant.ID).First(&item).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Queue item not found")
	}
	if item.Status != domain.QueueInService {
		return apiErr(c, http.StatusBadRequest, "INVALID_STATUS", "Only IN_SERVICE items can be completed")
	}

	var req domain.CompleteQueueRequest
	c.Bind(&req)

	now := time.Now()
	h.DB.Model(&item).Updates(map[string]any{
		"status":          domain.QueueDone,
		"completed_at":    now,
		"is_paid":         req.IsPaid,
		"total_amount_idr": req.TotalAmountIDR,
	})

	// Update customer visit count
	h.DB.Model(&domain.Customer{}).
		Where("id = ?", item.CustomerID).
		Updates(map[string]any{
			"visit_count":  gorm.Expr("visit_count + 1"),
			"last_visit_at": now,
		})

	h.DB.Preload("Customer").Preload("Barber").Preload("Service").First(&item, "id = ?", item.ID)
	h.broadcastQueueUpdate(tenant)
	return ok(c, item)
}

// ── POST /api/tenants/:tenant/queue/:queueItemId/cancel ───────────────────────

func (h *Handler) CancelQueue(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var item domain.QueueItem
	if err := h.DB.Where("id = ? AND tenant_id = ?", c.Param("queueItemId"), tenant.ID).First(&item).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Queue item not found")
	}
	if item.Status == domain.QueueDone || item.Status == domain.QueueCancelled {
		return apiErr(c, http.StatusBadRequest, "INVALID_STATUS", "Cannot cancel a completed/cancelled item")
	}

	h.DB.Model(&item).Update("status", domain.QueueCancelled)
	h.broadcastQueueUpdate(tenant)
	return ok(c, map[string]string{"status": "CANCELLED"})
}

// ── GET /api/tenants/:tenant/queue/my-ticket ──────────────────────────────────

func (h *Handler) GetMyTicket(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	token := c.QueryParam("t")
	if token == "" {
		return apiErr(c, http.StatusBadRequest, "MISSING_TOKEN", "Token is required")
	}

	var item domain.QueueItem
	if err := h.DB.Where("ticket_token = ? AND tenant_id = ?", token, tenant.ID).
		Preload("Customer").Preload("Barber").Preload("Service").
		First(&item).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Ticket not found")
	}

	// Calculate position in queue
	var position int64
	h.DB.Model(&domain.QueueItem{}).
		Where("tenant_id = ? AND status = ? AND ticket_number < ?", tenant.ID, domain.QueueWaiting, item.TicketNumber).
		Count(&position)

	return ok(c, map[string]any{
		"item":     item,
		"position": position,
	})
}

// ── POST /api/tenants/:tenant/queue/my-ticket/cancel ─────────────────────────

func (h *Handler) CancelMyTicket(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var body struct {
		Token string `json:"token"`
	}
	if err := c.Bind(&body); err != nil || body.Token == "" {
		return apiErr(c, http.StatusBadRequest, "MISSING_TOKEN", "Token is required")
	}

	var item domain.QueueItem
	if err := h.DB.Where("ticket_token = ? AND tenant_id = ?", body.Token, tenant.ID).First(&item).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Ticket not found")
	}
	if item.Status != domain.QueueWaiting {
		return apiErr(c, http.StatusBadRequest, "INVALID_STATUS", "Only WAITING tickets can be cancelled")
	}

	h.DB.Model(&item).Update("status", domain.QueueCancelled)
	h.broadcastQueueUpdate(tenant)
	return ok(c, map[string]string{"status": "CANCELLED"})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// upsertCustomer atomically inserts or updates a customer by phone number,
// avoiding race conditions when concurrent requests arrive for the same phone.
func (h *Handler) upsertCustomer(tenantID, name, phone string) (*domain.Customer, error) {
	normalized := service.NormalizePhone(phone)
	newID := service.UID()

	err := h.DB.Exec(`
		INSERT INTO customers (id, tenant_id, name, phone_raw, phone_normalized, visit_count, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())
		ON CONFLICT (tenant_id, phone_normalized) DO UPDATE
		  SET name = EXCLUDED.name, updated_at = NOW()
	`, newID, tenantID, name, phone, normalized).Error
	if err != nil {
		return nil, err
	}

	var customer domain.Customer
	if err := h.DB.Where("tenant_id = ? AND phone_normalized = ?", tenantID, normalized).First(&customer).Error; err != nil {
		return nil, err
	}
	return &customer, nil
}

func (h *Handler) autoAssignBarber(tenantID string) *string {
	var barbers []domain.Barber
	h.DB.Where("tenant_id = ? AND is_active = true", tenantID).Find(&barbers)
	if len(barbers) == 0 {
		return nil
	}

	// Assign barber with fewest WAITING items
	type barberCount struct {
		BarberID string
		Count    int
	}
	counts := make(map[string]int)
	for _, b := range barbers {
		counts[b.ID] = 0
	}

	var rows []struct {
		BarberID string
		Count    int
	}
	h.DB.Model(&domain.QueueItem{}).
		Select("barber_id, count(*) as count").
		Where("tenant_id = ? AND status = ? AND barber_id IS NOT NULL", tenantID, domain.QueueWaiting).
		Group("barber_id").
		Scan(&rows)

	for _, r := range rows {
		counts[r.BarberID] = r.Count
	}

	bestID := barbers[0].ID
	bestCount := counts[bestID]
	for _, b := range barbers[1:] {
		if counts[b.ID] < bestCount {
			bestID = b.ID
			bestCount = counts[b.ID]
		}
	}
	return &bestID
}

// ── POST /api/tenants/:tenant/queue/pause ─────────────────────────────────────

func (h *Handler) PauseQueue(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}
	h.DB.Model(tenant).Update("is_queue_paused", true)
	tenant.IsQueuePaused = true
	h.broadcastQueueUpdate(tenant)
	return ok(c, map[string]bool{"isPaused": true})
}

// ── POST /api/tenants/:tenant/queue/resume ────────────────────────────────────

func (h *Handler) ResumeQueue(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}
	h.DB.Model(tenant).Update("is_queue_paused", false)
	tenant.IsQueuePaused = false
	h.broadcastQueueUpdate(tenant)
	return ok(c, map[string]bool{"isPaused": false})
}

func (h *Handler) broadcastQueueUpdate(tenant *domain.Tenant) {
	items, stats := h.getQueueData(tenant)
	service.DefaultHub.Broadcast(tenant.ID, domain.SSEEvent{
		Type:  "QUEUE_UPDATE",
		Stats: &stats,
		Items: items,
	})
}

// isWithinBusinessHours returns true if the current local time is within [openTime, closeTime).
// Both times are "HH:MM" strings. Returns true if either is empty/malformed (fail-open).
func isWithinBusinessHours(openTime, closeTime string) bool {
	parseMinutes := func(s string) (int, bool) {
		parts := strings.SplitN(s, ":", 2)
		if len(parts) != 2 {
			return 0, false
		}
		h, err1 := strconv.Atoi(parts[0])
		m, err2 := strconv.Atoi(parts[1])
		if err1 != nil || err2 != nil {
			return 0, false
		}
		return h*60 + m, true
	}
	openMin, okO := parseMinutes(openTime)
	closeMin, okC := parseMinutes(closeTime)
	if !okO || !okC {
		return true // fail-open if config is missing
	}
	now := time.Now()
	nowMin := now.Hour()*60 + now.Minute()
	return nowMin >= openMin && nowMin < closeMin
}
