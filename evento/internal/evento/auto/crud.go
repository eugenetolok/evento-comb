package auto

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func getAutos(c echo.Context) error {
	var autos []model.Auto
	if err := db.Find(&autos).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `Автомобили не найдены`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, autos)
}

// auto crud operations
func getAuto(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var auto model.Auto
	if err := db.First(&auto, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `Авто не найдено`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	var company model.Company
	if err := db.Preload("User").First(&company, auto.CompanyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `ID компании неверный`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	if !utils.CheckCompanyGetPermission(c, company) {
		return c.String(http.StatusNotFound, `У вас недостаточно прав, чтобы сделать данный запрос`)
	}

	return c.JSON(http.StatusOK, auto)
}

func createAuto(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}
	// get companyID from request
	companyID, err := uuid.Parse(c.QueryParam("company_id"))
	if err != nil {
		userID, _ := utils.GetUser(c)
		var user model.User
		if err := db.First(&user, userID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.String(http.StatusNotFound, `Пользователь не найден`)
			}
			return c.String(http.StatusInternalServerError, err.Error())
		}
		if user.CompanyID == uuid.Nil {
			return c.String(http.StatusBadRequest, `Компания не найдена`)
		}
		fmt.Println("jwt userID", userID, "user.CompanyID", user.CompanyID)
		companyID = user.CompanyID
	}
	// get member company which will be assigned
	var company model.Company
	if err := db.Preload("User").Preload("Autos").First(&company, companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `ID компании неверный`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	if !utils.CheckCompanyManagePermission(c, company) {
		return c.String(http.StatusNotFound, `У вас недостаточно прав, чтобы сделать данный запрос`)
	}
	// check if limit
	if uint(len(company.Autos)) >= company.CarsLimit {
		return c.String(http.StatusNotFound, fmt.Sprintf("Достигнут лимит на количество автомобилей (%d)", company.CarsLimit))
	}
	//
	var auto model.Auto
	if err := c.Bind(&auto); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}
	auto.CompanyID = company.ID
	auto.Company = company.Name
	if auto.Route == "" {
		auto.Route = company.DefaultRoute
	}
	if err := db.Create(&auto).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	autoDetails, _ := json.Marshal(auto)
	logAutoHistory(db, c, auto.ID, "create", string(autoDetails))
	return c.JSON(http.StatusCreated, auto)
}

func updateAuto(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var auto model.Auto
	if err := db.First(&auto, id).Error; err != nil {
		return c.String(http.StatusNotFound, `Автомобиль не найден`)
	}
	// get member company which will be assigned
	var company model.Company
	if err := db.Preload("User").First(&company, auto.CompanyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `ID компании неверный`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	if !utils.CheckCompanyManagePermission(c, company) {
		return c.String(http.StatusNotFound, `У вас недостаточно прав, чтобы сделать данный запрос`)
	}
	if err := c.Bind(&auto); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}
	auto.Company = company.Name
	if auto.Route == "" {
		auto.Route = company.DefaultRoute
	}
	if err := db.Save(&auto).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	autoDetails, _ := json.Marshal(auto)
	logAutoHistory(db, c, auto.ID, "update", string(autoDetails))
	return c.JSON(http.StatusOK, auto)
}

func deleteAuto(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var auto model.Auto
	if err := db.First(&auto, id).Error; err != nil {
		return c.String(http.StatusNotFound, `Авто не найдено`)
	}
	// get member company which will be assigned
	var company model.Company
	if err := db.Preload("User").First(&company, auto.CompanyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `ID компании неверный`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	if !utils.CheckCompanyManagePermission(c, company) {
		return c.String(http.StatusForbidden, `У вас недостаточно прав, чтобы сделать данный запрос`)
	}
	if err := db.Delete(&model.Auto{}, id).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	logAutoHistory(db, c, auto.ID, "delete", "")
	return c.NoContent(http.StatusNoContent)
}
