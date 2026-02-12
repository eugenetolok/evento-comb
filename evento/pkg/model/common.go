package model

import (
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Flags struct {
	AddUser        bool   `json:"addUser"`
	ShowYamlStruct bool   `json:"showYamlStruct"`
	Migrate        bool   `json:"migrate"`
	DropTable      bool   `json:"drop"`
	Port           string `json:"port"`
}

type Model struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;" json:"id"`
	CreatedAt time.Time      `json:"-"`
	UpdatedAt time.Time      `json:"-"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate will set a UUID rather than numeric ID.
func (model *Model) BeforeCreate(tx *gorm.DB) (err error) {
	if model.ID == uuid.Nil { // Only generate if ID is not already set (e.g., during seeding)
		model.ID = uuid.New()
	}
	return
}

// JwtCustomClaims are custom claims extending default ones.
// See https://github.com/golang-jwt/jwt for more examples
type JwtCustomClaims struct {
	ID   uuid.UUID `json:"id"`
	Role string    `json:"role"`
	jwt.RegisteredClaims
}
