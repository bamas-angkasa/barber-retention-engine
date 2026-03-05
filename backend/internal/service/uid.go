package service

import (
	"fmt"
	"math/rand"
)

// uid generates a short random alphanumeric ID (matches frontend uid() helper).
func UID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 10)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return fmt.Sprintf("%s", b)
}
