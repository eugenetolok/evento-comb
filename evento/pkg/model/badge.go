package model

// BadgeTemplate stores a JSON configuration for a badge layout.
type BadgeTemplate struct {
	Model
	Name         string `json:"name" gorm:"unique"`
	TemplateJSON string `json:"template_json" gorm:"type:text"`
	IsDefault    bool   `json:"is_default"` // To select which template to use by default
}
