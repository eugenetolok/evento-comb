package model

import (
	"github.com/google/uuid"
)

// Auto model, info about auto which is allowed to be on event
type Auto struct {
	Model
	Number      string    `json:"number"`
	Type        string    `json:"type"`
	Route       string    `json:"route"`
	Description string    `json:"description"`
	CompanyID   uuid.UUID `gorm:"type:uuid" json:"company_id"`
	State       string    `json:"state"`
	Pass        bool      `json:"pass"`
	Pass2       bool      `json:"pass2"`
	Company     string    `json:"company"`
}

type AutoHistory struct {
	Model
	AutoID     uuid.UUID `gorm:"type:uuid" json:"auto_id"`
	UserID     uuid.UUID `gorm:"type:uuid" json:"user_id"`
	Details    string    `json:"details"`
	ChangeType string    `json:"change_type"`
}
