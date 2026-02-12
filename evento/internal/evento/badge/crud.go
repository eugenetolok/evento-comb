package badge

import (
	"errors"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

func getBadgeTemplates(c echo.Context) error {
	var templates []model.BadgeTemplate
	if err := db.Find(&templates).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, templates)
}

func getBadgeTemplate(c echo.Context) error {
	id, _ := uuid.Parse(c.Param("id"))
	var template model.BadgeTemplate
	if err := db.First(&template, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, "Template not found")
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, template)
}

func createBadgeTemplate(c echo.Context) error {
	var template model.BadgeTemplate
	if err := c.Bind(&template); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		// If this new template is set to default, unset all others first
		if template.IsDefault {
			if err := tx.Model(&model.BadgeTemplate{}).Where("is_default = ?", true).Update("is_default", false).Error; err != nil {
				return err
			}
		}

		// Create the new template
		if err := tx.Create(&template).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, template)
}

func updateBadgeTemplate(c echo.Context) error {
	id, _ := uuid.Parse(c.Param("id"))
	var template model.BadgeTemplate
	if err := db.First(&template, id).Error; err != nil {
		return c.String(http.StatusNotFound, "Template not found")
	}

	var input model.BadgeTemplate
	if err := c.Bind(&input); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		// If this template is being set to default, unset all others first
		if input.IsDefault && !template.IsDefault {
			if err := tx.Model(&model.BadgeTemplate{}).Where("id != ? AND is_default = ?", id, true).Update("is_default", false).Error; err != nil {
				return err
			}
		}

		// Update the template
		template.Name = input.Name
		template.TemplateJSON = input.TemplateJSON
		template.IsDefault = input.IsDefault
		if err := tx.Save(&template).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, template)
}

func deleteBadgeTemplate(c echo.Context) error {
	id, _ := uuid.Parse(c.Param("id"))
	if err := db.Delete(&model.BadgeTemplate{}, id).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}
