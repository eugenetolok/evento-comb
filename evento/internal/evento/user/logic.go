package user

import (
	"errors"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func getUserCompanies(c echo.Context) error {
	userID, userRole := utils.GetUser(c)
	if userRole != "editor" {
		return c.String(http.StatusBadRequest, `{"error":"user is not an editor"}`)
	}
	var companies []model.Company
	if err := db.Where("editor_id = ?", userID).Find(&companies).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, companies)
}

func getUserCompany(c echo.Context) error {
	userID, userRole := utils.GetUser(c)
	if userRole != "company" {
		return c.String(http.StatusBadRequest, `{"error":"user is not a company owner"}`)
	}
	var user model.User
	if err := db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var company model.Company
	if err := db.First(&company, user.CompanyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, company)
}

// MyUser ...
type MyUser struct {
	ID   uuid.UUID `json:"id"`
	Role string    `json:"role"`
}

func me(c echo.Context) error {
	var user MyUser
	user.ID, user.Role = utils.GetUser(c)
	return c.JSON(http.StatusOK, user)
}

func frozen(c echo.Context) error {
	userID, _ := utils.GetUser(c)
	var user model.User
	if err := db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, user.Frozen)
}
