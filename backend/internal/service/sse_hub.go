package service

import (
	"sync"

	"github.com/barbershop/backend/internal/domain"
)

// SSEHub manages Server-Sent Event subscribers per tenant.
type SSEHub struct {
	mu          sync.RWMutex
	subscribers map[string][]chan domain.SSEEvent
}

var DefaultHub = &SSEHub{
	subscribers: make(map[string][]chan domain.SSEEvent),
}

// Subscribe returns a channel that receives SSE events for the given tenant.
// The caller must call Unsubscribe when done.
func (h *SSEHub) Subscribe(tenantID string) chan domain.SSEEvent {
	ch := make(chan domain.SSEEvent, 8)
	h.mu.Lock()
	h.subscribers[tenantID] = append(h.subscribers[tenantID], ch)
	h.mu.Unlock()
	return ch
}

// Unsubscribe removes a subscriber channel for the given tenant.
func (h *SSEHub) Unsubscribe(tenantID string, ch chan domain.SSEEvent) {
	h.mu.Lock()
	defer h.mu.Unlock()
	subs := h.subscribers[tenantID]
	for i, s := range subs {
		if s == ch {
			h.subscribers[tenantID] = append(subs[:i], subs[i+1:]...)
			close(ch)
			return
		}
	}
}

// Broadcast sends an event to all subscribers of the given tenant.
func (h *SSEHub) Broadcast(tenantID string, event domain.SSEEvent) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, ch := range h.subscribers[tenantID] {
		select {
		case ch <- event:
		default:
			// Drop if subscriber is slow
		}
	}
}
