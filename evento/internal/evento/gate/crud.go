package gate

import (
	"errors"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/google/uuid"
	"github.com/jinzhu/copier"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func getAdditionalGates(c echo.Context) error {
	var gates []model.Gate
	if err := db.Order("position desc").Where("additional = ?", true).Find(&gates).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"gates are not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, gates)
}

func getGates(c echo.Context) error {
	var gates []model.Gate
	if err := db.Order("position desc").Find(&gates).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"gates are not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, gates)
}

// gate crud operations
func getGate(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var gate model.Gate
	if err := db.First(&gate, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"gate is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, gate)
}

func createGate(c echo.Context) error {
	var gate model.Gate
	// Use a map to hold the updated fields
	var gateIn model.GateIn
	if err := c.Bind(&gateIn); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}
	copier.CopyWithOption(&gate, &gateIn, copier.Option{IgnoreEmpty: true})
	if err := db.Create(&gate).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, gate)
}

func updateGate(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var gate model.Gate
	if err := db.First(&gate, id).Error; err != nil {
		return c.String(http.StatusNotFound, `{"error":"gate is not found"}`)
	}
	if err := c.Bind(&gate); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}
	db.Save(&gate)
	return c.JSON(http.StatusOK, gate)
}

func deleteGate(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	if err := db.Delete(&model.Gate{}, id).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}

// GetGatesExternal ...
func GetGatesExternal(c echo.Context) error {
	var gates []model.Gate
	if err := db.Order("position desc").Find(&gates).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"gates are not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, gates)
}
