package handler

import (
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"

	"github.com/barbershop/backend/internal/middleware"
)

// ── POST /api/tenants/:tenant/auth/login ─────────────────────────────────────

func (h *Handler) AdminLogin(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var req struct {
		Pin string `json:"pin"`
	}
	if err := c.Bind(&req); err != nil || req.Pin == "" {
		return apiErr(c, http.StatusBadRequest, "MISSING_PIN", "PIN is required")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(tenant.PinHash), []byte(req.Pin)); err != nil {
		return apiErr(c, http.StatusUnauthorized, "INVALID_PIN", "Invalid PIN")
	}

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

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return apiErr(c, http.StatusInternalServerError, "TOKEN_ERROR", "Failed to generate token")
	}

	// Set httpOnly cookie
	c.SetCookie(&http.Cookie{
		Name:     "admin_token",
		Value:    signed,
		HttpOnly: true,
		Path:     "/",
		MaxAge:   86400, // 24 hours
		SameSite: http.SameSiteLaxMode,
	})

	return ok(c, map[string]string{"token": signed})
}

// ── POST /api/tenants/:tenant/auth/change-pin ────────────────────────────────

func (h *Handler) ChangePin(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	var req struct {
		CurrentPin string `json:"currentPin"`
		NewPin     string `json:"newPin"`
		ConfirmPin string `json:"confirmPin"`
	}
	if err := c.Bind(&req); err != nil || req.CurrentPin == "" || req.NewPin == "" {
		return apiErr(c, http.StatusBadRequest, "MISSING_FIELDS", "currentPin, newPin, and confirmPin are required")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(tenant.PinHash), []byte(req.CurrentPin)); err != nil {
		return apiErr(c, http.StatusUnauthorized, "INVALID_PIN", "Current PIN is incorrect")
	}
	if len(req.NewPin) < 4 || len(req.NewPin) > 6 {
		return apiErr(c, http.StatusBadRequest, "INVALID_PIN", "New PIN must be 4–6 digits")
	}
	for _, ch := range req.NewPin {
		if ch < '0' || ch > '9' {
			return apiErr(c, http.StatusBadRequest, "INVALID_PIN", "PIN must contain digits only")
		}
	}
	if req.NewPin != req.ConfirmPin {
		return apiErr(c, http.StatusBadRequest, "PIN_MISMATCH", "PINs do not match")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPin), bcrypt.DefaultCost)
	if err != nil {
		return apiErr(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to process PIN")
	}
	h.DB.Model(tenant).Update("pin_hash", string(hash))
	return ok(c, map[string]string{"status": "pin_changed"})
}

// ── POST /api/tenants/:tenant/auth/logout ────────────────────────────────────

func (h *Handler) AdminLogout(c echo.Context) error {
	c.SetCookie(&http.Cookie{
		Name:     "admin_token",
		Value:    "",
		HttpOnly: true,
		Path:     "/",
		MaxAge:   -1,
	})
	return ok(c, map[string]string{"status": "logged_out"})
}
