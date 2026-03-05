package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/barbershop/backend/internal/domain"
	"github.com/barbershop/backend/internal/service"
)

// ── POST /api/tenants/:tenant/services ────────────────────────────────────────

func (h *Handler) AddService(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var req domain.ServiceRequest
	if err := c.Bind(&req); err != nil {
		return apiErr(c, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
	}
	if req.Name == "" || req.PriceIDR <= 0 || req.DurationMin <= 0 {
		return apiErr(c, http.StatusBadRequest, "MISSING_FIELDS", "Name, price, and duration are required")
	}

	svc := domain.Service{
		ID:          service.UID(),
		TenantID:    tenant.ID,
		Name:        req.Name,
		PriceIDR:    req.PriceIDR,
		DurationMin: req.DurationMin,
	}
	h.DB.Create(&svc)
	return created(c, svc)
}

// ── PUT /api/tenants/:tenant/services/:serviceId ──────────────────────────────

func (h *Handler) UpdateService(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var svc domain.Service
	if err := h.DB.Where("id = ? AND tenant_id = ?", c.Param("serviceId"), tenant.ID).First(&svc).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Service not found")
	}

	var req domain.ServiceRequest
	if err := c.Bind(&req); err != nil {
		return apiErr(c, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
	}

	updates := map[string]any{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.PriceIDR > 0 {
		updates["price_idr"] = req.PriceIDR
	}
	if req.DurationMin > 0 {
		updates["duration_min"] = req.DurationMin
	}
	h.DB.Model(&svc).Updates(updates)
	return ok(c, svc)
}

// ── DELETE /api/tenants/:tenant/services/:serviceId ───────────────────────────

func (h *Handler) DeleteService(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var svc domain.Service
	if err := h.DB.Where("id = ? AND tenant_id = ?", c.Param("serviceId"), tenant.ID).First(&svc).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Service not found")
	}

	h.DB.Delete(&svc)
	return ok(c, map[string]string{"status": "DELETED"})
}
