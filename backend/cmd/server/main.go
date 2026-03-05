package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	echomid "github.com/labstack/echo/v4/middleware"

	"github.com/barbershop/backend/internal/handler"
	"github.com/barbershop/backend/internal/middleware"
	"github.com/barbershop/backend/internal/repository"
)

func main() {
	// Load .env file if present (dev mode)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Init database
	db := repository.InitDB()
	repository.SeedIfNeeded(db)

	// Create Echo instance
	e := echo.New()
	e.HideBanner = true

	// Global middleware
	e.Use(echomid.Logger())
	e.Use(echomid.Recover())
	e.Use(echomid.CORSWithConfig(echomid.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	h := handler.New(db)
	auth := middleware.RequireAuth

	// Rate limiter for public write endpoints (per IP, 10 req/s, burst 20).
	publicWriteLimiter := echomid.RateLimiterWithConfig(echomid.RateLimiterConfig{
		Store: echomid.NewRateLimiterMemoryStoreWithConfig(
			echomid.RateLimiterMemoryStoreConfig{
				Rate:      10,
				Burst:     20,
				ExpiresIn: 3 * time.Minute,
			},
		),
		IdentifierExtractor: func(c echo.Context) (string, error) {
			return c.RealIP(), nil
		},
		DenyHandler: func(c echo.Context, id string, err error) error {
			return c.JSON(http.StatusTooManyRequests, map[string]any{
				"error": map[string]string{
					"code":    "RATE_LIMIT",
					"message": "Too many requests, please slow down",
				},
			})
		},
	})

	// ── Routes ────────────────────────────────────────────────────────────────

	// Onboarding (no tenant middleware — creates new tenants)
	e.GET("/api/onboard/check-slug", h.CheckSlug)
	e.POST("/api/onboard", publicWriteLimiter(h.OnboardTenant))

	api := e.Group("/api/tenants/:tenant")

	// Resolve tenant once per request — all handlers read from context at zero cost.
	api.Use(h.TenantMiddleware)

	// Tenant info + settings
	api.GET("", h.GetTenant)
	api.GET("/settings", h.GetSettings)
	api.PUT("/settings", auth(h.UpdateSettings))

	// Queue
	api.GET("/queue", h.ListQueue)
	api.POST("/queue/join", publicWriteLimiter(h.JoinQueue))
	api.POST("/queue/pause", auth(h.PauseQueue))
	api.POST("/queue/resume", auth(h.ResumeQueue))
	api.GET("/queue/my-ticket", h.GetMyTicket)
	api.POST("/queue/my-ticket/cancel", h.CancelMyTicket)
	api.GET("/queue/stream", h.QueueStream)
	api.POST("/queue/:queueItemId/start", auth(h.StartQueue))
	api.POST("/queue/:queueItemId/complete", auth(h.CompleteQueue))
	api.POST("/queue/:queueItemId/cancel", auth(h.CancelQueue))

	// Bookings
	api.GET("/bookings", auth(h.ListBookings))
	api.POST("/bookings", publicWriteLimiter(h.CreateBooking))
	api.GET("/bookings/slots", h.GetSlots)
	api.POST("/bookings/:bookingId/confirm", auth(h.ConfirmBooking))
	api.POST("/bookings/:bookingId/cancel", auth(h.CancelBooking))
	api.POST("/bookings/:bookingId/complete", auth(h.CompleteBooking))

	// Dashboard
	api.GET("/dashboard/today", auth(h.DashboardToday))
	api.GET("/dashboard/stats", auth(h.DashboardStats))

	// Customers
	api.GET("/customers", auth(h.ListCustomers))

	// Barbers
	api.POST("/barbers", auth(h.AddBarber))
	api.PUT("/barbers/:barberId", auth(h.UpdateBarber))
	api.DELETE("/barbers/:barberId", auth(h.DeleteBarber))
	api.POST("/barbers/:barberId/toggle", auth(h.ToggleBarber))

	// Services
	api.POST("/services", auth(h.AddService))
	api.PUT("/services/:serviceId", auth(h.UpdateService))
	api.DELETE("/services/:serviceId", auth(h.DeleteService))

	// Auth
	api.POST("/auth/login", h.AdminLogin)
	api.POST("/auth/logout", h.AdminLogout)
	api.POST("/auth/change-pin", auth(h.ChangePin))

	// ── Start server ──────────────────────────────────────────────────────────
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Starting server on :%s", port)
	if err := e.Start(":" + port); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}
