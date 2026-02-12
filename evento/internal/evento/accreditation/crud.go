package accreditation

import (
	"errors"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/jinzhu/copier"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func getAccreditationsAll(c echo.Context) error {
	_, role := utils.GetUser(c)
	var accreditations []model.Accreditation
	var err error
	if role == "admin" || role == "operator" {
		// If role is admin, fetch all records
		err = db.Preload("Gates").Order("position desc").Find(&accreditations).Error
	} else {
		// If role is not admin, fetch only non-hidden records
		err = db.Preload("Gates").Order("position desc").Where("hidden = ?", false).Find(&accreditations).Error
	}
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, accreditations)
}

func getAccreditations(c echo.Context) error {
	_, role := utils.GetUser(c)
	var accreditations []model.Accreditation
	var err error
	if role == "admin" {
		// If role is admin, fetch all records
		err = db.Order("position desc").Find(&accreditations).Error
	} else {
		// If role is not admin, fetch only non-hidden records
		err = db.Order("position desc").Where("hidden = ?", false).Find(&accreditations).Error
	}
	// if err = db.Order("position desc").Find(&accreditations).Error; err != nil {
	// 	if errors.Is(err, gorm.ErrRecordNotFound) {
	// 		return c.String(http.StatusNotFound, `{"error":"accreds are not found"}`)
	// 	}
	// 	return c.String(http.StatusInternalServerError, err.Error())
	// }
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, accreditations)
}

// accreditation crud operations
func getAccreditation(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var accreditation model.Accreditation
	if err := db.Preload("Gates").First(&accreditation, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"accreditation is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, accreditation)
}

func createAccreditation(c echo.Context) error {
	var accreditation model.Accreditation
	if err := c.Bind(&accreditation); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}
	if err := db.Create(&accreditation).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, accreditation)
}

func updateAccreditation(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}

	var accreditation model.Accreditation

	if err := db.Preload("Gates").First(&accreditation, id).Error; err != nil {
		return c.String(http.StatusNotFound, `{"error":"accreditation is not found"}`)
	}

	var input struct {
		Name         string      `json:"name" gorm:"unique"`
		ShortName    string      `json:"short_name"`
		Description  string      `json:"description"`
		Position     uint        `json:"position"`
		Hidden       bool        `json:"hidden"`
		RequirePhoto bool        `json:"require_photo"`
		GateIDs      []uuid.UUID `json:"gate_ids"`
	}

	if err := c.Bind(&input); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	var newGates []model.Gate
	if err := db.Where("id in (?)", input.GateIDs).Find(&newGates).Error; err != nil {
		return c.String(http.StatusNotFound, "gates not found")
	}

	copier.Copy(&accreditation, &input)

	// Remove gates that are not included in the GateIDs field
	var gateIDsMap = make(map[uuid.UUID]bool)
	for _, gateID := range input.GateIDs {
		gateIDsMap[gateID] = true
	}

	var updatedGates []model.Gate
	for _, gate := range accreditation.Gates {
		if !gateIDsMap[gate.ID] {
			db.Model(&accreditation).Association("Gates").Delete(&gate)
		}
	}

	accreditation.Gates = updatedGates

	// Add new gates
	accreditation.Gates = append(accreditation.Gates, newGates...)

	db.Save(&accreditation)

	return c.JSON(http.StatusOK, accreditation)
}

// func updateAccreditation(c echo.Context) error {
// 	id := c.Param("id")
// 	var accreditation model.Accreditation
// 	if err := db.Preload("Gates").First(&accreditation, id).Error; err != nil {
// 		return c.String(http.StatusNotFound, `{"error":"accreditation is not found"}`)
// 	}
// 	var input struct {
// 		Name        string `json:"name" gorm:"unique"`
// 		Description string `json:"description"`
// 		Position    uint   `json:"position"`
// 		GateIDs     []uint `json:"gate_ids"`
// 	}
// 	if err := c.Bind(&input); err != nil {
// 		return c.String(http.StatusBadRequest, err.Error())
// 	}
// 	var gates []model.Gate
// 	if err := db.Where("id in (?)", input.GateIDs).Find(&gates).Error; err != nil {
// 		return c.String(http.StatusNotFound, "events not found")
// 	}
// 	copier.Copy(accreditation, input)

// 	// Delete gates that are not included in the GateIDs field
// 	var gateIDsMap map[uint]bool
// 	gateIDsMap = make(map[uint]bool)
// 	for _, gateID := range input.GateIDs {
// 		gateIDsMap[gateID] = true
// 	}
// 	for i, gate := range accreditation.Gates {
// 		if !gateIDsMap[gate.ID] {
// 			db.Delete(&gate)
// 			accreditation.Gates = append(accreditation.Gates[:i], accreditation.Gates[i+1:]...)
// 		}
// 	}
// 	// Add new gate
// 	accreditation.Gates = gates
// 	db.Save(&accreditation)
// 	return c.JSON(http.StatusOK, accreditation)
// }

func deleteAccreditation(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	if err := db.Delete(&model.Accreditation{}, id).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}
