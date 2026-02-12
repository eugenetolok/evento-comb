package company

import (
	"fmt"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/labstack/echo/v4"
)

func editorCompanies(c echo.Context) error {
	userID, _ := utils.GetUser(c)
	fmt.Println("$$$$$$$$$$$$$$$", userID)
	query := `
	SELECT
		c.id,
		c.name,
		c.email,
		c.phone,
		c.members_limit,
		(SELECT COUNT(*) FROM members WHERE company_id = c.id) AS member_count,
		(SELECT COUNT(*) FROM members WHERE company_id = c.id AND state = 'waiting') AS member_waiting,
		c.cars_limit,
		(SELECT COUNT(*) FROM autos WHERE company_id = c.id) AS auto_count,
		(SELECT COUNT(*) FROM autos WHERE company_id = c.id AND state = 'waiting') AS auto_waiting
	FROM
		companies c
	WHERE
		c.editor_id = ?
		AND c.deleted_at IS NULL
	`

	rows, err := db.Raw(query, userID).Rows()
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	defer rows.Close()

	var response []model.CompanyTableResponse

	for rows.Next() {
		var cr model.CompanyTableResponse
		err := rows.Scan(
			&cr.ID,
			&cr.Name,
			&cr.Email,
			&cr.Phone,
			&cr.Members.Limit,
			&cr.Members.Count,
			&cr.Members.Waiting,
			&cr.Autos.Limit,
			&cr.Autos.Count,
			&cr.Autos.Waiting,
		)
		if err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
		response = append(response, cr)
	}

	if response == nil {
		return c.JSON(http.StatusOK, []model.CompanyTableResponse{})
	}
	return c.JSON(http.StatusOK, response)
}
