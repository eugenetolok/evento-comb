package company

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/jinzhu/copier"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// company crud operations
func getCompany(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var company model.Company
	if err := db.Preload("User").Preload("AccreditationLimits").Preload("EventLimits").Preload("GateLimits").Preload("Members.Accreditation").Preload("Autos").First(&company, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	if !checkRole(c, company, false) {
		return c.String(http.StatusForbidden, `{"error":"user does not have enough permissions"}`)
	}

	return c.JSON(http.StatusOK, company)
}

func createCompany(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}
	var companyIn model.CompanyIn
	var company model.Company
	if err := c.Bind(&companyIn); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}
	if companyIn.InEventMembersLimit > companyIn.MembersLimit {
		return c.String(http.StatusBadRequest, `Единовременный лимит участников выше максимального`)
	}
	userID, _ := utils.GetUser(c)
	copier.Copy(&company, &companyIn)
	company.EditorID = userID
	if err := db.Create(&company).Error; err != nil {
		dbErr := err.Error()
		if strings.Contains(dbErr, "UNIQUE") {
			dbErr = "Компания с указанным ИНН уже существует в системе"
		}
		return c.String(http.StatusInternalServerError, dbErr)
	}

	companyMembersLimit := company.MembersLimit
	// Create accreditation limits
	for idStr, limit := range companyIn.Accreditations {
		if limit > companyMembersLimit {
			companyMembersLimit = limit
		}
		accID, err := uuid.Parse(idStr)
		if err != nil {
			return c.String(http.StatusBadRequest, "Неверный ID аккредитации"+err.Error())
		}

		var accreditation model.Accreditation
		if err := db.Where("id = ?", accID).First(&accreditation).Error; err != nil {
			return c.String(http.StatusNotFound, "Аккредитация не найдена")
		}

		var existingCompanyAccreditationLimit model.CompanyAccreditationLimit
		if err := db.Where("company_id = ? AND accreditation_id = ?", company.ID, accreditation.ID).First(&existingCompanyAccreditationLimit).Error; err != nil {
			if err != gorm.ErrRecordNotFound {
				return c.String(http.StatusInternalServerError, err.Error())
			}
		} else {
			return c.String(http.StatusBadRequest, "Для компании уже существует данный лимит аккредитаций")
		}

		companyAccreditationLimit := model.CompanyAccreditationLimit{
			CompanyID:       company.ID,
			AccreditationID: accreditation.ID,
			Limit:           limit,
		}

		if err := db.Create(&companyAccreditationLimit).Error; err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
	}

	// Create event limits
	for idStr, limit := range companyIn.Events {
		if limit > companyMembersLimit {
			companyMembersLimit = limit
		}
		eventID, err := uuid.Parse(idStr)
		if err != nil {
			return c.String(http.StatusBadRequest, "Invalid event ID")
		}

		var event model.Event
		if err := db.Where("id = ?", eventID).First(&event).Error; err != nil {
			return c.String(http.StatusNotFound, "Мероприятие не найдено")
		}

		var existingCompanyEventLimit model.CompanyEventLimit
		if err := db.Where("company_id = ? AND event_id = ?", company.ID, event.ID).First(&existingCompanyEventLimit).Error; err != nil {
			if err != gorm.ErrRecordNotFound {
				return c.String(http.StatusInternalServerError, err.Error())
			}
		} else {
			return c.String(http.StatusBadRequest, "Для компании уже существует данный лимит мероприятий")
		}

		companyEventLimit := model.CompanyEventLimit{
			CompanyID: company.ID,
			EventID:   event.ID,
			Limit:     limit,
		}

		if err := db.Create(&companyEventLimit).Error; err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
	}
	if companyMembersLimit > company.MembersLimit {
		company.MembersLimit = companyMembersLimit
		if err := db.Save(&company).Error; err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
	}

	// Create gate limits
	for idStr, limit := range companyIn.Gates {

		if limit > companyMembersLimit {
			companyMembersLimit = limit
		}
		gateID, err := uuid.Parse(idStr)
		if err != nil {
			return c.String(http.StatusBadRequest, "Неверная доп. зона")
		}

		var gate model.Gate
		if err := db.Where("id = ?", gateID).First(&gate).Error; err != nil {
			return c.String(http.StatusNotFound, "Доп. зона не найдна")
		}

		var existingCompanyGateLimit model.CompanyGateLimit
		if err := db.Where("company_id = ? AND gate_id = ?", company.ID, gate.ID).First(&existingCompanyGateLimit).Error; err != nil {
			if err != gorm.ErrRecordNotFound {
				return c.String(http.StatusInternalServerError, err.Error())
			}
		} else {
			return c.String(http.StatusBadRequest, "Для компании уже существует данный лимит доп. зон")
		}

		companyGateLimit := model.CompanyGateLimit{
			CompanyID: company.ID,
			GateID:    gate.ID,
			Limit:     limit,
		}

		if err := db.Create(&companyGateLimit).Error; err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
	}
	if companyMembersLimit > company.MembersLimit {
		company.MembersLimit = companyMembersLimit
		if err := db.Save(&company).Error; err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
	}

	var user model.User
	user.Username = utils.GenerateRandomString(8)
	user.Password = utils.GenerateRandomString(8)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		// Consider how to handle this - maybe rollback company creation or log?
		return c.String(http.StatusInternalServerError, "Failed to hash password for company user")
	}
	user.Password = string(hashedPassword)
	user.Role = "company"
	user.CompanyID = company.ID

	if err := db.Create(&user).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	db.Preload("User").Preload("AccreditationLimits").Preload("EventLimits").Preload("GateLimits").Preload("Members.Accreditation").Preload("Autos").First(&company, company.ID)
	companyDetails, _ := json.Marshal(company)
	logCompanyHistory(db, c, company.ID, "create", string(companyDetails))
	return c.JSON(http.StatusCreated, company)
}

func updateCompany(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var company model.Company
	if err := db.Preload("User").First(&company, id).Error; err != nil {
		return c.String(http.StatusNotFound, `Компания не найдена`)
	}
	if !checkRole(c, company, true) {
		return c.String(http.StatusForbidden, `Пользователь не имеет достаточно полномочий`)
	}
	var companyIn model.CompanyIn
	if err := c.Bind(&companyIn); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	if companyIn.InEventMembersLimit > companyIn.MembersLimit {
		return c.String(http.StatusBadRequest, `Единовременный лимит участников выше максимального`)
	}

	copier.CopyWithOption(&company, &companyIn, copier.Option{IgnoreEmpty: true})

	// Fetch existing accreditation limits
	var existingAccreditationLimits []model.CompanyAccreditationLimit
	db.Where("company_id = ?", company.ID).Find(&existingAccreditationLimits)

	// Fetch existing event limits
	var existingEventLimits []model.CompanyEventLimit
	db.Where("company_id = ?", company.ID).Find(&existingEventLimits)

	// Fetch existing event limits
	var existingGateLimits []model.CompanyGateLimit
	db.Where("company_id = ?", company.ID).Find(&existingGateLimits)

	// Update or create accreditation limits
	for idStr, limit := range companyIn.Accreditations {
		if limit > company.MembersLimit {
			company.MembersLimit = limit
		}
		accID, err := uuid.Parse(idStr)
		if err != nil {
			return c.String(http.StatusBadRequest, "Неверный ID аккредитации"+err.Error())
		}

		var accreditation model.Accreditation
		if err := db.Where("id = ?", accID).First(&accreditation).Error; err != nil {
			return c.String(http.StatusNotFound, "Аккредитация не найдена")
		}

		var existingCompanyAccreditationLimit model.CompanyAccreditationLimit
		if err := db.Where("company_id = ? AND accreditation_id = ?", company.ID, accreditation.ID).First(&existingCompanyAccreditationLimit).Error; err != nil {
			if err != gorm.ErrRecordNotFound {
				return c.String(http.StatusInternalServerError, err.Error())
			}
			// Create a new limit if it doesn't exist
			existingCompanyAccreditationLimit = model.CompanyAccreditationLimit{
				CompanyID:       company.ID,
				AccreditationID: accreditation.ID,
				Limit:           limit,
			}
			db.Create(&existingCompanyAccreditationLimit)
		} else {
			// Update the existing limit
			existingCompanyAccreditationLimit.Limit = limit
			db.Save(&existingCompanyAccreditationLimit)
		}

		// Remove the updated limit from the existing limits slice
		for i, e := range existingAccreditationLimits {
			if e.AccreditationID == accreditation.ID {
				existingAccreditationLimits = append(existingAccreditationLimits[:i], existingAccreditationLimits[i+1:]...)
				break
			}
		}
	}

	// Update or create event limits (similar to accreditation limits)
	for idStr, limit := range companyIn.Events {
		if limit > company.MembersLimit {
			company.MembersLimit = limit
		}
		eventID, err := uuid.Parse(idStr)
		if err != nil {
			return c.String(http.StatusBadRequest, "Неверный ID мероприятия")
		}

		var event model.Event
		if err := db.Where("id = ?", eventID).First(&event).Error; err != nil {
			return c.String(http.StatusNotFound, "Мероприятие не найдено")
		}

		var existingCompanyEventLimit model.CompanyEventLimit
		if err := db.Where("company_id = ? AND event_id = ?", company.ID, event.ID).First(&existingCompanyEventLimit).Error; err != nil {
			if err != gorm.ErrRecordNotFound {
				return c.String(http.StatusInternalServerError, err.Error())
			}
			// Create a new limit if it doesn't exist
			existingCompanyEventLimit = model.CompanyEventLimit{
				CompanyID: company.ID,
				EventID:   event.ID,
				Limit:     limit,
			}
			db.Create(&existingCompanyEventLimit)
		} else {
			// Update the existing limit
			existingCompanyEventLimit.Limit = limit
			db.Save(&existingCompanyEventLimit)
		}

		// Remove the updated limit from the existing limits slice
		for i, e := range existingEventLimits {
			if e.EventID == event.ID {
				existingEventLimits = append(existingEventLimits[:i], existingEventLimits[i+1:]...)
				break
			}
		}
	}

	// Update or create event limits (similar to accreditation limits)
	for idStr, limit := range companyIn.Gates {
		if limit > company.MembersLimit {
			company.MembersLimit = limit
		}
		gateID, err := uuid.Parse(idStr)
		if err != nil {
			return c.String(http.StatusBadRequest, "Неверный ID доп. зоны")
		}

		var gate model.Gate
		if err := db.Where("id = ?", gateID).First(&gate).Error; err != nil {
			return c.String(http.StatusNotFound, "Доп. зона не найдена")
		}

		var existingCompanyGateLimit model.CompanyGateLimit
		if err := db.Where("company_id = ? AND gate_id = ?", company.ID, gate.ID).First(&existingCompanyGateLimit).Error; err != nil {
			if err != gorm.ErrRecordNotFound {
				return c.String(http.StatusInternalServerError, err.Error())
			}
			// Create a new limit if it doesn't exist
			existingCompanyGateLimit = model.CompanyGateLimit{
				CompanyID: company.ID,
				GateID:    gate.ID,
				Limit:     limit,
			}
			db.Create(&existingCompanyGateLimit)
		} else {
			// Update the existing limit
			existingCompanyGateLimit.Limit = limit
			db.Save(&existingCompanyGateLimit)
		}

		// Remove the updated limit from the existing limits slice
		for i, e := range existingGateLimits {
			if e.GateID == gate.ID {
				existingGateLimits = append(existingGateLimits[:i], existingGateLimits[i+1:]...)
				break
			}
		}
	}

	// Delete any event limits that were not present in the input
	// for _, limit := range existingEventLimits {
	// 	db.Delete(&limit)
	// }

	db.Save(&company)

	db.Preload("User").Preload("AccreditationLimits").Preload("EventLimits").Preload("GateLimits").Preload("Members.Accreditation").Preload("Autos").First(&company, company.ID)
	companyDetails, _ := json.Marshal(company)
	logCompanyHistory(db, c, company.ID, "update", string(companyDetails))

	return c.JSON(http.StatusOK, company)
}

func deleteCompany(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var company model.Company
	if err := db.Preload("User").First(&company, id).Error; err != nil {
		return c.String(http.StatusNotFound, `Компания не найдена`)
	}
	if !checkRole(c, company, true) {
		return c.String(http.StatusForbidden, `Пользователь не имеет достаточно полномочий`)
	}
	company.INN = fmt.Sprintf("%s-deleted-%d", company.INN, time.Now().UnixNano())
	db.Save(&company)
	if err := db.Delete(&model.Company{}, id).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	if err := db.Where("company_id = ?", id).Delete(&model.Member{}).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	logCompanyHistory(db, c, company.ID, "delete", "")
	return c.NoContent(http.StatusNoContent)
}
