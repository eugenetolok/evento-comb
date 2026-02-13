package company

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func getCompanyAutos(c echo.Context) error {
	companyID, err := utils.ResolveCompanyIDForManage(c, db, c.QueryParam("company_id"))
	if err != nil {
		if httpErr, ok := err.(*echo.HTTPError); ok {
			return c.String(httpErr.Code, fmt.Sprint(httpErr.Message))
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var company model.Company
	if err := db.Preload("Autos").First(&company, companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, company.Autos)
}

func checkRole(c echo.Context, company model.Company, editRequest bool) bool {
	userID, role := utils.GetUser(c)
	if role == "admin" {
		return true
	}
	if role == "operator" && !editRequest {
		return true
	}
	if role == "editor" {
		return company.EditorID == userID
	}
	if role == "company" {
		return company.User.ID == userID
	}
	return false
}

func getMyCompany(c echo.Context) error {
	userID, _ := utils.GetUser(c)
	var user model.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to get user"})
	}
	var company model.Company
	if err := db.Where("id = ?", user.CompanyID).First(&company).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to get company"})
	}
	return c.JSON(http.StatusOK, company)
}

func freezeCompany(c echo.Context) error {
	utils.MarkDeprecatedGet(c, "POST")
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var company model.Company
	if err := db.Preload("User").First(&company, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `Компания не найдена`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	if !checkRole(c, company, false) {
		return c.String(http.StatusForbidden, `У пользователя недостаточно привелегий`)
	}
	var user model.User
	if err := db.First(&user, company.User.ID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	user.Frozen = !user.Frozen
	db.Save(&user)
	return c.NoContent(http.StatusNoContent)
}
