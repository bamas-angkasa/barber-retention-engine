package repository

import (
	"log"
	"os"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/barbershop/backend/internal/domain"
	"github.com/barbershop/backend/internal/service"
)

// SeedIfNeeded creates seed data for development when SEED_ON_START=true.
func SeedIfNeeded(db *gorm.DB) {
	if os.Getenv("SEED_ON_START") != "true" {
		return
	}

	var count int64
	db.Model(&domain.Tenant{}).Count(&count)
	if count > 0 {
		log.Println("Seed: tenants already exist, skipping")
		return
	}

	log.Println("Seed: creating cugo tenant...")

	pinHash, _ := bcrypt.GenerateFromPassword([]byte("1234"), bcrypt.DefaultCost)

	tenant := domain.Tenant{
		ID:        "tenant_cugo",
		Slug:      "cugo",
		Name:      "Cugo Barbershop",
		Address:   "Jl. Contoh No. 1, Jakarta",
		Phone:     "6281234567890",
		OpenTime:  "09:00",
		CloseTime: "20:00",
		PinHash:   string(pinHash),
	}
	db.Create(&tenant)

	barbers := []domain.Barber{
		{ID: "barber_andi", TenantID: tenant.ID, Name: "Andi", IsActive: true},
		{ID: "barber_budi", TenantID: tenant.ID, Name: "Budi", IsActive: true},
		{ID: "barber_cahyo", TenantID: tenant.ID, Name: "Cahyo", IsActive: false},
	}
	db.Create(&barbers)

	services := []domain.Service{
		{ID: "svc_reguler", TenantID: tenant.ID, Name: "Reguler Haircut", PriceIDR: 35000, DurationMin: 20},
		{ID: "svc_shave", TenantID: tenant.ID, Name: "Haircut + Shave", PriceIDR: 55000, DurationMin: 35},
		{ID: "svc_fade", TenantID: tenant.ID, Name: "Fade + Styling", PriceIDR: 65000, DurationMin: 40},
		{ID: "svc_kids", TenantID: tenant.ID, Name: "Kids Haircut", PriceIDR: 25000, DurationMin: 15},
	}
	db.Create(&services)

	// Seed customers
	now := time.Now()
	barberAndi := "barber_andi"
	barberBudi := "barber_budi"

	customers := []domain.Customer{
		{ID: "cust_1", TenantID: tenant.ID, Name: "Budi Santoso", PhoneRaw: "081234567890", PhoneNormalized: "6281234567890", VisitCount: 5, LastVisitAt: &now},
		{ID: "cust_2", TenantID: tenant.ID, Name: "Dedi Firmansyah", PhoneRaw: "082345678901", PhoneNormalized: "6282345678901", VisitCount: 3, LastVisitAt: &now},
		{ID: "cust_3", TenantID: tenant.ID, Name: "Eka Prasetyo", PhoneRaw: "083456789012", PhoneNormalized: "6283456789012", VisitCount: 1},
		{ID: "cust_4", TenantID: tenant.ID, Name: "Fajar Nugraha", PhoneRaw: "084567890123", PhoneNormalized: "6284567890123", VisitCount: 7, LastVisitAt: &now},
		{ID: "cust_5", TenantID: tenant.ID, Name: "Gilang Ramadan", PhoneRaw: "085678901234", PhoneNormalized: "6285678901234", VisitCount: 2},
	}
	db.Create(&customers)

	// Seed queue items
	completedAt := now.Add(-90 * time.Minute)
	calledAt1 := now.Add(-120 * time.Minute)
	calledAt2 := now.Add(-30 * time.Minute)

	queue := []domain.QueueItem{
		{
			ID: service.UID(), TenantID: tenant.ID,
			CustomerID: "cust_1", BarberID: &barberAndi, ServiceID: "svc_reguler",
			Status: domain.QueueDone, TicketNumber: 1, TicketToken: service.UID(),
			IsPaid: true, TotalAmountIDR: 35000,
			CreatedAt: now.Add(-150 * time.Minute), CalledAt: &calledAt1, CompletedAt: &completedAt,
		},
		{
			ID: service.UID(), TenantID: tenant.ID,
			CustomerID: "cust_2", BarberID: &barberBudi, ServiceID: "svc_shave",
			Status: domain.QueueDone, TicketNumber: 2, TicketToken: service.UID(),
			IsPaid: true, TotalAmountIDR: 55000,
			CreatedAt: now.Add(-100 * time.Minute), CalledAt: &calledAt2, CompletedAt: &completedAt,
		},
		{
			ID: service.UID(), TenantID: tenant.ID,
			CustomerID: "cust_3", BarberID: &barberAndi, ServiceID: "svc_fade",
			Status: domain.QueueInService, TicketNumber: 3, TicketToken: service.UID(),
			CreatedAt: now.Add(-40 * time.Minute), CalledAt: &now,
		},
		{
			ID: service.UID(), TenantID: tenant.ID,
			CustomerID: "cust_4", ServiceID: "svc_reguler",
			Status: domain.QueueWaiting, TicketNumber: 4, TicketToken: service.UID(),
			CreatedAt: now.Add(-20 * time.Minute),
		},
		{
			ID: service.UID(), TenantID: tenant.ID,
			CustomerID: "cust_5", ServiceID: "svc_kids",
			Status: domain.QueueWaiting, TicketNumber: 5, TicketToken: service.UID(),
			CreatedAt: now.Add(-10 * time.Minute),
		},
	}
	db.Create(&queue)

	// Seed bookings
	today := now.Format("2006-01-02")
	tomorrow := now.Add(24 * time.Hour).Format("2006-01-02")

	bookings := []domain.Booking{
		{
			ID: service.UID(), TenantID: tenant.ID,
			CustomerID: "cust_1", BarberID: &barberAndi, ServiceID: "svc_reguler",
			Status: domain.BookingUpcoming, ScheduledDate: today, ScheduledTime: "14:00",
			TicketToken: service.UID(),
		},
		{
			ID: service.UID(), TenantID: tenant.ID,
			CustomerID: "cust_2", ServiceID: "svc_shave",
			Status: domain.BookingUpcoming, ScheduledDate: today, ScheduledTime: "15:30",
			TicketToken: service.UID(),
		},
		{
			ID: service.UID(), TenantID: tenant.ID,
			CustomerID: "cust_3", BarberID: &barberBudi, ServiceID: "svc_fade",
			Status: domain.BookingDone, ScheduledDate: today, ScheduledTime: "10:00",
			TicketToken: service.UID(),
		},
		{
			ID: service.UID(), TenantID: tenant.ID,
			CustomerID: "cust_4", ServiceID: "svc_kids",
			Status: domain.BookingUpcoming, ScheduledDate: tomorrow, ScheduledTime: "11:00",
			TicketToken: service.UID(),
		},
	}
	db.Create(&bookings)

	log.Println("Seed: done!")
}
