package auto

import (
	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// logAutoHistory creates and saves an AutoHistory record within a transaction.
func logAutoHistory(tx *gorm.DB, c echo.Context, autoID uuid.UUID, changeType string, details string) error {
	userID, _ := utils.GetUser(c)
	history := model.AutoHistory{
		AutoID:     autoID,
		UserID:     userID,
		ChangeType: changeType,
		Details:    details,
	}
	return tx.Create(&history).Error
}
