package user

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type userTableItem struct {
	ID                    uuid.UUID `json:"id"`
	Username              string    `json:"username"`
	Role                  string    `json:"role"`
	Frozen                bool      `json:"frozen"`
	CompanyID             uuid.UUID `json:"company_id"`
	CompanyName           string    `json:"company_name"`
	CompanyDeleted        bool      `json:"company_deleted"`
	ManagedCompaniesCount int64     `json:"managed_companies_count"`
	CreatedCompaniesCount int64     `json:"created_companies_count"`
}

type userCreatedCompanyItem struct {
	ID              uuid.UUID `json:"id"`
	Name            string    `json:"name"`
	INN             string    `json:"inn"`
	CreatedAt       time.Time `json:"created_at"`
	IsDeleted       bool      `json:"is_deleted"`
	CurrentEditorID uuid.UUID `json:"current_editor_id"`
}

type companyCreateSnapshot struct {
	Name string `json:"name"`
	INN  string `json:"inn"`
}

func getUsersTable(c echo.Context) error {
	var users []model.User
	if err := db.Select("id", "username", "role", "frozen", "company_id").Find(&users).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	companyIDs := make([]uuid.UUID, 0)
	for _, user := range users {
		if user.CompanyID == uuid.Nil {
			continue
		}
		companyIDs = append(companyIDs, user.CompanyID)
	}

	type companyRow struct {
		ID        uuid.UUID      `gorm:"column:id"`
		Name      string         `gorm:"column:name"`
		DeletedAt gorm.DeletedAt `gorm:"column:deleted_at"`
	}
	companyMap := make(map[uuid.UUID]companyRow)
	if len(companyIDs) > 0 {
		var companies []companyRow
		if err := db.Unscoped().
			Model(&model.Company{}).
			Select("id", "name", "deleted_at").
			Where("id IN ?", companyIDs).
			Find(&companies).Error; err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
		for _, company := range companies {
			companyMap[company.ID] = company
		}
	}

	type editorCountRow struct {
		EditorID uuid.UUID `gorm:"column:editor_id"`
		Count    int64     `gorm:"column:count"`
	}
	managedCounts := make(map[uuid.UUID]int64)
	var editorRows []editorCountRow
	if err := db.Model(&model.Company{}).
		Select("editor_id, COUNT(*) AS count").
		Where("deleted_at IS NULL").
		Group("editor_id").
		Scan(&editorRows).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	for _, row := range editorRows {
		managedCounts[row.EditorID] = row.Count
	}

	type creatorCountRow struct {
		UserID uuid.UUID `gorm:"column:user_id"`
		Count  int64     `gorm:"column:count"`
	}
	createdCounts := make(map[uuid.UUID]int64)
	var creatorRows []creatorCountRow
	if err := db.Model(&model.CompanyHistory{}).
		Select("user_id, COUNT(DISTINCT company_id) AS count").
		Where("change_type = ?", "create").
		Group("user_id").
		Scan(&creatorRows).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	for _, row := range creatorRows {
		createdCounts[row.UserID] = row.Count
	}

	result := make([]userTableItem, 0, len(users))
	for _, user := range users {
		item := userTableItem{
			ID:                    user.ID,
			Username:              user.Username,
			Role:                  user.Role,
			Frozen:                user.Frozen,
			CompanyID:             user.CompanyID,
			ManagedCompaniesCount: managedCounts[user.ID],
			CreatedCompaniesCount: createdCounts[user.ID],
		}

		if company, exists := companyMap[user.CompanyID]; exists {
			item.CompanyName = strings.TrimSpace(company.Name)
			item.CompanyDeleted = company.DeletedAt.Valid
		}
		if user.Role == "company" && item.CompanyName == "" {
			item.CompanyName = "Компания не найдена"
			item.CompanyDeleted = true
		}

		result = append(result, item)
	}

	return c.JSON(http.StatusOK, result)
}

func getUserCreatedCompanies(c echo.Context) error {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}

	var user model.User
	if err := db.Select("id").First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var historyRows []model.CompanyHistory
	if err := db.
		Where("user_id = ? AND change_type = ?", userID, "create").
		Order("created_at DESC").
		Find(&historyRows).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	if len(historyRows) == 0 {
		return c.JSON(http.StatusOK, []userCreatedCompanyItem{})
	}

	seen := make(map[uuid.UUID]struct{}, len(historyRows))
	result := make([]userCreatedCompanyItem, 0, len(historyRows))
	for _, history := range historyRows {
		if _, exists := seen[history.CompanyID]; exists {
			continue
		}
		seen[history.CompanyID] = struct{}{}

		item := userCreatedCompanyItem{
			ID:        history.CompanyID,
			CreatedAt: history.CreatedAt,
		}

		var company model.Company
		if err := db.Unscoped().
			Select("id", "name", "inn", "editor_id", "deleted_at").
			First(&company, history.CompanyID).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return c.String(http.StatusInternalServerError, err.Error())
			}
		} else {
			item.Name = strings.TrimSpace(company.Name)
			item.INN = strings.TrimSpace(company.INN)
			item.CurrentEditorID = company.EditorID
			item.IsDeleted = company.DeletedAt.Valid
		}

		if item.Name == "" || item.INN == "" {
			var snapshot companyCreateSnapshot
			if jsonErr := json.Unmarshal([]byte(history.Details), &snapshot); jsonErr == nil {
				if item.Name == "" {
					item.Name = strings.TrimSpace(snapshot.Name)
				}
				if item.INN == "" {
					item.INN = strings.TrimSpace(snapshot.INN)
				}
			}
		}
		if item.Name == "" {
			item.Name = "Без названия"
		}

		result = append(result, item)
	}

	return c.JSON(http.StatusOK, result)
}
