package member

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

const (
	smartManagementDefaultPage     = 1
	smartManagementDefaultPageSize = 100
	smartManagementMinPageSize     = 25
	smartManagementMaxPageSize     = 300
)

type smartManagementMember struct {
	ID                string   `json:"id"`
	FullName          string   `json:"full_name"`
	Document          string   `json:"document"`
	CompanyName       string   `json:"company_name"`
	AccreditationName string   `json:"accreditation_name"`
	AccreditationID   string   `json:"accreditation_id"`
	EventIDs          []string `json:"event_ids"`
	GateIDs           []string `json:"gate_ids"`
}

type smartManagementEvent struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Position  uint       `json:"position"`
	TimeStart *time.Time `json:"time_start,omitempty"`
	TimeEnd   *time.Time `json:"time_end,omitempty"`
}

type smartManagementGate struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Position uint   `json:"position"`
}

type smartManagementDataResponse struct {
	Members        []smartManagementMember `json:"members"`
	Events         []smartManagementEvent  `json:"events"`
	Gates          []smartManagementGate   `json:"gates"`
	Companies      []string                `json:"companies"`
	Accreditations []string                `json:"accreditations"`
	TotalMembers   int64                   `json:"total_members"`
	Page           int                     `json:"page"`
	PageSize       int                     `json:"page_size"`
	TotalPages     int                     `json:"total_pages"`
}

type smartManagementUpdateItem struct {
	MemberID uuid.UUID   `json:"member_id"`
	EventIDs []uuid.UUID `json:"event_ids"`
	GateIDs  []uuid.UUID `json:"gate_ids"`
}

type smartManagementUpdateRequest struct {
	Updates []smartManagementUpdateItem `json:"updates"`
}

type smartManagementUpdateResult struct {
	MemberID string `json:"member_id"`
	Success  bool   `json:"success"`
	Error    string `json:"error,omitempty"`
}

type smartManagementUpdateResponse struct {
	Total   int                           `json:"total"`
	Success int                           `json:"success"`
	Failed  int                           `json:"failed"`
	Results []smartManagementUpdateResult `json:"results"`
}

func getSmartManagementData(c echo.Context) error {
	page := parsePositiveInt(c.QueryParam("page"), smartManagementDefaultPage)
	pageSize := parsePositiveInt(c.QueryParam("page_size"), smartManagementDefaultPageSize)
	if pageSize < smartManagementMinPageSize {
		pageSize = smartManagementMinPageSize
	}
	if pageSize > smartManagementMaxPageSize {
		pageSize = smartManagementMaxPageSize
	}

	search := strings.TrimSpace(c.QueryParam("search"))
	company := strings.TrimSpace(c.QueryParam("company"))
	accreditation := strings.TrimSpace(c.QueryParam("accreditation"))

	filteredBase := db.Model(&model.Member{}).Joins("LEFT JOIN accreditations ON accreditations.id = members.accreditation_id")
	filteredBase = applySmartManagementFilters(filteredBase, search, company, accreditation)

	var totalMembers int64
	if err := filteredBase.Count(&totalMembers).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	totalPages := 0
	if totalMembers > 0 {
		totalPages = int((totalMembers + int64(pageSize) - 1) / int64(pageSize))
		if page > totalPages {
			page = totalPages
		}
	} else {
		page = smartManagementDefaultPage
	}

	offset := (page - 1) * pageSize

	var members []model.Member
	membersQuery := db.
		Preload("Accreditation").
		Preload("Events", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("time_start asc").Order("position desc")
		}).
		Preload("Gates", "additional = ?", true).
		Joins("LEFT JOIN accreditations ON accreditations.id = members.accreditation_id")
	membersQuery = applySmartManagementFilters(membersQuery, search, company, accreditation)
	if err := membersQuery.
		Order("members.company_name asc").
		Order("members.surname asc").
		Order("members.name asc").
		Limit(pageSize).
		Offset(offset).
		Find(&members).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var events []model.Event
	if err := db.Order("time_start asc").Order("position desc").Order("name asc").Find(&events).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var gates []model.Gate
	if err := db.Where("additional = ?", true).Order("position desc").Order("name asc").Find(&gates).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	companies, err := getSmartManagementCompanies()
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	accreditations, err := getSmartManagementAccreditations()
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	response := smartManagementDataResponse{
		Members:        make([]smartManagementMember, 0, len(members)),
		Events:         make([]smartManagementEvent, 0, len(events)),
		Gates:          make([]smartManagementGate, 0, len(gates)),
		Companies:      companies,
		Accreditations: accreditations,
		TotalMembers:   totalMembers,
		Page:           page,
		PageSize:       pageSize,
		TotalPages:     totalPages,
	}

	for _, member := range members {
		eventIDs := make([]string, 0, len(member.Events))
		for _, event := range member.Events {
			eventIDs = append(eventIDs, event.ID.String())
		}

		gateIDs := make([]string, 0, len(member.Gates))
		for _, gate := range member.Gates {
			gateIDs = append(gateIDs, gate.ID.String())
		}

		fullName := buildMemberFullName(member)

		response.Members = append(response.Members, smartManagementMember{
			ID:                member.ID.String(),
			FullName:          fullName,
			Document:          member.Document,
			CompanyName:       member.CompanyName,
			AccreditationName: member.Accreditation.Name,
			AccreditationID:   member.AccreditationID.String(),
			EventIDs:          eventIDs,
			GateIDs:           gateIDs,
		})
	}

	for _, event := range events {
		response.Events = append(response.Events, smartManagementEvent{
			ID:        event.ID.String(),
			Name:      event.Name,
			Position:  event.Position,
			TimeStart: optionalTime(event.TimeStart),
			TimeEnd:   optionalTime(event.TimeEnd),
		})
	}

	for _, gate := range gates {
		response.Gates = append(response.Gates, smartManagementGate{
			ID:       gate.ID.String(),
			Name:     gate.Name,
			Position: gate.Position,
		})
	}

	return c.JSON(http.StatusOK, response)
}

func updateSmartManagement(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}

	var request smartManagementUpdateRequest
	if err := c.Bind(&request); err != nil {
		return c.String(http.StatusBadRequest, fmt.Sprintf("invalid payload: %s", err.Error()))
	}
	if len(request.Updates) == 0 {
		return c.String(http.StatusBadRequest, "updates list cannot be empty")
	}

	response := smartManagementUpdateResponse{
		Total:   len(request.Updates),
		Success: 0,
		Failed:  0,
		Results: make([]smartManagementUpdateResult, 0, len(request.Updates)),
	}

	for _, update := range request.Updates {
		result := smartManagementUpdateResult{
			MemberID: update.MemberID.String(),
			Success:  false,
		}

		if update.MemberID == uuid.Nil {
			result.Error = "member_id is required"
			response.Failed++
			response.Results = append(response.Results, result)
			continue
		}

		err := db.Transaction(func(tx *gorm.DB) error {
			var member model.Member
			if err := tx.Preload("Gates").First(&member, update.MemberID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("member not found")
				}
				return err
			}

			eventIDs := uniqueUUIDs(update.EventIDs)
			gateIDs := uniqueUUIDs(update.GateIDs)

			var events []model.Event
			if len(eventIDs) > 0 {
				if err := tx.Where("id IN (?)", eventIDs).Find(&events).Error; err != nil {
					return err
				}
				if len(events) != len(eventIDs) {
					return fmt.Errorf("some event_ids are invalid")
				}
			}

			var gates []model.Gate
			if len(gateIDs) > 0 {
				if err := tx.Where("id IN (?) AND additional = ?", gateIDs, true).Find(&gates).Error; err != nil {
					return err
				}
				if len(gates) != len(gateIDs) {
					return fmt.Errorf("some gate_ids are invalid or not additional")
				}
			}

			if err := validateMemberLimits(tx, member.CompanyID, member.AccreditationID, eventIDs, gateIDs, &member.ID); err != nil {
				return err
			}

			legacyGates := make([]model.Gate, 0)
			for _, gate := range member.Gates {
				if !gate.Additional {
					legacyGates = append(legacyGates, gate)
				}
			}

			targetGates := append(legacyGates, gates...)
			if err := tx.Model(&member).Association("Events").Replace(events); err != nil {
				return err
			}
			if err := tx.Model(&member).Association("Gates").Replace(targetGates); err != nil {
				return err
			}

			historyPayload, _ := json.Marshal(map[string]any{
				"event_ids": eventIDs,
				"gate_ids":  gateIDs,
			})
			if err := logMemberHistory(tx, c, member.ID, "smart-management-update", string(historyPayload)); err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			result.Error = err.Error()
			response.Failed++
		} else {
			result.Success = true
			response.Success++
		}

		response.Results = append(response.Results, result)
	}

	return c.JSON(http.StatusOK, response)
}

func getSmartManagementCompanies() ([]string, error) {
	var companies []string
	if err := db.Model(&model.Member{}).
		Where("company_name <> ''").
		Distinct("company_name").
		Order("company_name asc").
		Pluck("company_name", &companies).Error; err != nil {
		return nil, err
	}
	return companies, nil
}

func getSmartManagementAccreditations() ([]string, error) {
	var names []string
	if err := db.Model(&model.Accreditation{}).
		Joins("JOIN members ON members.accreditation_id = accreditations.id").
		Where("accreditations.name <> ''").
		Distinct("accreditations.name").
		Order("accreditations.name asc").
		Pluck("accreditations.name", &names).Error; err != nil {
		return nil, err
	}
	return names, nil
}

func applySmartManagementFilters(query *gorm.DB, search, company, accreditation string) *gorm.DB {
	if search != "" {
		normalizedSearch := strings.ToLower(search)
		query = query.Where(
			`LOWER(TRIM(COALESCE(members.surname, '') || ' ' || COALESCE(members.name, '') || ' ' || COALESCE(members.middlename, '') || ' ' || COALESCE(members.document, '') || ' ' || COALESCE(members.company_name, ''))) LIKE ?`,
			"%"+normalizedSearch+"%",
		)
	}
	if company != "" {
		query = query.Where("members.company_name = ?", company)
	}
	if accreditation != "" {
		query = query.Where("accreditations.name = ?", accreditation)
	}
	return query
}

func parsePositiveInt(raw string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func buildMemberFullName(member model.Member) string {
	fullName := strings.TrimSpace(fmt.Sprintf("%s %s %s", member.Surname, member.Name, member.Middlename))
	if fullName != "" {
		return fullName
	}
	if member.Document != "" {
		return member.Document
	}
	return member.ID.String()
}

func optionalTime(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	copyValue := value
	return &copyValue
}

func uniqueUUIDs(items []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]bool, len(items))
	unique := make([]uuid.UUID, 0, len(items))
	for _, item := range items {
		if item == uuid.Nil {
			continue
		}
		if seen[item] {
			continue
		}
		seen[item] = true
		unique = append(unique, item)
	}
	return unique
}
