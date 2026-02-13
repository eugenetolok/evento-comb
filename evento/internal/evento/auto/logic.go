package auto

import (
	"errors"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func getEditorAutos(c echo.Context) error {
	userID, _ := utils.GetUser(c)
	var user model.User
	if err := db.Preload("Companies").First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// Find the autos that belong to the user's companies
	var autos []model.Auto
	companyIDs := make([]uuid.UUID, len(user.Companies))
	for i, company := range user.Companies {
		companyIDs[i] = company.ID
	}
	if err := db.Where("company_id IN (?)", companyIDs).Find(&autos).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"autos are not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, autos)
}

func getCompanyAutos(c echo.Context) error {
	userID, _ := utils.GetUser(c)
	var user model.User
	if err := db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	var autos []model.Auto
	if err := db.Where("company_id = ?", user.CompanyID).Find(&autos).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"autos are not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, autos)
}

func givePass(c echo.Context) error {
	utils.MarkDeprecatedGet(c, "POST")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var auto model.Auto
	if err := db.First(&auto, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"auto is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	auto.Pass = true
	db.Save(&auto)

	return c.JSON(http.StatusOK, auto)
}

func givePass2(c echo.Context) error {
	utils.MarkDeprecatedGet(c, "POST")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var auto model.Auto
	if err := db.First(&auto, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"auto is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	auto.Pass2 = true
	db.Save(&auto)

	return c.JSON(http.StatusOK, auto)
}
