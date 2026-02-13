package model

// EmailTemplate stores editable email templates managed by admins.
type EmailTemplate struct {
	Model
	Key         string `json:"key" gorm:"uniqueIndex;size:64;not null"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Subject     string `json:"subject" gorm:"type:text"`
	Body        string `json:"body" gorm:"type:text"`
}
