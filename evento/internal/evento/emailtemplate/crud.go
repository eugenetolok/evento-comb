package emailtemplate

import (
	"errors"
	"net/http"
	"strings"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/smtp"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type emailTemplateResponse struct {
	Key         string   `json:"key"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Subject     string   `json:"subject"`
	Body        string   `json:"body"`
	Variables   []string `json:"variables"`
}

type updateEmailTemplateRequest struct {
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

func getEmailTemplates(c echo.Context) error {
	var records []model.EmailTemplate
	if err := db.Order("key asc").Find(&records).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	items := make([]emailTemplateResponse, 0, len(records))
	for _, record := range records {
		if !smtp.IsManagedTemplateKey(record.Key) {
			continue
		}
		items = append(items, toEmailTemplateResponse(record))
	}

	return c.JSON(http.StatusOK, items)
}

func getEmailTemplate(c echo.Context) error {
	key := normalizeTemplateKey(c.Param("key"))
	if !smtp.IsManagedTemplateKey(key) {
		return c.String(http.StatusNotFound, `{"error":"template is not found"}`)
	}

	var record model.EmailTemplate
	if err := db.Where("key = ?", key).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"template is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, toEmailTemplateResponse(record))
}

func updateEmailTemplate(c echo.Context) error {
	key := normalizeTemplateKey(c.Param("key"))
	if !smtp.IsManagedTemplateKey(key) {
		return c.String(http.StatusNotFound, `{"error":"template is not found"}`)
	}

	var request updateEmailTemplateRequest
	if err := c.Bind(&request); err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid request body"}`)
	}

	request.Subject = strings.TrimSpace(request.Subject)
	request.Body = strings.TrimSpace(request.Body)
	if request.Subject == "" || request.Body == "" {
		return c.String(http.StatusBadRequest, `{"error":"subject and body are required"}`)
	}

	if err := smtp.ValidateTemplateContent(key, request.Subject, request.Body); err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid template syntax or placeholders"}`)
	}

	var record model.EmailTemplate
	if err := db.Where("key = ?", key).First(&record).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusInternalServerError, err.Error())
		}

		defaultDef, _ := smtp.DefaultManagedTemplate(key)
		record = model.EmailTemplate{
			Key:         key,
			Name:        defaultDef.Name,
			Description: defaultDef.Description,
			Subject:     request.Subject,
			Body:        request.Body,
		}
		if createErr := db.Create(&record).Error; createErr != nil {
			return c.String(http.StatusInternalServerError, createErr.Error())
		}
		smtp.SetTemplateOverride(record.Key, record.Subject, record.Body)
		return c.JSON(http.StatusOK, toEmailTemplateResponse(record))
	}

	record.Subject = request.Subject
	record.Body = request.Body
	if err := db.Save(&record).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	smtp.SetTemplateOverride(record.Key, record.Subject, record.Body)
	return c.JSON(http.StatusOK, toEmailTemplateResponse(record))
}

func resetEmailTemplate(c echo.Context) error {
	key := normalizeTemplateKey(c.Param("key"))
	defaultDef, ok := smtp.DefaultManagedTemplate(key)
	if !ok {
		return c.String(http.StatusNotFound, `{"error":"template is not found"}`)
	}

	var record model.EmailTemplate
	if err := db.Where("key = ?", key).First(&record).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusInternalServerError, err.Error())
		}
		record = model.EmailTemplate{
			Key:         key,
			Name:        defaultDef.Name,
			Description: defaultDef.Description,
			Subject:     defaultDef.Subject,
			Body:        defaultDef.Body,
		}
		if createErr := db.Create(&record).Error; createErr != nil {
			return c.String(http.StatusInternalServerError, createErr.Error())
		}
		smtp.SetTemplateOverride(record.Key, record.Subject, record.Body)
		return c.JSON(http.StatusOK, toEmailTemplateResponse(record))
	}

	record.Name = defaultDef.Name
	record.Description = defaultDef.Description
	record.Subject = defaultDef.Subject
	record.Body = defaultDef.Body
	if err := db.Save(&record).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	smtp.SetTemplateOverride(record.Key, record.Subject, record.Body)
	return c.JSON(http.StatusOK, toEmailTemplateResponse(record))
}

func toEmailTemplateResponse(record model.EmailTemplate) emailTemplateResponse {
	return emailTemplateResponse{
		Key:         record.Key,
		Name:        record.Name,
		Description: record.Description,
		Subject:     record.Subject,
		Body:        record.Body,
		Variables:   smtp.GetTemplateVariables(record.Key),
	}
}

func normalizeTemplateKey(key string) string {
	return strings.TrimSpace(strings.ToLower(key))
}
