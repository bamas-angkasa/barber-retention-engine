package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/barbershop/backend/internal/domain"
)

// ── GET /api/tenants/:tenant/customers ────────────────────────────────────────

func (h *Handler) ListCustomers(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var customers []domain.Customer
	h.DB.Where("tenant_id = ?", tenant.ID).
		Order("visit_count DESC, last_visit_at DESC NULLS LAST").
		Find(&customers)

	return ok(c, customers)
}
