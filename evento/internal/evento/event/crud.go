package event

import (
	"errors"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func getEvents(c echo.Context) error {
	userID, userRole := utils.GetUser(c) // Get user ID and role
	var events []model.Event
	var err error

	query := db.Order("position desc")

	if userRole == "company" {
		// Fetch the user to get their CompanyID
		var user model.User
		if err := db.Select("company_id").First(&user, userID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.String(http.StatusNotFound, `{"error":"User or associated company not found"}`)
			}
			return c.String(http.StatusInternalServerError, "Failed to fetch user data: "+err.Error())
		}
		if user.CompanyID == uuid.Nil {
			return c.JSON(http.StatusOK, []model.Event{}) // Company user without a company assigned
		}

		// Filter events based on CompanyEventLimit
		query = query.Joins("JOIN company_event_limits ON company_event_limits.event_id = events.id").
			Where("company_event_limits.company_id = ?", user.CompanyID)

	} else if userRole == "editor" {
		// Optional: Add editor-specific logic if needed later
		// For now, editors see all events like admins (or adjust as needed)
		// query = query...
	}
	// Admin sees all (no extra filter needed beyond Order)

	if err = query.Find(&events).Error; err != nil {
		// Don't return 404 for empty lists, just empty JSON array
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusInternalServerError, "Database query error: "+err.Error())
		}
		// If ErrRecordNotFound, events will be an empty slice, which is correct
	}

	if events == nil {
		events = []model.Event{} // Ensure non-nil response
	}
	return c.JSON(http.StatusOK, events)
}

// event crud operations
func getEvent(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}

	userID, userRole := utils.GetUser(c) // Get user ID and role
	var event model.Event

	if err := db.First(&event, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"event is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// Check access for 'company' role
	if userRole == "company" {
		var user model.User
		if err := db.Select("company_id").First(&user, userID).Error; err != nil {
			return c.String(http.StatusInternalServerError, "Failed to fetch user data: "+err.Error())
		}
		if user.CompanyID == uuid.Nil {
			return c.String(http.StatusForbidden, `{"error":"Access denied: User not associated with a company"}`)
		}

		// Verify if this company has a limit entry for this event
		var count int64
		err := db.Model(&model.CompanyEventLimit{}).
			Where("company_id = ? AND event_id = ?", user.CompanyID, event.ID).
			Count(&count).Error
		if err != nil {
			return c.String(http.StatusInternalServerError, "Failed to check permissions: "+err.Error())
		}
		if count == 0 {
			// Company does not have access to this specific event
			return c.String(http.StatusForbidden, `{"error":"Access denied to this event"}`)
		}
	} else if userRole == "editor" {
		// Optional: Add editor-specific logic if needed later
	}
	// Admin has access

	return c.JSON(http.StatusOK, event)
}

func createEvent(c echo.Context) error {
	var event model.Event
	if err := c.Bind(&event); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}
	if err := db.Create(&event).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, event)
}

func updateEvent(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var event model.Event
	if err := db.First(&event, id).Error; err != nil {
		return c.String(http.StatusNotFound, `{"error":"event is not found"}`)
	}
	if err := c.Bind(&event); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}
	db.Save(&event)
	return c.JSON(http.StatusOK, event)
}

func deleteEvent(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	if err := db.Delete(&model.Event{}, id).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}
