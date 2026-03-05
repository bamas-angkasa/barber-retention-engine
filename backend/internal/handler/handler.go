package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/barbershop/backend/internal/domain"
)

const ctxTenantKey = "tenant"

// Handler holds the database reference shared by all route handlers.
type Handler struct {
	DB *gorm.DB
}

func New(db *gorm.DB) *Handler {
	return &Handler{DB: db}
}

// ── Response helpers ──────────────────────────────────────────────────────────

func ok(c echo.Context, data any) error {
	return c.JSON(http.StatusOK, map[string]any{"data": data})
}

func created(c echo.Context, data any) error {
	return c.JSON(http.StatusCreated, map[string]any{"data": data})
}

func apiErr(c echo.Context, status int, code, message string) error {
	return c.JSON(status, map[string]any{
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}

// ── Tenant middleware ─────────────────────────────────────────────────────────

// TenantMiddleware resolves the :tenant slug once per request and stores the
// result in the Echo context. All subsequent resolveTenant calls are zero-cost.
func (h *Handler) TenantMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		slug := c.Param("tenant")
		var tenant domain.Tenant
		if err := h.DB.Where("slug = ?", slug).First(&tenant).Error; err != nil {
			return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
		}
		c.Set(ctxTenantKey, &tenant)
		return next(c)
	}
}

// ── Tenant resolver ───────────────────────────────────────────────────────────

// resolveTenant reads the tenant from the Echo context (set by TenantMiddleware).
// Falls back to a DB lookup if the middleware was not applied.
func (h *Handler) resolveTenant(c echo.Context) (*domain.Tenant, error) {
	if t, ok := c.Get(ctxTenantKey).(*domain.Tenant); ok && t != nil {
		return t, nil
	}
	slug := c.Param("tenant")
	var tenant domain.Tenant
	if err := h.DB.Where("slug = ?", slug).First(&tenant).Error; err != nil {
		return nil, err
	}
	return &tenant, nil
}
