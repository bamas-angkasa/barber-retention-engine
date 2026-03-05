package service

import (
	"fmt"
	"net/url"
)

// BuildWALink generates a wa.me link with a pre-filled message for booking confirmation.
func BuildWALink(phoneNormalized, shopName, customerName, scheduledDate, scheduledTime, serviceName string) string {
	msg := fmt.Sprintf(
		"Halo %s! Booking kamu di %s telah dikonfirmasi.\n\n"+
			"Detail:\n- Layanan: %s\n- Tanggal: %s\n- Jam: %s\n\nTerima kasih!",
		customerName, shopName, serviceName, scheduledDate, scheduledTime,
	)
	return fmt.Sprintf("https://wa.me/%s?text=%s", phoneNormalized, url.QueryEscape(msg))
}

// BuildQueueCallWALink generates a wa.me link to notify a customer that it's their turn.
func BuildQueueCallWALink(phoneNormalized, shopName, customerName string, ticketNumber int) string {
	msg := fmt.Sprintf(
		"Halo %s! Giliran kamu di %s sekarang.\n\nNomor antrian: #%03d\n\nSilakan segera ke kursi ya!",
		customerName, shopName, ticketNumber,
	)
	return fmt.Sprintf("https://wa.me/%s?text=%s", phoneNormalized, url.QueryEscape(msg))
}
