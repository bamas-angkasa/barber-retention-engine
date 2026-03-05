package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/barbershop/backend/internal/service"
)

// ── GET /api/tenants/:tenant/queue/stream ─────────────────────────────────────

func (h *Handler) QueueStream(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	w := c.Response()
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)

	ch := service.DefaultHub.Subscribe(tenant.ID)
	defer service.DefaultHub.Unsubscribe(tenant.ID, ch)

	// Send current state immediately on connect
	items, stats := h.getQueueData(tenant)
	initialEvent := map[string]any{
		"type":  "QUEUE_UPDATE",
		"stats": stats,
		"items": items,
	}
	if b, err := json.Marshal(initialEvent); err == nil {
		fmt.Fprintf(w, "data: %s\n\n", b)
		w.Flush()
	}

	ctx := c.Request().Context()
	for {
		select {
		case <-ctx.Done():
			return nil
		case event, ok := <-ch:
			if !ok {
				return nil
			}
			b, err := json.Marshal(event)
			if err != nil {
				continue
			}
			if _, err := fmt.Fprintf(w, "data: %s\n\n", b); err != nil {
				return nil
			}
			w.Flush()
		}
	}
}
