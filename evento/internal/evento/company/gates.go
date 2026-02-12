package company

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// AddGateToAllMembers добавляет указанную зону доступа всем участникам компании.
func addGateToAllMembers(c echo.Context) error {
	companyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid company id"}`)
	}

	var body struct {
		GateID uuid.UUID `json:"gate_id"`
	}

	if err := c.Bind(&body); err != nil {
		return c.String(http.StatusBadRequest, "Invalid request body: "+err.Error())
	}

	if body.GateID == uuid.Nil {
		return c.String(http.StatusBadRequest, `{"error":"gate_id is required"}`)
	}

	// Выполняем SQL-запрос для массового добавления
	// INSERT OR IGNORE предотвращает ошибки, если связь уже существует
	query := `INSERT OR IGNORE INTO member_gates (member_id, gate_id) SELECT id, ? FROM members WHERE company_id = ?`
	result := db.Exec(query, body.GateID.String(), companyID.String())

	if result.Error != nil {
		return c.String(http.StatusInternalServerError, "Database error: "+result.Error.Error())
	}

	return c.JSON(http.StatusOK, echo.Map{
		"message":       "Gate added to all company members successfully.",
		"rows_affected": result.RowsAffected,
	})
}

// RemoveGateFromAllMembers удаляет указанную зону доступа у всех участников компании.
func removeGateFromAllMembers(c echo.Context) error {
	companyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid company id"}`)
	}

	var body struct {
		GateID uuid.UUID `json:"gate_id"`
	}

	if err := c.Bind(&body); err != nil {
		return c.String(http.StatusBadRequest, "Invalid request body: "+err.Error())
	}

	if body.GateID == uuid.Nil {
		return c.String(http.StatusBadRequest, `{"error":"gate_id is required"}`)
	}

	// SQL-запрос для массового удаления записей из join-таблицы
	// Он находит все ID участников для данной компании и удаляет записи с указанным gate_id
	query := `DELETE FROM member_gates WHERE gate_id = ? AND member_id IN (SELECT id FROM members WHERE company_id = ?)`
	result := db.Exec(query, body.GateID.String(), companyID.String())

	if result.Error != nil {
		return c.String(http.StatusInternalServerError, "Database error: "+result.Error.Error())
	}

	return c.JSON(http.StatusOK, echo.Map{
		"message":       "Gate removed from all company members successfully.",
		"rows_affected": result.RowsAffected,
	})
}
