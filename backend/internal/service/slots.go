package service

import (
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/barbershop/backend/internal/domain"
)

// GetAvailableSlots calculates available booking time slots.
//
//   - Generates 30-min slots from openTime to closeTime
//   - Each booked service blocks ceil(durationMin/30) consecutive slots per barber
//   - "Any barber" = at least one active barber has all required slots free
//   - Slots in the past for today are hidden
func GetAvailableSlots(
	date string, // "YYYY-MM-DD"
	openTime string, // "09:00"
	closeTime string, // "20:00"
	durationMin int, // service duration
	barberID *string, // nil = any barber
	activeBarbers []domain.Barber,
	existingBookings []domain.Booking, // bookings for this date (any barber/service filtered by caller)
	allServices []domain.Service, // for looking up service durations
) []domain.TimeSlot {

	slots := generateSlots(openTime, closeTime)
	slotsNeeded := int(math.Ceil(float64(durationMin) / 30.0))

	now := time.Now()
	isToday := date == now.Format("2006-01-02")

	result := make([]domain.TimeSlot, 0, len(slots))

	for i, slot := range slots {
		// Hide past slots for today
		if isToday {
			slotTime := parseSlotTime(date, slot)
			if slotTime.Before(now) {
				continue
			}
		}

		available := false
		if barberID != nil && *barberID != "" {
			// Check specific barber
			available = isBarberAvailable(*barberID, i, slotsNeeded, slots, existingBookings, allServices)
		} else {
			// Any barber — available if at least one active barber is free
			for _, b := range activeBarbers {
				if isBarberAvailable(b.ID, i, slotsNeeded, slots, existingBookings, allServices) {
					available = true
					break
				}
			}
		}

		result = append(result, domain.TimeSlot{
			Time:      slot,
			Available: available,
		})
	}

	return result
}

// generateSlots produces 30-min slot times between openTime and closeTime.
func generateSlots(openTime, closeTime string) []string {
	start := parseHHMM(openTime)
	end := parseHHMM(closeTime)

	var slots []string
	for t := start; t < end; t += 30 {
		h := t / 60
		m := t % 60
		slots = append(slots, fmt.Sprintf("%02d:%02d", h, m))
	}
	return slots
}

func parseHHMM(hhmm string) int {
	parts := strings.SplitN(hhmm, ":", 2)
	if len(parts) != 2 {
		return 0
	}
	h, m := 0, 0
	fmt.Sscanf(parts[0], "%d", &h)
	fmt.Sscanf(parts[1], "%d", &m)
	return h*60 + m
}

func parseSlotTime(date, slotHHMM string) time.Time {
	t, _ := time.ParseInLocation("2006-01-02 15:04", date+" "+slotHHMM, time.Local)
	return t
}

// isBarberAvailable checks if a barber has all slotsNeeded consecutive slots
// free starting at slotIndex.
func isBarberAvailable(
	barberID string,
	slotIndex int,
	slotsNeeded int,
	slots []string,
	bookings []domain.Booking,
	allServices []domain.Service,
) bool {
	if slotIndex+slotsNeeded > len(slots) {
		return false
	}

	// Build set of blocked slot indices for this barber
	blocked := make(map[int]bool)
	for _, b := range bookings {
		if b.Status == domain.BookingCancelled || b.Status == domain.BookingDone {
			continue
		}
		isForBarber := b.BarberID == nil || *b.BarberID == "" || *b.BarberID == barberID
		if !isForBarber {
			continue
		}
		// Find the start slot index for this booking
		bookingSlotIdx := -1
		for si, s := range slots {
			if s == b.ScheduledTime {
				bookingSlotIdx = si
				break
			}
		}
		if bookingSlotIdx < 0 {
			continue
		}
		// Find service duration
		svcDuration := 30
		for _, svc := range allServices {
			if svc.ID == b.ServiceID {
				svcDuration = svc.DurationMin
				break
			}
		}
		svcSlotsNeeded := int(math.Ceil(float64(svcDuration) / 30.0))
		for k := 0; k < svcSlotsNeeded; k++ {
			blocked[bookingSlotIdx+k] = true
		}
	}

	for k := 0; k < slotsNeeded; k++ {
		if blocked[slotIndex+k] {
			return false
		}
	}
	return true
}
