package member

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func regenerateBarcode(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}

	var member model.Member
	if err := db.First(&member, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"member is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// Generate new barcode by adding a timestamp to make it unique
	newBarcode := utils.MD5Hash(fmt.Sprintf("%sFFF300001001001", member.ID.String()) + time.Now().String())
	member.Barcode = newBarcode

	if err := db.Save(&member).Error; err != nil {
		log.Printf("Failed to save member with new barcode: %v", err)
		return c.String(http.StatusInternalServerError, "Failed to update barcode")
	}

	return c.JSON(http.StatusOK, member)
}
