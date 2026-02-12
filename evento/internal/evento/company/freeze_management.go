package company

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

const companyFreezeSchedulerInterval = 30 * time.Second

var companyFreezeSchedulerOnce sync.Once

type companyFreezeScheduleRequest struct {
	Action    string `json:"action"`
	ExecuteAt string `json:"execute_at"`
}

type companyFreezeAllRequest struct {
	Action string `json:"action"`
}

type companyFreezeStatusResponse struct {
	CompaniesTotal     int64      `json:"companies_total"`
	FrozenCompanies    int64      `json:"frozen_companies"`
	ScheduledCompanies int64      `json:"scheduled_companies"`
	NextAction         string     `json:"next_action,omitempty"`
	NextScheduledAt    *time.Time `json:"next_scheduled_at,omitempty"`
}

type companyFreezeActionResponse struct {
	Action        string     `json:"action"`
	AffectedCount int64      `json:"affected_count"`
	ExecuteAt     *time.Time `json:"execute_at,omitempty"`
}

type companyFreezeNextScheduleRow struct {
	FrozenAction string
	FrozenAt     *time.Time
}

func startCompanyFreezeScheduler(database *gorm.DB) {
	companyFreezeSchedulerOnce.Do(func() {
		go func() {
			if err := applyScheduledCompanyFreeze(database, time.Now()); err != nil {
				fmt.Println("company freeze scheduler startup apply error:", err)
			}

			ticker := time.NewTicker(companyFreezeSchedulerInterval)
			defer ticker.Stop()

			for range ticker.C {
				if err := applyScheduledCompanyFreeze(database, time.Now()); err != nil {
					fmt.Println("company freeze scheduler tick apply error:", err)
				}
			}
		}()
	})
}

func getCompanyFreezeStatus(c echo.Context) error {
	var total int64
	if err := db.Model(&model.User{}).Where("role = ?", "company").Count(&total).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var frozen int64
	if err := db.Model(&model.User{}).Where("role = ? AND frozen = ?", "company", true).Count(&frozen).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var scheduled int64
	if err := db.Model(&model.User{}).Where("role = ? AND frozen_at IS NOT NULL AND frozen_action <> ''", "company").Count(&scheduled).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var next companyFreezeNextScheduleRow
	nextQuery := db.Model(&model.User{}).
		Select("frozen_action, frozen_at").
		Where("role = ? AND frozen_at IS NOT NULL AND frozen_action IN ?", "company", []string{"freeze", "unfreeze"}).
		Order("frozen_at ASC").
		Limit(1)
	if err := nextQuery.Scan(&next).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	response := companyFreezeStatusResponse{
		CompaniesTotal:     total,
		FrozenCompanies:    frozen,
		ScheduledCompanies: scheduled,
		NextAction:         next.FrozenAction,
		NextScheduledAt:    next.FrozenAt,
	}
	return c.JSON(http.StatusOK, response)
}

func scheduleCompanyFreezeAll(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}

	var request companyFreezeScheduleRequest
	if err := c.Bind(&request); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	action, err := normalizeFreezeAction(request.Action)
	if err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	executeAt, err := parseFreezeDateTime(request.ExecuteAt)
	if err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	if !executeAt.After(time.Now()) {
		return c.String(http.StatusBadRequest, "Дата и время должны быть в будущем")
	}

	result := db.Model(&model.User{}).
		Where("role = ?", "company").
		Updates(map[string]interface{}{
			"frozen_action": action,
			"frozen_at":     executeAt,
		})
	if result.Error != nil {
		return c.String(http.StatusInternalServerError, result.Error.Error())
	}

	response := companyFreezeActionResponse{
		Action:        action,
		AffectedCount: result.RowsAffected,
		ExecuteAt:     &executeAt,
	}
	return c.JSON(http.StatusOK, response)
}

func setCompanyFreezeAllNow(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}

	var request companyFreezeAllRequest
	if err := c.Bind(&request); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	action, err := normalizeFreezeAction(request.Action)
	if err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	freeze := action == "freeze"
	result := db.Model(&model.User{}).
		Where("role = ?", "company").
		Updates(map[string]interface{}{
			"frozen":        freeze,
			"frozen_action": "",
			"frozen_at":     nil,
		})
	if result.Error != nil {
		return c.String(http.StatusInternalServerError, result.Error.Error())
	}

	response := companyFreezeActionResponse{
		Action:        action,
		AffectedCount: result.RowsAffected,
	}
	return c.JSON(http.StatusOK, response)
}

func normalizeFreezeAction(rawAction string) (string, error) {
	action := strings.ToLower(strings.TrimSpace(rawAction))
	switch action {
	case "freeze", "unfreeze":
		return action, nil
	default:
		return "", fmt.Errorf("некорректное действие: используйте freeze или unfreeze")
	}
}

func parseFreezeDateTime(rawDateTime string) (time.Time, error) {
	value := strings.TrimSpace(rawDateTime)
	if value == "" {
		return time.Time{}, fmt.Errorf("дата и время не указаны")
	}

	layoutsWithTZ := []string{
		time.RFC3339,
	}
	for _, layout := range layoutsWithTZ {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed, nil
		}
	}

	layoutsLocal := []string{
		"2006-01-02T15:04",
		"2006-01-02T15:04:05",
		"2006-01-02 15:04",
		"2006-01-02 15:04:05",
	}
	for _, layout := range layoutsLocal {
		if parsed, err := time.ParseInLocation(layout, value, time.Local); err == nil {
			return parsed, nil
		}
	}

	return time.Time{}, fmt.Errorf("неверный формат даты и времени")
}

func applyScheduledCompanyFreeze(database *gorm.DB, now time.Time) error {
	return database.Transaction(func(tx *gorm.DB) error {
		var dueUsers []model.User
		if err := tx.
			Where("role = ? AND frozen_at IS NOT NULL AND frozen_action IN ? AND frozen_at <= ?", "company", []string{"freeze", "unfreeze"}, now).
			Find(&dueUsers).Error; err != nil {
			return err
		}

		for _, user := range dueUsers {
			freeze := user.FrozenAction == "freeze"
			if err := tx.Model(&model.User{}).
				Where("id = ?", user.ID).
				Updates(map[string]interface{}{
					"frozen":        freeze,
					"frozen_action": "",
					"frozen_at":     nil,
				}).Error; err != nil {
				return err
			}
		}

		return nil
	})
}
