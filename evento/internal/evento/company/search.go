package company

import (
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/labstack/echo/v4"
)

func searchCompanies(c echo.Context) error {
	search := c.QueryParam("search")
	searchPattern := "%" + search + "%"

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
		LOWER(c.name) LIKE LOWER(?)
		AND c.deleted_at IS NULL
	`

	rows, err := db.Raw(query, searchPattern).Rows()
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
