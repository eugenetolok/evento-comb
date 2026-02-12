package company

import (
	"errors"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// PrintLimit ...
type PrintLimit struct {
	InEventMembersLimit uint `json:"in_event_members_limit"`
	CompanyPrinted      uint `json:"company_printed"`
}

func printLimit(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var company model.Company
	if err := db.Preload("Members").First(&company, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	var printedCount uint
	for _, member := range company.Members {
		if member.PrintCount > 0 {
			printedCount++
		}
	}
	var printLimit PrintLimit
	printLimit.InEventMembersLimit = company.InEventMembersLimit
	printLimit.CompanyPrinted = printedCount
	return c.JSON(http.StatusOK, printLimit)
}
