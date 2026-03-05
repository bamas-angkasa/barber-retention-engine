package handler

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/barbershop/backend/internal/domain"
	"github.com/barbershop/backend/internal/service"
)

// ── GET /api/tenants/:tenant/bookings ─────────────────────────────────────────

func (h *Handler) ListBookings(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	date := c.QueryParam("date")
	showAll := c.QueryParam("all") == "1"

	query := h.DB.Where("tenant_id = ?", tenant.ID).
		Preload("Customer").Preload("Barber").Preload("Service").
		Order("scheduled_date ASC, scheduled_time ASC")

	if !showAll && date != "" {
		query = query.Where("scheduled_date = ?", date)
	} else if !showAll {
		query = query.Where("scheduled_date = ?", time.Now().Format("2006-01-02"))
	}

	var bookings []domain.Booking
	query.Find(&bookings)

	return ok(c, bookings)
}

// ── POST /api/tenants/:tenant/bookings ────────────────────────────────────────

func (h *Handler) CreateBooking(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var req domain.CreateBookingRequest
	if err := c.Bind(&req); err != nil {
		return apiErr(c, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
	}
	if req.CustomerName == "" || req.CustomerPhone == "" || req.ServiceID == "" ||
		req.ScheduledDate == "" || req.ScheduledTime == "" {
		return apiErr(c, http.StatusBadRequest, "MISSING_FIELDS", "Required fields missing")
	}

	// Validate service
	var svc domain.Service
	if err := h.DB.Where("id = ? AND tenant_id = ?", req.ServiceID, tenant.ID).First(&svc).Error; err != nil {
		return apiErr(c, http.StatusBadRequest, "INVALID_SERVICE", "Service not found")
	}

	customer, err := h.upsertCustomer(tenant.ID, req.CustomerName, req.CustomerPhone)
	if err != nil {
		return apiErr(c, http.StatusInternalServerError, "CUSTOMER_ERROR", "Failed to register customer")
	}

	booking := domain.Booking{
		ID:            service.UID(),
		TenantID:      tenant.ID,
		CustomerID:    customer.ID,
		BarberID:      req.BarberID,
		ServiceID:     req.ServiceID,
		Status:        domain.BookingUpcoming,
		ScheduledDate: req.ScheduledDate,
		ScheduledTime: req.ScheduledTime,
		Notes:         req.Notes,
		TicketToken:   service.UID(),
	}
	h.DB.Create(&booking)
	h.DB.Preload("Customer").Preload("Barber").Preload("Service").First(&booking, "id = ?", booking.ID)

	return created(c, booking)
}

// ── GET /api/tenants/:tenant/bookings/slots ───────────────────────────────────

func (h *Handler) GetSlots(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	date := c.QueryParam("date")
	if date == "" {
		return apiErr(c, http.StatusBadRequest, "MISSING_DATE", "date query param is required")
	}
	barberIDParam := c.QueryParam("barberId")
	serviceIDParam := c.QueryParam("serviceId")

	var barberID *string
	if barberIDParam != "" && barberIDParam != "any" {
		barberID = &barberIDParam
	}

	durationMin := 30
	if serviceIDParam != "" {
		var svc domain.Service
		if h.DB.Where("id = ? AND tenant_id = ?", serviceIDParam, tenant.ID).First(&svc).Error == nil {
			durationMin = svc.DurationMin
		}
	}

	var activeBarbers []domain.Barber
	h.DB.Where("tenant_id = ? AND is_active = true", tenant.ID).Find(&activeBarbers)

	var bookings []domain.Booking
	h.DB.Where("tenant_id = ? AND scheduled_date = ? AND status NOT IN ?",
		tenant.ID, date, []domain.BookingStatus{domain.BookingCancelled}).
		Find(&bookings)

	var allServices []domain.Service
	h.DB.Where("tenant_id = ?", tenant.ID).Find(&allServices)

	slots := service.GetAvailableSlots(
		date,
		tenant.OpenTime,
		tenant.CloseTime,
		durationMin,
		barberID,
		activeBarbers,
		bookings,
		allServices,
	)

	return ok(c, slots)
}

// ── POST /api/tenants/:tenant/bookings/:bookingId/confirm ─────────────────────

func (h *Handler) ConfirmBooking(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var booking domain.Booking
	if err := h.DB.Where("id = ? AND tenant_id = ?", c.Param("bookingId"), tenant.ID).
		Preload("Customer").Preload("Service").
		First(&booking).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Booking not found")
	}

	now := time.Now()
	h.DB.Model(&booking).Updates(map[string]any{
		"status":       domain.BookingInProgress,
		"confirmed_at": now,
	})

	waLink := service.BuildWALink(
		booking.Customer.PhoneNormalized,
		tenant.Name,
		booking.Customer.Name,
		booking.ScheduledDate,
		booking.ScheduledTime,
		booking.Service.Name,
	)

	return ok(c, map[string]any{
		"booking": booking,
		"waLink":  waLink,
	})
}

// ── POST /api/tenants/:tenant/bookings/:bookingId/cancel ──────────────────────

func (h *Handler) CancelBooking(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var booking domain.Booking
	if err := h.DB.Where("id = ? AND tenant_id = ?", c.Param("bookingId"), tenant.ID).First(&booking).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Booking not found")
	}
	if booking.Status == domain.BookingDone || booking.Status == domain.BookingCancelled {
		return apiErr(c, http.StatusBadRequest, "INVALID_STATUS", "Cannot cancel a completed/cancelled booking")
	}

	h.DB.Model(&booking).Update("status", domain.BookingCancelled)
	return ok(c, map[string]string{"status": "CANCELLED"})
}

// ── POST /api/tenants/:tenant/bookings/:bookingId/complete ────────────────────

func (h *Handler) CompleteBooking(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var booking domain.Booking
	if err := h.DB.Where("id = ? AND tenant_id = ?", c.Param("bookingId"), tenant.ID).First(&booking).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Booking not found")
	}

	now := time.Now()
	h.DB.Model(&booking).Updates(map[string]any{
		"status":       domain.BookingDone,
		"completed_at": now,
	})
	return ok(c, map[string]string{"status": "DONE"})
}
