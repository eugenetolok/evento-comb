package company

import (
	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// logCompanyHistory creates and saves an CompanyHistory record within a transaction.
func logCompanyHistory(tx *gorm.DB, c echo.Context, companyID uuid.UUID, changeType string, details string) error {
	userID, _ := utils.GetUser(c)
	history := model.CompanyHistory{
		CompanyID:  companyID,
		UserID:     userID,
		ChangeType: changeType,
		Details:    details,
	}
	return tx.Create(&history).Error
}
