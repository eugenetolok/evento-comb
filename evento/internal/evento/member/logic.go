package member

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func getCompanyMembers(c echo.Context) error {
	userID, _ := utils.GetUser(c)
	var user model.User
	if err := db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	var members []model.Member
	if err := db.Where("company_id = ?", user.CompanyID).Preload("Accreditation.Gates").Preload("Gates").Find(&members).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"members are not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, members)
}

func getEditorMembers(c echo.Context) error {
	userID, _ := utils.GetUser(c)
	var user model.User
	if err := db.Preload("Companies").First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// Find the autos that belong to the user's companies
	var members []model.Member
	companyIDs := make([]uuid.UUID, len(user.Companies))
	for i, company := range user.Companies {
		companyIDs[i] = company.ID
	}
	if err := db.Where("company_id IN (?)", companyIDs).Preload("Accreditation.Gates").Preload("Gates").Find(&members).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"autos are not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, members)
}

func setState(c echo.Context) error {
	utils.MarkDeprecatedGet(c, "POST")
	id := c.Param("id")
	var member model.Member
	if err := db.First(&member, id).Error; err != nil {
		return c.String(http.StatusNotFound, `{"error":"member is not found"}`)
	}
	member.State = c.QueryParam("state")
	db.Save(&member)
	return c.JSON(http.StatusOK, member)
}

// Modify memberWriteLogic signature and add the call
func memberWriteLogic(c echo.Context, member *model.Member, tx *gorm.DB, memberID *uuid.UUID) error { // Added tx and memberID
	var input struct {
		Surname         string      `json:"surname"`
		Name            string      `json:"name"`
		Middlename      string      `json:"middlename"`
		Document        string      `json:"document"`
		Responsible     bool        `json:"responsible"`
		Blocked         bool        `json:"blocked"`
		InZone          bool        `json:"in_zone"`
		AccreditationID uuid.UUID   `json:"accreditation_id"`
		Birth           time.Time   `json:"birth"`
		EventIDs        []uuid.UUID `json:"event_ids"`
		GateIDs         []uuid.UUID `json:"gate_ids"`
	}

	if err := c.Bind(&input); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("Ошибка привязки данных: %v", err))
	}

	// --- LIMIT CHECK ---
	// Get CompanyID: If creating, it's set later. If updating, it's on the member object.
	companyIDToCheck := member.CompanyID          // Assume update first
	if memberID == nil || *memberID == uuid.Nil { // If creating, get from context or logic where member.CompanyID is set
		// Note: In createMember, member.CompanyID is set *after* this call.
		// We need the companyID *before* the check. Let's get it from context query param again or fetched company
		cidStr := c.QueryParam("company_id")
		parsedCid, err := uuid.Parse(cidStr)
		if err != nil {
			// If not in query, try getting from user context if applicable
			userIDCtx, _ := utils.GetUser(c)
			var userCtx model.User
			if errDb := tx.Select("company_id").First(&userCtx, userIDCtx).Error; errDb == nil && userCtx.CompanyID != uuid.Nil {
				parsedCid = userCtx.CompanyID
				err = nil // Reset error
			}
		}
		if err != nil || parsedCid == uuid.Nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Не удалось определить ID компании для проверки лимитов при создании")
		}
		companyIDToCheck = parsedCid
	}

	// Perform the validation using the *input* data, as that's what we *intend* to save
	if err := validateMemberLimits(tx, companyIDToCheck, input.AccreditationID, input.EventIDs, input.GateIDs, memberID); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("Ошибка проверки лимитов: %v", err))
	}
	// --- END LIMIT CHECK ---

	// Update the member fields (keep existing logic)
	if input.Surname != "" {
		member.Surname = input.Surname
	}
	// ... (rest of field updates)
	if input.Name != "" {
		member.Name = input.Name
	}
	if input.Middlename != "" {
		member.Middlename = input.Middlename
	}
	if input.Document != "" {
		var doc string = input.Document
		doc = strings.Replace(doc, "\t", "", -1)
		doc = strings.Replace(doc, " ", "", -1)
		member.Document = doc
	}
	if !input.Birth.IsZero() {
		member.Birth = input.Birth
	}
	member.Responsible = input.Responsible
	member.InZone = input.InZone
	member.Blocked = input.Blocked

	// Update accreditation (set the ID, GORM handles association on save/update)
	member.AccreditationID = input.AccreditationID // Important: Use the validated input ID

	// Fetch and set Events based on input IDs
	var events []model.Event
	if len(input.EventIDs) > 0 {
		if err := tx.Where("id IN (?)", input.EventIDs).Find(&events).Error; err != nil {
			// Check if it's just "not found" for potentially empty valid list
			if !errors.Is(err, gorm.ErrRecordNotFound) || len(input.EventIDs) > 0 {
				return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("Ошибка при поиске мероприятий: %v", err))
			}
		}
	}
	member.Events = events // GORM will handle Replace/Append in the updateMember logic

	// Fetch and set Gates based on input IDs
	var gates []model.Gate
	if len(input.GateIDs) > 0 {
		if err := tx.Where("id IN (?)", input.GateIDs).Find(&gates).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) || len(input.GateIDs) > 0 {
				return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("Ошибка при поиске доп. зон: %v", err))
			}
		}
	}
	member.Gates = gates // GORM will handle Replace/Append in the updateMember logic

	return nil // Return nil if binding and limit checks are successful
}

func membersFillLite(c echo.Context, member *model.Member, eventIDs, gateIDs []uuid.UUID) error {
	// Update or create accreditation limits
	var events []model.Event
	if err := db.Where("id in (?)", eventIDs).Find(&events).Error; err != nil {
		return c.String(http.StatusNotFound, "Мероприятие не найдено")
	}
	// Remove gates that are not included in the GateIDs field
	var eventIDsMap = make(map[uuid.UUID]bool)
	for _, eventID := range eventIDs {
		eventIDsMap[eventID] = true
	}
	for _, event := range member.Events {
		if !eventIDsMap[event.ID] {
			db.Model(&member).Association("Events").Delete(&event)
		}
	}
	member.Events = events

	var gates []model.Gate
	if err := db.Where("id in (?)", gateIDs).Find(&gates).Error; err != nil {
		return c.String(http.StatusNotFound, "Зона не найдена")
	}
	// Remove gates that are not included in the GateIDs field
	var gateIDsMap = make(map[uuid.UUID]bool)
	for _, gateID := range gateIDs {
		gateIDsMap[gateID] = true
	}
	for _, gate := range member.Gates {
		if !gateIDsMap[gate.ID] {
			db.Model(&member).Association("Gates").Delete(&gate)
		}
	}
	member.Gates = gates
	return nil
}

// print member
func print(c echo.Context) error {
	utils.MarkDeprecatedGet(c, "POST")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var member model.Member
	if err := db.First(&member, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"member is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	member.PrintCount = member.PrintCount + 1
	db.Save(&member)

	var memberPrint model.MemberPrint
	memberPrint.MemberID = id
	if errCreatePrint := db.Create(&memberPrint).Error; errCreatePrint != nil {
		fmt.Println("unable to create memberPrint", errCreatePrint)
	}

	return c.JSON(http.StatusOK, member)
}

// MemberIDs ...
type MemberIDs struct {
	MemberIDs []uuid.UUID `json:"memberIds"`
}

// massPrint members
func massPrint(c echo.Context) error {
	var ids MemberIDs
	if err := c.Bind(&ids); err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid request body"}`)
	}
	var membersToSave []model.Member
	for _, id := range ids.MemberIDs {
		var member model.Member
		if err := db.First(&member, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.String(http.StatusInternalServerError, err.Error())
			}
		}

		member.PrintCount = member.PrintCount + 1
		membersToSave = append(membersToSave, member)
	}
	db.Save(&membersToSave)

	return c.String(http.StatusOK, `{"message":"print count updated for specified members"}`)
}

// member give bangle
func giveBangle(c echo.Context) error {
	utils.MarkDeprecatedGet(c, "POST")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var member model.Member
	if err := db.First(&member, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"member is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	member.GivenBangle = true
	member.GivenBangleCount = member.GivenBangleCount + 1
	db.Save(&member)

	return c.JSON(http.StatusOK, member)
}
