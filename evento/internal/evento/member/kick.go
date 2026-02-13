package member

import (
	"errors"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// getMembersByGate retrieves all members associated with a specific gate.
func getMembersByGate(c echo.Context) error {
	// 1. Parse and validate the Gate ID from the URL parameter.
	idStr := c.Param("gateId")
	gateID, err := uuid.Parse(idStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid gate ID format"})
	}

	// 2. (Optional but good practice) First, check if the gate exists.
	var gate model.Gate
	if err := db.First(&gate, "id = ?", gateID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Gate not found"})
		}
		// For other potential DB errors
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Database error checking for gate"})
	}

	// 3. Find all members associated with this gate.
	var members []model.Member

	// The key is to JOIN the 'members' table with the 'member_gates' join table
	// and then filter by the gate_id in the join table.
	err = db.Model(&model.Member{}).
		Joins("JOIN member_gates on member_gates.member_id = members.id").
		Where("member_gates.gate_id = ?", gateID).
		Find(&members).Error

	if err != nil {
		// This would be an unexpected database error during the main query.
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to retrieve members"})
	}

	// It's good practice to return an empty list `[]` instead of `null` if no members are found.
	// GORM's Find does this automatically.

	// 4. Return the list of members as JSON.
	return c.JSON(http.StatusOK, members)
}

func removeGateFromMember(c echo.Context) error {
	// 1. Parse and validate Member ID from the URL.
	memberIDStr := c.Param("memberId")
	memberID, err := uuid.Parse(memberIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid member ID format"})
	}

	// 2. Parse and validate Gate ID from the URL.
	gateIDStr := c.Param("gateId")
	gateID, err := uuid.Parse(gateIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid gate ID format"})
	}

	// 3. Find the member to ensure it exists before trying to modify it.
	var member model.Member
	if err := db.First(&member, "id = ?", memberID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Member not found"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Database error finding member"})
	}

	// It's good practice to also check if the gate exists, to provide a clear error.
	var gate model.Gate
	if err := db.First(&gate, "id = ?", gateID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Gate not found"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Database error finding gate"})
	}

	// 4. Use GORM's Association to remove the relationship from the join table.
	// The argument to Association("...") must match the field name in the struct (`Gates`).
	// The argument to Delete(...) is the object to be removed from the association.
	// GORM will generate the SQL: DELETE FROM "member_gates" WHERE "member_id" = ? AND "gate_id" = ?
	err = db.Model(&member).Association("Gates").Delete(&gate)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to remove gate from member"})
	}

	// 5. Return a success response.
	// HTTP 200 OK with a message is a good option.
	// HTTP 204 No Content is also a common and valid response for a successful DELETE.
	return c.JSON(http.StatusOK, map[string]string{"message": "Gate successfully removed from member"})
}
