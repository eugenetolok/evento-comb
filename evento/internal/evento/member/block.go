package member

import (
	"errors"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func block(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var member model.Member
	if err := db.
		First(&member, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `Участник не найден`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	member.Blocked = !member.Blocked
	db.Save(&member)
	return c.JSON(http.StatusOK, member)
}
