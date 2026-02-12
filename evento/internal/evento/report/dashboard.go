package report

import (
	"net/http"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/labstack/echo/v4"
)

type dashboardConfig struct {
	PassWindowMinutes     int `json:"passWindowMinutes"`
	TopItemsLimit         int `json:"topItemsLimit"`
	AnomalyThreshold      int `json:"anomalyThreshold"`
	OverloadPercentRed    int `json:"overloadPercentRed"`
	OverloadPercentYellow int `json:"overloadPercentYellow"`
}

type dashboardSummary struct {
	MembersTotal       int64 `json:"membersTotal"`
	MembersPrinted     int64 `json:"membersPrinted"`
	MembersBangleGiven int64 `json:"membersBangleGiven"`
	MembersBlocked     int64 `json:"membersBlocked"`
	MembersWaiting     int64 `json:"membersWaiting"`
	AutosTotal         int64 `json:"autosTotal"`
	AutosPassMount     int64 `json:"autosPassMount"`
	AutosPassUnmount   int64 `json:"autosPassUnmount"`
	AutosWaiting       int64 `json:"autosWaiting"`
}

type namedCount struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

type companyLimitStats struct {
	CompanyID         string `json:"companyId"`
	CompanyName       string `json:"companyName"`
	MembersLimit      uint   `json:"membersLimit"`
	MembersCount      int64  `json:"membersCount"`
	MembersWaiting    int64  `json:"membersWaiting"`
	MembersOverLimit  int64  `json:"membersOverLimit"`
	MembersUsagePct   int    `json:"membersUsagePct"`
	AutosLimit        uint   `json:"autosLimit"`
	AutosCount        int64  `json:"autosCount"`
	AutosWaiting      int64  `json:"autosWaiting"`
	AutosOverLimit    int64  `json:"autosOverLimit"`
	AutosUsagePct     int    `json:"autosUsagePct"`
	HighestUsageLevel int    `json:"highestUsageLevel"`
}

type passActivity struct {
	MemberID   string    `json:"memberId"`
	MemberName string    `json:"memberName"`
	Company    string    `json:"company"`
	Gate       string    `json:"gate"`
	Passes     int64     `json:"passes"`
	LastPassAt time.Time `json:"lastPassAt"`
}

type dashboardResponse struct {
	GeneratedAt         time.Time           `json:"generatedAt"`
	Config              dashboardConfig     `json:"config"`
	Summary             dashboardSummary    `json:"summary"`
	MembersByAccred     []namedCount        `json:"membersByAccreditation"`
	PassesByGate        []namedCount        `json:"passesByGate"`
	CompaniesByLimits   []companyLimitStats `json:"companiesByLimits"`
	TopPassActivity     []passActivity      `json:"topPassActivity"`
	PassesWindowStarted time.Time           `json:"passesWindowStarted"`
}

func dashboard(c echo.Context) error {
	passWindowMinutes := dashboardSettings.PassWindowMinutes
	topItemsLimit := dashboardSettings.TopItemsLimit
	anomalyThreshold := dashboardSettings.AnomalyThreshold
	if passWindowMinutes <= 0 {
		passWindowMinutes = 120
	}
	if topItemsLimit <= 0 {
		topItemsLimit = 15
	}
	if anomalyThreshold <= 0 {
		anomalyThreshold = 5
	}

	response := dashboardResponse{
		GeneratedAt:       time.Now(),
		MembersByAccred:   make([]namedCount, 0),
		PassesByGate:      make([]namedCount, 0),
		CompaniesByLimits: make([]companyLimitStats, 0),
		TopPassActivity:   make([]passActivity, 0),
		Config: dashboardConfig{
			PassWindowMinutes:     passWindowMinutes,
			TopItemsLimit:         topItemsLimit,
			AnomalyThreshold:      anomalyThreshold,
			OverloadPercentRed:    dashboardSettings.OverloadPercentRed,
			OverloadPercentYellow: dashboardSettings.OverloadPercentYellow,
		},
	}

	db.Model(&model.Member{}).Count(&response.Summary.MembersTotal)
	db.Model(&model.Member{}).Where("print_count > 0").Count(&response.Summary.MembersPrinted)
	db.Model(&model.Member{}).Where("given_bangle = ?", true).Count(&response.Summary.MembersBangleGiven)
	db.Model(&model.Member{}).Where("blocked = ?", true).Count(&response.Summary.MembersBlocked)
	db.Model(&model.Member{}).Where("state = ?", "waiting").Count(&response.Summary.MembersWaiting)
	db.Model(&model.Auto{}).Count(&response.Summary.AutosTotal)
	db.Model(&model.Auto{}).Where("pass = ?", true).Count(&response.Summary.AutosPassMount)
	db.Model(&model.Auto{}).Where("pass2 = ?", true).Count(&response.Summary.AutosPassUnmount)
	db.Model(&model.Auto{}).Where("state = ?", "waiting").Count(&response.Summary.AutosWaiting)

	db.Raw(`
		SELECT COALESCE(a.name, 'Без аккредитации') AS name, COUNT(m.id) AS count
		FROM members m
		LEFT JOIN accreditations a ON a.id = m.accreditation_id AND a.deleted_at IS NULL
		WHERE m.deleted_at IS NULL
		GROUP BY COALESCE(a.name, 'Без аккредитации')
		ORDER BY count DESC
		LIMIT ?
	`, topItemsLimit).Scan(&response.MembersByAccred)

	passesWindowStart := time.Now().Add(-time.Duration(passWindowMinutes) * time.Minute)
	response.PassesWindowStarted = passesWindowStart

	db.Raw(`
		SELECT COALESCE(g.name, 'Без зоны') AS name, COUNT(mp.id) AS count
		FROM member_passes mp
		LEFT JOIN gates g ON g.id = mp.gate_id AND g.deleted_at IS NULL
		WHERE mp.deleted_at IS NULL
		  AND mp.created_at >= ?
		GROUP BY COALESCE(g.name, 'Без зоны')
		ORDER BY count DESC
		LIMIT ?
	`, passesWindowStart, topItemsLimit).Scan(&response.PassesByGate)

	db.Raw(`
		SELECT
			c.id AS company_id,
			c.name AS company_name,
			c.members_limit AS members_limit,
			COALESCE(m_stats.total, 0) AS members_count,
			COALESCE(m_stats.waiting, 0) AS members_waiting,
			c.cars_limit AS autos_limit,
			COALESCE(a_stats.total, 0) AS autos_count,
			COALESCE(a_stats.waiting, 0) AS autos_waiting
		FROM companies c
		LEFT JOIN (
			SELECT company_id, COUNT(*) AS total, SUM(CASE WHEN state = 'waiting' THEN 1 ELSE 0 END) AS waiting
			FROM members
			WHERE deleted_at IS NULL
			GROUP BY company_id
		) m_stats ON m_stats.company_id = c.id
		LEFT JOIN (
			SELECT company_id, COUNT(*) AS total, SUM(CASE WHEN state = 'waiting' THEN 1 ELSE 0 END) AS waiting
			FROM autos
			WHERE deleted_at IS NULL
			GROUP BY company_id
		) a_stats ON a_stats.company_id = c.id
		WHERE c.deleted_at IS NULL
		ORDER BY members_count DESC, autos_count DESC
		LIMIT ?
	`, topItemsLimit).Scan(&response.CompaniesByLimits)

	for index, row := range response.CompaniesByLimits {
		if row.MembersLimit > 0 {
			response.CompaniesByLimits[index].MembersUsagePct = int((float64(row.MembersCount) * 100) / float64(row.MembersLimit))
			if row.MembersCount > int64(row.MembersLimit) {
				response.CompaniesByLimits[index].MembersOverLimit = row.MembersCount - int64(row.MembersLimit)
			}
		}
		if row.AutosLimit > 0 {
			response.CompaniesByLimits[index].AutosUsagePct = int((float64(row.AutosCount) * 100) / float64(row.AutosLimit))
			if row.AutosCount > int64(row.AutosLimit) {
				response.CompaniesByLimits[index].AutosOverLimit = row.AutosCount - int64(row.AutosLimit)
			}
		}
		if response.CompaniesByLimits[index].MembersUsagePct >= response.CompaniesByLimits[index].AutosUsagePct {
			response.CompaniesByLimits[index].HighestUsageLevel = response.CompaniesByLimits[index].MembersUsagePct
		} else {
			response.CompaniesByLimits[index].HighestUsageLevel = response.CompaniesByLimits[index].AutosUsagePct
		}
	}

	db.Raw(`
		SELECT
			m.id AS member_id,
			TRIM(m.surname || ' ' || m.name || ' ' || m.middlename) AS member_name,
			COALESCE(c.name, '') AS company,
			COALESCE(g.name, 'Без зоны') AS gate,
			COUNT(mp.id) AS passes,
			MAX(mp.created_at) AS last_pass_at
		FROM member_passes mp
		JOIN members m ON m.id = mp.member_id AND m.deleted_at IS NULL
		LEFT JOIN companies c ON c.id = m.company_id AND c.deleted_at IS NULL
		LEFT JOIN gates g ON g.id = mp.gate_id AND g.deleted_at IS NULL
		WHERE mp.deleted_at IS NULL
		  AND mp.created_at >= ?
		GROUP BY m.id, m.surname, m.name, m.middlename, c.name, g.name
		HAVING COUNT(mp.id) >= ?
		ORDER BY passes DESC, last_pass_at DESC
		LIMIT ?
	`, passesWindowStart, anomalyThreshold, topItemsLimit).Scan(&response.TopPassActivity)

	return c.JSON(http.StatusOK, response)
}
