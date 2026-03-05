package handler

import (
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"

	"github.com/barbershop/backend/internal/domain"
	"github.com/barbershop/backend/internal/middleware"
	"github.com/barbershop/backend/internal/service"
)

var slugRe = regexp.MustCompile(`^[a-z0-9][a-z0-9-]*[a-z0-9]$`)

// GET /api/tenants/:tenant
func (h *Handler) GetTenant(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var barbers []domain.Barber
	h.DB.Where("tenant_id = ?", tenant.ID).Find(&barbers)

	var services []domain.Service
	h.DB.Where("tenant_id = ?", tenant.ID).Find(&services)

	return ok(c, domain.TenantResponse{
		Tenant:   tenant,
		Barbers:  barbers,
		Services: services,
	})
}

// GET /api/tenants/:tenant/settings
func (h *Handler) GetSettings(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}
	return ok(c, tenant)
}

// GET /api/onboard/check-slug?slug=xxx
func (h *Handler) CheckSlug(c echo.Context) error {
	slug := strings.ToLower(strings.TrimSpace(c.QueryParam("slug")))
	if len(slug) < 3 || len(slug) > 30 || !slugRe.MatchString(slug) {
		return ok(c, map[string]bool{"available": false})
	}
	var existing domain.Tenant
	available := h.DB.Where("slug = ?", slug).First(&existing).Error != nil
	return ok(c, map[string]bool{"available": available})
}

// POST /api/onboard
func (h *Handler) OnboardTenant(c echo.Context) error {
	var req domain.OnboardRequest
	if err := c.Bind(&req); err != nil {
		return apiErr(c, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
	}

	slug := strings.ToLower(strings.TrimSpace(req.Slug))
	if len(slug) < 3 || len(slug) > 30 || !slugRe.MatchString(slug) {
		return apiErr(c, http.StatusBadRequest, "INVALID_SLUG", "Slug must be 3–30 lowercase letters, numbers, or hyphens")
	}
	if strings.TrimSpace(req.Name) == "" {
		return apiErr(c, http.StatusBadRequest, "MISSING_NAME", "Shop name is required")
	}
	if len(req.Pin) < 4 || len(req.Pin) > 6 {
		return apiErr(c, http.StatusBadRequest, "INVALID_PIN", "PIN must be 4–6 digits")
	}
	for _, ch := range req.Pin {
		if ch < '0' || ch > '9' {
			return apiErr(c, http.StatusBadRequest, "INVALID_PIN", "PIN must contain digits only")
		}
	}
	if req.Pin != req.ConfirmPin {
		return apiErr(c, http.StatusBadRequest, "PIN_MISMATCH", "PINs do not match")
	}

	// Check slug availability
	var existing domain.Tenant
	if h.DB.Where("slug = ?", slug).First(&existing).Error == nil {
		return apiErr(c, http.StatusConflict, "SLUG_TAKEN", "This URL is already taken, please choose another")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Pin), bcrypt.DefaultCost)
	if err != nil {
		return apiErr(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to process PIN")
	}

	openTime := req.OpenTime
	if openTime == "" {
		openTime = "09:00"
	}
	closeTime := req.CloseTime
	if closeTime == "" {
		closeTime = "20:00"
	}

	tenant := domain.Tenant{
		ID:        service.UID(),
		Slug:      slug,
		Name:      strings.TrimSpace(req.Name),
		Address:   strings.TrimSpace(req.Address),
		Phone:     strings.TrimSpace(req.Phone),
		OpenTime:  openTime,
		CloseTime: closeTime,
		PinHash:   string(hash),
	}
	if err := h.DB.Create(&tenant).Error; err != nil {
		return apiErr(c, http.StatusConflict, "SLUG_TAKEN", "This URL is already taken, please choose another")
	}

	// Auto-login: issue JWT
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-secret-change-me"
	}
	claims := middleware.JWTClaims{
		TenantID: tenant.ID,
		Slug:     tenant.Slug,
		Role:     "OWNER",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString([]byte(secret))
	if err != nil {
		return apiErr(c, http.StatusInternalServerError, "TOKEN_ERROR", "Failed to generate token")
	}

	c.SetCookie(&http.Cookie{
		Name:     "admin_token",
		Value:    signed,
		HttpOnly: true,
		Path:     "/",
		MaxAge:   86400,
		SameSite: http.SameSiteLaxMode,
	})

	return c.JSON(http.StatusCreated, map[string]any{
		"data": map[string]any{
			"tenant": tenant,
			"token":  signed,
		},
	})
}

// PUT /api/tenants/:tenant/settings
func (h *Handler) UpdateSettings(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var req domain.SettingsRequest
	if err := c.Bind(&req); err != nil {
		return apiErr(c, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
	}

	if req.Name != "" {
		tenant.Name = req.Name
	}
	tenant.Address = req.Address
	tenant.Phone = req.Phone
	if req.OpenTime != "" {
		tenant.OpenTime = req.OpenTime
	}
	if req.CloseTime != "" {
		tenant.CloseTime = req.CloseTime
	}

	h.DB.Save(tenant)
	return ok(c, tenant)
}
