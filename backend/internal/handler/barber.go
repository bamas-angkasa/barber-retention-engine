package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/barbershop/backend/internal/domain"
	"github.com/barbershop/backend/internal/service"
)

// ── POST /api/tenants/:tenant/barbers ─────────────────────────────────────────

func (h *Handler) AddBarber(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var req domain.BarberRequest
	if err := c.Bind(&req); err != nil || req.Name == "" {
		return apiErr(c, http.StatusBadRequest, "MISSING_FIELDS", "Name is required")
	}

	barber := domain.Barber{
		ID:       service.UID(),
		TenantID: tenant.ID,
		Name:     req.Name,
		IsActive: true,
	}
	h.DB.Create(&barber)
	return created(c, barber)
}

// ── PUT /api/tenants/:tenant/barbers/:barberId ────────────────────────────────

func (h *Handler) UpdateBarber(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var barber domain.Barber
	if err := h.DB.Where("id = ? AND tenant_id = ?", c.Param("barberId"), tenant.ID).First(&barber).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Barber not found")
	}

	var req domain.BarberRequest
	if err := c.Bind(&req); err != nil || req.Name == "" {
		return apiErr(c, http.StatusBadRequest, "MISSING_FIELDS", "Name is required")
	}

	h.DB.Model(&barber).Update("name", req.Name)
	return ok(c, barber)
}

// ── DELETE /api/tenants/:tenant/barbers/:barberId ─────────────────────────────

func (h *Handler) DeleteBarber(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var barber domain.Barber
	if err := h.DB.Where("id = ? AND tenant_id = ?", c.Param("barberId"), tenant.ID).First(&barber).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Barber not found")
	}

	h.DB.Delete(&barber)
	return ok(c, map[string]string{"status": "DELETED"})
}

// ── POST /api/tenants/:tenant/barbers/:barberId/toggle ────────────────────────

func (h *Handler) ToggleBarber(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var barber domain.Barber
	if err := h.DB.Where("id = ? AND tenant_id = ?", c.Param("barberId"), tenant.ID).First(&barber).Error; err != nil {
		return apiErr(c, http.StatusNotFound, "NOT_FOUND", "Barber not found")
	}

	h.DB.Model(&barber).Update("is_active", !barber.IsActive)
	barber.IsActive = !barber.IsActive
	return ok(c, barber)
}
