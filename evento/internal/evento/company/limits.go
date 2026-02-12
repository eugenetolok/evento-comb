package company

import (
	"errors"
	"fmt"
	"net/http"
	"sort"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func getCompanyLimits(c echo.Context) error {
	companyID, err := uuid.Parse(c.QueryParam("company_id"))
	if err != nil || c.QueryParam("company_id") == "" {
		userID, _ := utils.GetUser(c)
		var user model.User
		if err := db.First(&user, userID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
			}
			return c.String(http.StatusInternalServerError, err.Error())
		}
		if user.CompanyID == uuid.Nil {
			return c.String(http.StatusBadRequest, `{"error":"company not found"}`)
		}
		companyID = user.CompanyID
	}
	var company model.Company
	if errCompany := db.Preload("AccreditationLimits").Preload("EventLimits").Preload("GateLimits").First(&company, companyID).Error; errCompany != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company is wrong"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var accreditations []model.Accreditation
	err = db.Order("position desc").Preload("Gates").Find(&accreditations).Error
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	type AccredLimit struct {
		ID       uuid.UUID    `json:"id"`
		Name     string       `json:"name"`
		Limit    uint         `json:"limit"`
		Position uint         `json:"-"`
		Gates    []model.Gate `json:"gates"`
	}
	var accredLimits []AccredLimit
	for _, limit := range company.AccreditationLimits {
		for _, accreditation := range accreditations {
			if limit.AccreditationID == accreditation.ID {
				var count int64
				err = db.Model(&model.Member{}).Where("accreditation_id = ?", accreditation.ID).Where("company_id = ?", companyID).Count(&count).Error
				fmt.Println("SUPER", accreditation.Name, count, limit.Limit)
				if err != nil {
					return c.String(http.StatusInternalServerError, err.Error())
				}
				if int64(limit.Limit)-count > 0 {
					accredLimits = append(accredLimits, AccredLimit{ID: accreditation.ID, Position: accreditation.Position, Gates: accreditation.Gates, Name: fmt.Sprintf("%s (доступно: %d из %d)", accreditation.Name, int64(limit.Limit)-int64(count), limit.Limit), Limit: limit.Limit - uint(count)})
				}
			}
		}
	}
	if accredLimits == nil {
		accredLimits = []AccredLimit{}
	}
	sort.Slice(accredLimits, func(i, j int) bool {
		return accredLimits[i].Position > accredLimits[j].Position
	})

	var events []model.Event
	err = db.Order("position desc").Find(&events).Error
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	type EventLimit struct {
		ID       uuid.UUID `json:"id"`
		Name     string    `json:"name"`
		Limit    uint      `json:"limit"`
		Position uint      `json:"-"`
	}

	var eventLimits []EventLimit
	for _, limit := range company.EventLimits {
		for _, event := range events {
			if limit.EventID == event.ID {
				var count int64
				err = db.Model(&model.Member{}).
					Joins("JOIN member_events ON member_events.member_id = members.id").
					Where("member_events.event_id = ?", event.ID).
					Where("members.company_id = ?", companyID).
					Count(&count).Error
				if err != nil {
					return c.String(http.StatusInternalServerError, err.Error())
				}
				if int64(limit.Limit)-count > 0 {
					eventLimits = append(eventLimits, EventLimit{ID: event.ID, Position: event.Position, Name: fmt.Sprintf("%s (доступно: %d из %d)", event.Name, int64(limit.Limit)-count, limit.Limit), Limit: limit.Limit - uint(count)})
				}
			}
		}
	}
	if eventLimits == nil {
		eventLimits = []EventLimit{}
	}
	sort.Slice(eventLimits, func(i, j int) bool {
		return eventLimits[i].Position > eventLimits[j].Position
	})

	var gates []model.Gate
	err = db.Order("position desc").Find(&gates).Error
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	type GateLimit struct {
		ID       uuid.UUID `json:"id"`
		Name     string    `json:"name"`
		Limit    uint      `json:"limit"`
		Position uint      `json:"-"`
	}

	var gateLimits []GateLimit
	for _, limit := range company.GateLimits {
		for _, gate := range gates {
			if limit.GateID == gate.ID {
				var count int64
				err = db.Model(&model.Member{}).
					Joins("JOIN member_gates ON member_gates.member_id = members.id").
					Where("member_gates.gate_id = ?", gate.ID).
					Where("members.company_id = ?", companyID).
					Count(&count).Error
				if err != nil {
					return c.String(http.StatusInternalServerError, err.Error())
				}
				fmt.Println("gate limit - count", int64(limit.Limit)-count)
				if int64(limit.Limit)-count > 0 {
					gateLimits = append(gateLimits, GateLimit{ID: gate.ID, Position: gate.Position, Name: fmt.Sprintf("%s (доступно: %d из %d)", gate.Name, int64(limit.Limit)-count, limit.Limit), Limit: limit.Limit - uint(count)})
				}
			}
		}
	}
	if gateLimits == nil {
		gateLimits = []GateLimit{}
	}
	sort.Slice(gateLimits, func(i, j int) bool {
		return gateLimits[i].Position > gateLimits[j].Position
	})

	type CompanyLimits struct {
		EventLimits  []EventLimit  `json:"event_limits"`
		AccredLimits []AccredLimit `json:"accred_limits"`
		GateLimits   []GateLimit   `json:"gate_limits"`
	}

	return c.JSON(http.StatusOK, CompanyLimits{
		EventLimits:  eventLimits,
		AccredLimits: accredLimits,
		GateLimits:   gateLimits,
	})
}
