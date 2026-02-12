package member

import (
	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// logMemberHistory creates and saves an MemberHistory record within a transaction.
func logMemberHistory(tx *gorm.DB, c echo.Context, memberID uuid.UUID, changeType string, details string) error {
	userID, _ := utils.GetUser(c)
	history := model.MemberHistory{
		MemberID:   memberID,
		UserID:     userID,
		ChangeType: changeType,
		Details:    details,
	}
	return tx.Create(&history).Error
}
