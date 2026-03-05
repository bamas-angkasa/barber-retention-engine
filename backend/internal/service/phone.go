package service

import (
	"regexp"
	"strings"
)

var nonDigit = regexp.MustCompile(`[^\d]`)

// NormalizePhone converts Indonesian phone numbers to 628xxxxxxxxx format.
// Input can be: 08xxx, +628xxx, 628xxx, (08)xxx-xxx, etc.
func NormalizePhone(raw string) string {
	// Strip all non-digit characters except leading +
	stripped := strings.TrimSpace(raw)
	// Remove spaces, dashes, parentheses
	stripped = nonDigit.ReplaceAllString(stripped, "")

	switch {
	case strings.HasPrefix(stripped, "0"):
		// 08xxx → 628xxx
		return "62" + stripped[1:]
	case strings.HasPrefix(stripped, "62"):
		// Already 628xxx
		return stripped
	default:
		return stripped
	}
}
