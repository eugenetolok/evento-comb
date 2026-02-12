package member

import (
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/labstack/echo/v4"
)

func searchMembers(c echo.Context) error {
	search := c.QueryParam("search")
	var members []model.Member
	searchPattern := "%" + search + "%"
	db.Where("LOWER(surname) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?) OR LOWER(middlename) LIKE LOWER(?)", searchPattern, searchPattern, searchPattern).Find(&members)
	return c.JSON(http.StatusOK, members)
}
