package domain

import "time"

// ── Tenant ────────────────────────────────────────────────────────────────────

type Tenant struct {
	ID            string    `gorm:"primaryKey" json:"id"`
	Slug          string    `gorm:"uniqueIndex;not null" json:"slug"`
	Name          string    `gorm:"not null" json:"name"`
	Address       string    `json:"address"`
	Phone         string    `json:"phone"`
	OpenTime      string    `gorm:"default:'09:00'" json:"openTime"`
	CloseTime     string    `gorm:"default:'20:00'" json:"closeTime"`
	IsQueuePaused bool      `gorm:"default:false" json:"isQueuePaused"`
	PinHash       string    `json:"-"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// ── Barber ────────────────────────────────────────────────────────────────────

type Barber struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	TenantID  string    `gorm:"index;not null" json:"tenantId"`
	Name      string    `gorm:"not null" json:"name"`
	IsActive  bool      `gorm:"default:true" json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ── Service ───────────────────────────────────────────────────────────────────

type Service struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	TenantID    string    `gorm:"index;not null" json:"tenantId"`
	Name        string    `gorm:"not null" json:"name"`
	PriceIDR    int       `gorm:"not null" json:"priceIDR"`
	DurationMin int       `gorm:"not null" json:"durationMin"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// ── Customer ──────────────────────────────────────────────────────────────────

type Customer struct {
	ID              string     `gorm:"primaryKey" json:"id"`
	TenantID        string     `gorm:"index;not null" json:"tenantId"`
	Name            string     `gorm:"not null" json:"name"`
	PhoneRaw        string     `json:"phoneRaw"`
	PhoneNormalized string     `gorm:"uniqueIndex:idx_tenant_phone;not null" json:"phoneNormalized"`
	LastVisitAt     *time.Time `json:"lastVisitAt"`
	VisitCount      int        `gorm:"default:0" json:"visitCount"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// ── QueueItem ─────────────────────────────────────────────────────────────────

type QueueStatus string

const (
	QueueWaiting   QueueStatus = "WAITING"
	QueueInService QueueStatus = "IN_SERVICE"
	QueueDone      QueueStatus = "DONE"
	QueueCancelled QueueStatus = "CANCELLED"
)

type QueueItem struct {
	ID             string      `gorm:"primaryKey" json:"id"`
	TenantID       string      `gorm:"index;not null" json:"tenantId"`
	CustomerID     string      `gorm:"not null" json:"customerId"`
	BarberID       *string     `json:"barberId"`
	ServiceID      string      `gorm:"not null" json:"serviceId"`
	Status         QueueStatus `gorm:"not null;default:'WAITING'" json:"status"`
	TicketNumber   int         `json:"ticketNumber"`
	TicketToken    string      `gorm:"uniqueIndex;not null" json:"ticketToken"`
	IsPaid         bool        `gorm:"default:false" json:"isPaid"`
	TotalAmountIDR int         `json:"totalAmountIDR"`
	CreatedAt      time.Time   `json:"createdAt"`
	CalledAt       *time.Time  `json:"calledAt"`
	CompletedAt    *time.Time  `json:"completedAt"`

	// Populated via joins (not stored in DB)
	Customer *Customer `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Barber   *Barber   `gorm:"foreignKey:BarberID" json:"barber,omitempty"`
	Service  *Service  `gorm:"foreignKey:ServiceID" json:"service,omitempty"`
}

// ── Booking ───────────────────────────────────────────────────────────────────

type BookingStatus string

const (
	BookingUpcoming   BookingStatus = "UPCOMING"
	BookingInProgress BookingStatus = "IN_PROGRESS"
	BookingDone       BookingStatus = "DONE"
	BookingCancelled  BookingStatus = "CANCELLED"
)

type Booking struct {
	ID            string        `gorm:"primaryKey" json:"id"`
	TenantID      string        `gorm:"index;not null" json:"tenantId"`
	CustomerID    string        `gorm:"not null" json:"customerId"`
	BarberID      *string       `json:"barberId"`
	ServiceID     string        `gorm:"not null" json:"serviceId"`
	Status        BookingStatus `gorm:"not null;default:'UPCOMING'" json:"status"`
	ScheduledDate string        `gorm:"not null" json:"scheduledDate"`
	ScheduledTime string        `gorm:"not null" json:"scheduledTime"`
	Notes         string        `json:"notes"`
	TicketToken   string        `gorm:"uniqueIndex;not null" json:"ticketToken"`
	CreatedAt     time.Time     `json:"createdAt"`
	ConfirmedAt   *time.Time    `json:"confirmedAt"`
	CompletedAt   *time.Time    `json:"completedAt"`

	// Populated via joins (not stored in DB)
	Customer *Customer `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Barber   *Barber   `gorm:"foreignKey:BarberID" json:"barber,omitempty"`
	Service  *Service  `gorm:"foreignKey:ServiceID" json:"service,omitempty"`
}

// ── Request/Response DTOs ─────────────────────────────────────────────────────

type TenantResponse struct {
	Tenant   *Tenant    `json:"tenant"`
	Barbers  []Barber   `json:"barbers"`
	Services []Service  `json:"services"`
}

type QueueStats struct {
	Waiting        int  `json:"waiting"`
	InService      int  `json:"inService"`
	DoneToday      int  `json:"doneToday"`
	ActiveBarbers  int  `json:"activeBarbers"`
	EstWaitMinutes int  `json:"estWaitMinutes"`
	IsPaused       bool `json:"isPaused"`
}

type QueueResponse struct {
	Stats QueueStats  `json:"stats"`
	Items []QueueItem `json:"items"`
}

type JoinQueueRequest struct {
	CustomerName string  `json:"customerName"`
	CustomerPhone string `json:"customerPhone"`
	ServiceID    string  `json:"serviceId"`
	BarberID     *string `json:"barberId"`
}

type CreateBookingRequest struct {
	CustomerName  string  `json:"customerName"`
	CustomerPhone string  `json:"customerPhone"`
	ServiceID     string  `json:"serviceId"`
	BarberID      *string `json:"barberId"`
	ScheduledDate string  `json:"scheduledDate"`
	ScheduledTime string  `json:"scheduledTime"`
	Notes         string  `json:"notes"`
}

type CompleteQueueRequest struct {
	IsPaid         bool `json:"isPaid"`
	TotalAmountIDR int  `json:"totalAmountIDR"`
}

type AdminLoginRequest struct {
	Pin string `json:"pin"`
}

type AdminLoginResponse struct {
	Token string `json:"token"`
}

type BarberRequest struct {
	Name string `json:"name"`
}

type ServiceRequest struct {
	Name        string `json:"name"`
	PriceIDR    int    `json:"priceIDR"`
	DurationMin int    `json:"durationMin"`
}

type SettingsRequest struct {
	Name      string `json:"name"`
	Address   string `json:"address"`
	Phone     string `json:"phone"`
	OpenTime  string `json:"openTime"`
	CloseTime string `json:"closeTime"`
}

type ChangePinRequest struct {
	CurrentPin string `json:"currentPin"`
	NewPin     string `json:"newPin"`
	ConfirmPin string `json:"confirmPin"`
}

type OnboardRequest struct {
	Slug       string `json:"slug"`
	Name       string `json:"name"`
	Address    string `json:"address"`
	Phone      string `json:"phone"`
	OpenTime   string `json:"openTime"`
	CloseTime  string `json:"closeTime"`
	Pin        string `json:"pin"`
	ConfirmPin string `json:"confirmPin"`
}

type DashboardToday struct {
	CustomersToday int           `json:"customersToday"`
	RevenueToday   int           `json:"revenueToday"`
	ActiveQueue    int           `json:"activeQueue"`
	BarberStats    []BarberStat  `json:"barberStats"`
}

type BarberStat struct {
	Barber       Barber `json:"barber"`
	ServedToday  int    `json:"servedToday"`
	RevenueToday int    `json:"revenueToday"`
}

type DayStats struct {
	Date     string `json:"date"`
	Count    int    `json:"count"`
	Revenue  int    `json:"revenue"`
}

type DashboardStats struct {
	Last7Days    []DayStats    `json:"last7Days"`
	TopBarbers   []BarberStat  `json:"topBarbers"`
	TopServices  []ServiceStat `json:"topServices"`
	TotalRevenue int           `json:"totalRevenue"`
	TotalCustomers int         `json:"totalCustomers"`
	AvgPerDay    float64       `json:"avgPerDay"`
}

type ServiceStat struct {
	Service Service `json:"service"`
	Count   int     `json:"count"`
	Revenue int     `json:"revenue"`
}

type TimeSlot struct {
	Time      string `json:"time"`
	Available bool   `json:"available"`
}

type SSEEvent struct {
	Type  string      `json:"type"`
	Stats *QueueStats `json:"stats,omitempty"`
	Items []QueueItem `json:"items,omitempty"`
}
