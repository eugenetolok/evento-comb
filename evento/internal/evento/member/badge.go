package member

import (
	"bytes"
	"errors"
	"fmt"
	"net/http"

	"github.com/eugenetolok/evento/internal/evento/badge"
	"github.com/eugenetolok/evento/pkg/model"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// Add this to the end of the file
func getBadgePayload(c echo.Context) error {
	id, _ := uuid.Parse(c.Param("id"))

	var member model.Member
	if err := db.Preload("Accreditation.Gates").Preload("Gates").First(&member, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, "Member not found")
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var badgeTemplate model.BadgeTemplate
	if err := db.Where("is_default = ?", true).First(&badgeTemplate).Error; err != nil {
		return c.String(http.StatusInternalServerError, "Default badge template not found")
	}

	payload, err := badge.ProcessBadgeTemplate(member, badgeTemplate.TemplateJSON)
	if err != nil {
		return c.String(http.StatusInternalServerError, "Failed to process badge template: "+err.Error())
	}

	return c.JSONBlob(http.StatusOK, payload)
}

func getMassBadgePayloads(c echo.Context) error {
	var body struct {
		MemberIDs []uuid.UUID `json:"memberIds"`
	}
	if err := c.Bind(&body); err != nil {
		return c.String(http.StatusBadRequest, "Invalid request body")
	}

	var badgeTemplate model.BadgeTemplate
	if err := db.Where("is_default = ?", true).First(&badgeTemplate).Error; err != nil {
		return c.String(http.StatusInternalServerError, "Default badge template not found")
	}

	var members []model.Member
	if err := db.Preload("Accreditation.Gates").Preload("Gates").Where("id IN ?", body.MemberIDs).Find(&members).Error; err != nil {
		return c.String(http.StatusInternalServerError, "Failed to fetch members")
	}

	var payloads [][]byte
	for _, member := range members {
		payload, err := badge.ProcessBadgeTemplate(member, badgeTemplate.TemplateJSON)
		if err != nil {
			// Log the error and skip this member
			fmt.Printf("Error processing template for member %s: %v\n", member.ID, err)
			continue
		}
		payloads = append(payloads, payload)
	}

	// To return a valid JSON array, we need to wrap the byte slices.
	// This is a bit tricky in Go. The easiest way is to marshal the final array.
	// However, since payloads are already marshalled JSON, we can construct the array string manually.
	if len(payloads) == 0 {
		return c.JSON(http.StatusOK, []interface{}{})
	}

	var buffer bytes.Buffer
	buffer.WriteString("[")
	for i, p := range payloads {
		if i > 0 {
			buffer.WriteString(",")
		}
		buffer.Write(p)
	}
	buffer.WriteString("]")

	return c.Blob(http.StatusOK, "application/json", buffer.Bytes())
}
