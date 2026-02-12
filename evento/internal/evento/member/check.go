package member

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// SuperCheckAnswer ...
type SuperCheckAnswer struct {
	Gates  []model.Gate  `json:"gates"`
	Checks []CheckAnswer `json:"checks"`
}

// CheckAnswer ...
type CheckAnswer struct {
	Success         bool        `json:"success"`
	Gates           []uuid.UUID `json:"gates"`
	Events          []uuid.UUID `json:"events"`
	Inside          bool        `json:"inside"`
	HasExternal     bool        `json:"hasExternal"`
	Hash            string      `json:"hash"`
	Blocked         bool        `json:"blocked"`
	FIO             string      `json:"fio"`
	ID              uuid.UUID   `json:"id"`
	AccreditationID uuid.UUID   `json:"accreditation_id"`
}

// CheckInput ...
type CheckInput struct {
	Hash   string `json:"hash"`
	GateID string `json:"gate_id"`
}

func contains(slice []uuid.UUID, id uuid.UUID) bool {
	for _, item := range slice {
		if item == id {
			return true
		}
	}
	return false
}

// check - member give bangle
func check(c echo.Context) error {
	var checkAnswer CheckAnswer
	var checkInput CheckInput
	if err := c.Bind(&checkInput); err != nil {
		return c.JSON(http.StatusOK, checkAnswer)
	}
	var member model.Member
	if err := db.Preload("Accreditation.Gates").Preload("Gates").Preload("Events").Where("barcode = ?", checkInput.Hash).First(&member).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.JSON(http.StatusNotFound, checkAnswer)
		}
	}

	checkAnswer.Success = true

	if member.Blocked {
		checkAnswer.Success = false
	}
	checkAnswer.Inside = member.InZone
	checkAnswer.Hash = member.Barcode
	checkAnswer.FIO = fmt.Sprintf("%s %s %s", member.Surname, member.Name, member.Middlename)
	checkAnswer.Blocked = member.Blocked
	checkAnswer.AccreditationID = member.AccreditationID
	checkAnswer.ID = member.ID
	for _, gate := range member.Gates {
		if gate.Name == "- ⇄ - Вход-выход" {
			checkAnswer.HasExternal = true
		}
		if !contains(checkAnswer.Gates, gate.ID) {
			checkAnswer.Gates = append(checkAnswer.Gates, gate.ID)
		}
	}
	for _, gate := range member.Accreditation.Gates {
		if gate.Name == "- ⇄ - Вход-выход" {
			checkAnswer.HasExternal = true
		}
		if !contains(checkAnswer.Gates, gate.ID) {
			checkAnswer.Gates = append(checkAnswer.Gates, gate.ID)
		}
	}
	for _, event := range member.Events {
		if !contains(checkAnswer.Events, event.ID) {
			checkAnswer.Events = append(checkAnswer.Events, event.ID)
		}
	}
	member.InZone = true
	db.Save(&member)
	var memberPass model.MemberPass
	memberPass.MemberID = member.ID
	gateID, _ := uuid.Parse(checkInput.GateID)
	memberPass.GateID = gateID
	db.Create(&memberPass)
	return c.JSON(http.StatusOK, checkAnswer)
}

// offlineScanner ...
func offlineScanner(c echo.Context) error {
	var checkAnswers []CheckAnswer
	var members []model.Member
	var gates []model.Gate
	if err := db.Find(&gates).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.JSON(http.StatusNotFound, SuperCheckAnswer{Checks: checkAnswers, Gates: gates})
		}
		return c.JSON(http.StatusInternalServerError, SuperCheckAnswer{Checks: checkAnswers, Gates: gates})
	}
	if err := db.Preload("Accreditation.Gates").Preload("Gates").Preload("Events").Find(&members).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.JSON(http.StatusNotFound, SuperCheckAnswer{Checks: checkAnswers, Gates: gates})
		}
		return c.JSON(http.StatusInternalServerError, SuperCheckAnswer{Checks: checkAnswers, Gates: gates})
	}

	for _, member := range members {
		var checkAnswer CheckAnswer
		checkAnswer.Success = true
		checkAnswer.Inside = member.InZone
		checkAnswer.Hash = member.Barcode
		checkAnswer.AccreditationID = member.AccreditationID
		checkAnswer.FIO = fmt.Sprintf("%s %s %s", member.Surname, member.Name, member.Middlename)
		checkAnswer.Blocked = member.Blocked
		checkAnswer.ID = member.ID
		for _, gate := range member.Gates {
			if gate.External {
				checkAnswer.HasExternal = true
			}
			if !contains(checkAnswer.Gates, gate.ID) {
				checkAnswer.Gates = append(checkAnswer.Gates, gate.ID)
			}
		}
		for _, gate := range member.Accreditation.Gates {
			if gate.External {
				checkAnswer.HasExternal = true
			}
			if !contains(checkAnswer.Gates, gate.ID) {
				checkAnswer.Gates = append(checkAnswer.Gates, gate.ID)
			}
		}
		for _, event := range member.Events {
			if !contains(checkAnswer.Events, event.ID) {
				checkAnswer.Events = append(checkAnswer.Events, event.ID)
			}
		}
		checkAnswers = append(checkAnswers, checkAnswer)
	}
	return c.JSON(http.StatusOK, SuperCheckAnswer{Checks: checkAnswers, Gates: gates})
}

type MemberPassResponse struct {
	ID        uuid.UUID `json:"id"`
	MemberID  uuid.UUID `json:"member_id"`
	GateID    uuid.UUID `json:"gate_id"`
	CreatedAt time.Time `json:"created_at"` // Explicitly include and name the field
}

func memberPasses(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}

	var passes []model.MemberPass
	if err := db.Where("member_id = ?", id).Order("created_at desc").Find(&passes).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"passes not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	response := make([]MemberPassResponse, len(passes))

	// Loop through the database results and map them to the response struct
	for i, pass := range passes {
		response[i] = MemberPassResponse{
			ID:        pass.ID,
			MemberID:  pass.MemberID,
			GateID:    pass.GateID,
			CreatedAt: pass.CreatedAt,
		}
	}

	return c.JSON(http.StatusOK, response)
}
