package model

import (
	"time"

	"github.com/google/uuid"
)

// UserIn model, safely add user
type UserIn struct {
	Model
	Password string `json:"password"`
	Username string `json:"username"`
	Role     string `json:"role"`
	Frozen   bool   `json:"frozen"`
}

// User model, we can add user
type User struct {
	Model
	Password     string     `json:"-"`
	Username     string     `json:"username"`
	Role         string     `json:"role"`
	Frozen       bool       `json:"frozen"`
	FrozenAt     *time.Time `json:"frozen_at,omitempty"`
	FrozenAction string     `json:"frozen_action,omitempty"`
	CompanyID    uuid.UUID  `gorm:"type:uuid" json:"company_id"`
	Companies    []Company  `json:"companies" gorm:"foreignkey:EditorID"`
}
