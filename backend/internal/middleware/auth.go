package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

type JWTClaims struct {
	TenantID string `json:"tenantId"`
	Slug     string `json:"slug"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// RequireAuth validates the JWT token from Authorization header or cookie.
// It also checks that the token's slug matches the URL :tenant param.
func RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "dev-secret-change-me"
		}

		tokenStr := extractToken(c)
		if tokenStr == "" {
			return c.JSON(http.StatusUnauthorized, map[string]any{
				"error": map[string]string{
					"code":    "UNAUTHORIZED",
					"message": "Authentication required",
				},
			})
		}

		token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (any, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			return c.JSON(http.StatusUnauthorized, map[string]any{
				"error": map[string]string{
					"code":    "INVALID_TOKEN",
					"message": "Invalid or expired token",
				},
			})
		}

		claims, ok := token.Claims.(*JWTClaims)
		if !ok {
			return c.JSON(http.StatusUnauthorized, map[string]any{
				"error": map[string]string{
					"code":    "INVALID_TOKEN",
					"message": "Invalid token claims",
				},
			})
		}

		// Verify the token belongs to the requested tenant
		tenantSlug := c.Param("tenant")
		if tenantSlug != "" && claims.Slug != tenantSlug {
			return c.JSON(http.StatusForbidden, map[string]any{
				"error": map[string]string{
					"code":    "FORBIDDEN",
					"message": "Token does not match tenant",
				},
			})
		}

		c.Set("tenantId", claims.TenantID)
		c.Set("tenantSlug", claims.Slug)
		return next(c)
	}
}

func extractToken(c echo.Context) string {
	// Check Authorization: Bearer <token>
	auth := c.Request().Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	// Check cookie
	cookie, err := c.Cookie("admin_token")
	if err == nil && cookie.Value != "" {
		return cookie.Value
	}
	return ""
}
