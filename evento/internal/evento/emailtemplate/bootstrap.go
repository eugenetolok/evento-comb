package emailtemplate

import (
	"errors"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/smtp"
	"gorm.io/gorm"
)

// EnsureAndLoad makes sure DB rows for managed email templates exist
// and applies persisted templates to SMTP runtime.
func EnsureAndLoad(db *gorm.DB) error {
	if err := db.AutoMigrate(&model.EmailTemplate{}); err != nil {
		return err
	}

	defaultTemplates := smtp.DefaultManagedTemplateDefinitions()
	for _, def := range defaultTemplates {
		var record model.EmailTemplate
		err := db.Where("key = ?", def.Key).First(&record).Error
		if err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			record = model.EmailTemplate{
				Key:         def.Key,
				Name:        def.Name,
				Description: def.Description,
				Subject:     def.Subject,
				Body:        def.Body,
			}
			if createErr := db.Create(&record).Error; createErr != nil {
				return createErr
			}
			continue
		}

		updates := map[string]interface{}{}
		if record.Name == "" {
			updates["name"] = def.Name
		}
		if record.Description == "" {
			updates["description"] = def.Description
		}
		if len(updates) > 0 {
			if updateErr := db.Model(&model.EmailTemplate{}).Where("id = ?", record.ID).Updates(updates).Error; updateErr != nil {
				return updateErr
			}
		}
	}

	var records []model.EmailTemplate
	if err := db.Find(&records).Error; err != nil {
		return err
	}

	smtp.ResetTemplateOverrides()
	for _, record := range records {
		if !smtp.IsManagedTemplateKey(record.Key) {
			continue
		}
		smtp.SetTemplateOverride(record.Key, record.Subject, record.Body)
	}

	return nil
}
