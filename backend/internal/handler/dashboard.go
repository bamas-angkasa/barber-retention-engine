package handler

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/barbershop/backend/internal/domain"
)

// ── GET /api/tenants/:tenant/dashboard/today ──────────────────────────────────

func (h *Handler) DashboardToday(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	today := time.Now().Format("2006-01-02")

	var customersToday int64
	h.DB.Model(&domain.QueueItem{}).
		Where("tenant_id = ? AND status = ? AND DATE(created_at) = ?", tenant.ID, domain.QueueDone, today).
		Count(&customersToday)

	var revenueResult struct{ Total int }
	h.DB.Model(&domain.QueueItem{}).
		Select("COALESCE(SUM(total_amount_idr), 0) as total").
		Where("tenant_id = ? AND status = ? AND is_paid = true AND DATE(created_at) = ?", tenant.ID, domain.QueueDone, today).
		Scan(&revenueResult)

	var activeQueue int64
	h.DB.Model(&domain.QueueItem{}).
		Where("tenant_id = ? AND status IN ? AND DATE(created_at) = ?", tenant.ID,
			[]domain.QueueStatus{domain.QueueWaiting, domain.QueueInService}, today).
		Count(&activeQueue)

	// Barber stats
	var barbers []domain.Barber
	h.DB.Where("tenant_id = ?", tenant.ID).Find(&barbers)

	type barberStats struct {
		BarberID string
		Count    int
		Revenue  int
	}
	var stats []barberStats
	h.DB.Model(&domain.QueueItem{}).
		Select("barber_id, COUNT(*) as count, COALESCE(SUM(total_amount_idr), 0) as revenue").
		Where("tenant_id = ? AND status = ? AND DATE(created_at) = ? AND barber_id IS NOT NULL", tenant.ID, domain.QueueDone, today).
		Group("barber_id").
		Scan(&stats)

	statsMap := make(map[string]barberStats)
	for _, s := range stats {
		statsMap[s.BarberID] = s
	}

	barberStatsOut := make([]domain.BarberStat, 0, len(barbers))
	for _, b := range barbers {
		s := statsMap[b.ID]
		barberStatsOut = append(barberStatsOut, domain.BarberStat{
			Barber:       b,
			ServedToday:  s.Count,
			RevenueToday: s.Revenue,
		})
	}

	return ok(c, domain.DashboardToday{
		CustomersToday: int(customersToday),
		RevenueToday:   revenueResult.Total,
		ActiveQueue:    int(activeQueue),
		BarberStats:    barberStatsOut,
	})
}

// ── GET /api/tenants/:tenant/dashboard/stats ──────────────────────────────────

func (h *Handler) DashboardStats(c echo.Context) error {
	tenant, err := h.resolveTenant(c)
	if err != nil {
		return apiErr(c, http.StatusNotFound, "TENANT_NOT_FOUND", "Barbershop not found")
	}

	// Last 7 days breakdown
	type dayRow struct {
		Day     string
		Count   int
		Revenue int
	}
	var dayRows []dayRow
	h.DB.Model(&domain.QueueItem{}).
		Select("TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as day, COUNT(*) as count, COALESCE(SUM(total_amount_idr), 0) as revenue").
		Where("tenant_id = ? AND status = ? AND created_at >= NOW() - INTERVAL '7 days'", tenant.ID, domain.QueueDone).
		Group("DATE_TRUNC('day', created_at)").
		Order("day ASC").
		Scan(&dayRows)

	last7Days := make([]domain.DayStats, 0, len(dayRows))
	for _, r := range dayRows {
		last7Days = append(last7Days, domain.DayStats{
			Date:    r.Day,
			Count:   r.Count,
			Revenue: r.Revenue,
		})
	}

	// Top barbers (all time)
	type barberRow struct {
		BarberID string
		Count    int
		Revenue  int
	}
	var barberRows []barberRow
	h.DB.Model(&domain.QueueItem{}).
		Select("barber_id, COUNT(*) as count, COALESCE(SUM(total_amount_idr), 0) as revenue").
		Where("tenant_id = ? AND status = ? AND barber_id IS NOT NULL", tenant.ID, domain.QueueDone).
		Group("barber_id").
		Order("count DESC").
		Limit(5).
		Scan(&barberRows)

	// Bulk-fetch barbers to avoid N+1 queries
	barberIDs := make([]string, 0, len(barberRows))
	for _, r := range barberRows {
		barberIDs = append(barberIDs, r.BarberID)
	}
	var barberList []domain.Barber
	if len(barberIDs) > 0 {
		h.DB.Where("id IN ?", barberIDs).Find(&barberList)
	}
	barberMap := make(map[string]domain.Barber, len(barberList))
	for _, b := range barberList {
		barberMap[b.ID] = b
	}
	topBarbers := make([]domain.BarberStat, 0, len(barberRows))
	for _, r := range barberRows {
		topBarbers = append(topBarbers, domain.BarberStat{
			Barber:       barberMap[r.BarberID],
			ServedToday:  r.Count,
			RevenueToday: r.Revenue,
		})
	}

	// Top services
	type svcRow struct {
		ServiceID string
		Count     int
		Revenue   int
	}
	var svcRows []svcRow
	h.DB.Model(&domain.QueueItem{}).
		Select("service_id, COUNT(*) as count, COALESCE(SUM(total_amount_idr), 0) as revenue").
		Where("tenant_id = ? AND status = ?", tenant.ID, domain.QueueDone).
		Group("service_id").
		Order("count DESC").
		Limit(5).
		Scan(&svcRows)

	// Bulk-fetch services to avoid N+1 queries
	svcIDs := make([]string, 0, len(svcRows))
	for _, r := range svcRows {
		svcIDs = append(svcIDs, r.ServiceID)
	}
	var svcList []domain.Service
	if len(svcIDs) > 0 {
		h.DB.Where("id IN ?", svcIDs).Find(&svcList)
	}
	svcMap := make(map[string]domain.Service, len(svcList))
	for _, s := range svcList {
		svcMap[s.ID] = s
	}
	topServices := make([]domain.ServiceStat, 0, len(svcRows))
	for _, r := range svcRows {
		topServices = append(topServices, domain.ServiceStat{
			Service: svcMap[r.ServiceID],
			Count:   r.Count,
			Revenue: r.Revenue,
		})
	}

	// Totals
	var totals struct {
		TotalRevenue   int
		TotalCustomers int
	}
	h.DB.Model(&domain.QueueItem{}).
		Select("COALESCE(SUM(total_amount_idr), 0) as total_revenue, COUNT(*) as total_customers").
		Where("tenant_id = ? AND status = ?", tenant.ID, domain.QueueDone).
		Scan(&totals)

	avgPerDay := 0.0
	if len(last7Days) > 0 {
		total := 0
		for _, d := range last7Days {
			total += d.Count
		}
		avgPerDay = float64(total) / float64(len(last7Days))
	}

	return ok(c, domain.DashboardStats{
		Last7Days:      last7Days,
		TopBarbers:     topBarbers,
		TopServices:    topServices,
		TotalRevenue:   totals.TotalRevenue,
		TotalCustomers: totals.TotalCustomers,
		AvgPerDay:      avgPerDay,
	})
}
