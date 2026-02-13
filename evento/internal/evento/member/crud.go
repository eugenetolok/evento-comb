package member

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
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// member crud operations
func getMembers(c echo.Context) error {
	var members []model.Member
	if err := db.Preload("Accreditation.Gates").Preload("Gates").Find(&members).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `Участник не найден`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, members)
}

// member crud operations
func getMember(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var member model.Member
	if err := db.
		Preload("Accreditation.Gates", func(db *gorm.DB) *gorm.DB {
			return db.Order("position DESC")
		}).
		Preload("Events").
		Preload("Gates").
		First(&member, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `Участник не найден`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	var company model.Company
	if err := db.Preload("User").First(&company, member.CompanyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `ID компании неверный`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	if !utils.CheckCompanyGetPermission(c, company) {
		return c.String(http.StatusNotFound, `У вас недостаточно прав, чтобы сделать данный запрос`)
	}

	return c.JSON(http.StatusOK, member)
}

func createMember(c echo.Context) error {
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
			// Allow admin/editor to specify company via query param
			if c.QueryParam("company_id") == "" {
				return c.String(http.StatusBadRequest, `ID Компании не указан`)
			}
			// If query param was invalid, error is already set
		} else {
			// User is 'company', force their own company ID
			companyID = user.CompanyID
			err = nil // reset error
		}

	}
	if err != nil { // Handle parsing error if not company user
		return c.String(http.StatusBadRequest, `Неверный ID Компании`)
	}

	// get member company which will be assigned (check permissions)
	var company model.Company
	if err := db.Preload("User").First(&company, companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `ID компании неверный`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	if !utils.CheckCompanyManagePermission(c, company) {
		return c.String(http.StatusUnauthorized, `У вас недостаточно прав, чтобы сделать данный запрос`)
	}

	// create new member object
	var member model.Member
	member.CompanyID = company.ID // Set company ID *before* potentially needing it in validation

	// Use transaction for create + limit check
	err = db.Transaction(func(tx *gorm.DB) error {
		// Call memberWriteLogic (includes binding AND limit checks)
		// Pass nil for memberID because we are creating
		writeErr := memberWriteLogic(c, &member, tx, nil)
		if writeErr != nil {
			return writeErr // Rollback transaction
		}
		member.CompanyName = company.Name

		// If memberWriteLogic succeeded, create the member
		if createErr := tx.Create(&member).Error; createErr != nil {
			dbErr := createErr.Error()
			if strings.Contains(dbErr, "UNIQUE") {
				dbErr = "Участник с указанным документом уже существует в системе"
			}
			// Return specific error to rollback transaction
			return echo.NewHTTPError(http.StatusInternalServerError, dbErr)
		}
		if member.Barcode == "" {
			barcode, barcodeErr := generateUniqueMemberBarcode(tx)
			if barcodeErr != nil {
				return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("Ошибка генерации штрихкода: %v", barcodeErr))
			}
			member.Barcode = barcode
			if err := tx.Model(&model.Member{}).Where("id = ?", member.ID).Update("barcode", member.Barcode).Error; err != nil {
				return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("Ошибка генерации штрихкода: %v", err))
			}
		}
		return nil // Commit transaction
	})

	if err != nil {
		// Handle errors returned from the transaction (either from writeLogic or create)
		if he, ok := err.(*echo.HTTPError); ok {
			return c.String(he.Code, he.Message.(string))
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// Reload member with associations for the response
	db.Preload("Accreditation.Gates").Preload("Events").Preload("Gates").First(&member, member.ID)
	memberDetails, _ := json.Marshal(member)
	logMemberHistory(db, c, member.ID, "create", string(memberDetails))
	return c.JSON(http.StatusCreated, member)
}

func updateMember(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}

	var member model.Member
	// Preload everything needed for response AND permission checks
	if err := db.Preload("Company.User").Preload("Company").Preload("Accreditation").Preload("Events").Preload("Gates").First(&member, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `Участник не найден`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// Permission check uses the preloaded Company from member
	if !utils.CheckCompanyManagePermission(c, member.Company) {
		return c.String(http.StatusUnauthorized, `У вас недостаточно прав, чтобы сделать данный запрос`)
	}

	// Use transaction for update + limit check
	err = db.Transaction(func(tx *gorm.DB) error {
		// Call memberWriteLogic (includes binding AND limit checks)
		// Pass the existing member's ID
		writeErr := memberWriteLogic(c, &member, tx, &member.ID)
		if writeErr != nil {
			return writeErr // Rollback transaction
		}

		// If memberWriteLogic succeeded, proceed with updates
		// Update main fields using the modified 'member' object
		updateMap := map[string]interface{}{
			"Surname":         member.Surname,
			"Name":            member.Name,
			"Middlename":      member.Middlename,
			"Birth":           member.Birth,
			"Document":        member.Document,
			"Responsible":     member.Responsible,
			"Blocked":         member.Blocked,
			"InZone":          member.InZone,
			"AccreditationID": member.AccreditationID, // Use the ID set in memberWriteLogic
		}
		if err := tx.Model(&model.Member{}).Where("id = ?", member.ID).Updates(updateMap).Error; err != nil {
			dbErr := err.Error()
			if strings.Contains(dbErr, "UNIQUE") {
				dbErr = "Участник с указанным документом уже существует в системе"
			}
			// Rollback transaction
			return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("Ошибка при обновлении участника: %s", dbErr))
		}

		// Update many-to-many relationships using Replace
		// GORM's Replace handles adding new and removing old associations.
		// The member.Events and member.Gates were updated in memberWriteLogic
		if err := tx.Model(&member).Association("Events").Replace(member.Events); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("Ошибка при обновлении мероприятий: %v", err))
		}
		if err := tx.Model(&member).Association("Gates").Replace(member.Gates); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("Ошибка при обновлении зон: %v", err))
		}

		return nil // Commit transaction
	})

	if err != nil {
		// Handle errors returned from the transaction
		if he, ok := err.(*echo.HTTPError); ok {
			return c.String(he.Code, he.Message.(string))
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// Reload member with associations for the response after successful transaction
	db.Preload("Accreditation.Gates").Preload("Events").Preload("Gates").First(&member, member.ID)
	memberDetails, _ := json.Marshal(member)
	logMemberHistory(db, c, member.ID, "update", string(memberDetails))
	return c.JSON(http.StatusOK, member)
}

func deleteMember(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var member model.Member
	if err := db.First(&member, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `Участник не найден`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	var company model.Company
	if err := db.Preload("User").First(&company, member.CompanyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `ID компании неверный`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	if !utils.CheckCompanyManagePermission(c, company) {
		return c.String(http.StatusUnauthorized, `У вас недостаточно прав, чтобы сделать данный запрос`)
	}
	member.Document = fmt.Sprintf("%s-deleted-%d", member.Document, time.Now().UnixNano())
	db.Save(&member)
	if err := db.Delete(&model.Member{}, id).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	logMemberHistory(db, c, member.ID, "delete", "")
	return c.NoContent(http.StatusNoContent)
}
