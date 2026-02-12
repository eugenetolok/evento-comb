package model

import "github.com/google/uuid"

// CompanyGateLimit ...
type CompanyGateLimit struct {
	Model
	CompanyID uuid.UUID `gorm:"type:uuid" json:"company_id"`
	GateID    uuid.UUID `gorm:"type:uuid" json:"gate_id"`
	Limit     uint      `json:"limit"`
}

// CompanyAccreditationLimit ...
type CompanyAccreditationLimit struct {
	Model
	CompanyID       uuid.UUID `gorm:"type:uuid" json:"company_id"`
	AccreditationID uuid.UUID `gorm:"type:uuid" json:"accreditation_id"`
	Limit           uint      `json:"limit"`
}

// CompanyEventLimit ..
type CompanyEventLimit struct {
	Model
	CompanyID uuid.UUID `gorm:"type:uuid" json:"company_id"`
	EventID   uuid.UUID `gorm:"type:uuid" json:"event_id"`
	Limit     uint      `json:"limit"`
}

// CompanyIn  - input model
type CompanyIn struct {
	Name                string          `json:"name" sql:"COLLATE NOCASE"`
	INN                 string          `json:"inn"`
	Description         string          `json:"description"`
	MembersLimit        uint            `json:"members_limit"`
	InEventMembersLimit uint            `json:"in_event_members_limit"`
	CarsLimit           uint            `json:"cars_limit"`
	ResponsibleMemberID uuid.UUID       `gorm:"type:uuid" json:"responsible_member_id"`
	DefaultRoute        string          `json:"default_route"`
	Phone               string          `json:"phone"`
	Email               string          `json:"email"`
	Accreditations      map[string]uint `json:"accreditations"`
	Events              map[string]uint `json:"events"`
	Gates               map[string]uint `json:"gates"`
}

// Company model, includes info about company
type Company struct {
	Model
	Name                string                      `json:"name" sql:"COLLATE NOCASE"`
	INN                 string                      `json:"inn" gorm:"unique"`
	Description         string                      `json:"description"`
	CarsLimit           uint                        `json:"cars_limit"`
	MembersLimit        uint                        `json:"members_limit"`
	InEventMembersLimit uint                        `json:"in_event_members_limit"`
	ResponsibleMemberID uuid.UUID                   `gorm:"type:uuid" json:"responsible_member_id"`
	DefaultRoute        string                      `json:"default_route"`
	EditorID            uuid.UUID                   `gorm:"type:uuid" json:"editor_id"`
	Phone               string                      `json:"phone"`
	Email               string                      `json:"email"`
	User                User                        `json:"user"`
	Autos               []Auto                      `json:"autos" gorm:"foreignkey:CompanyID"`
	Members             []Member                    `json:"members" gorm:"foreignkey:CompanyID"`
	AccreditationLimits []CompanyAccreditationLimit `json:"accreditation_limits" gorm:"foreignkey:CompanyID"`
	EventLimits         []CompanyEventLimit         `json:"event_limits" gorm:"foreignkey:CompanyID"`
	GateLimits          []CompanyGateLimit          `json:"gate_limits" gorm:"foreignkey:CompanyID"`
}

// CompanyTableResponse ...
type CompanyTableResponse struct {
	ID      uuid.UUID `gorm:"type:uuid" json:"id"`
	Name    string    `json:"name"`
	Email   string    `json:"email"`
	Phone   string    `json:"phone"`
	Members struct {
		Count   int `json:"count"`
		Limit   int `json:"limit"`
		Waiting int `json:"waiting"`
	} `json:"members"`
	Autos struct {
		Count   int `json:"count"`
		Limit   int `json:"limit"`
		Waiting int `json:"waiting"`
	} `json:"autos"`
}

type CompanyHistory struct {
	Model
	CompanyID  uuid.UUID `gorm:"type:uuid" json:"company_id"`
	UserID     uuid.UUID `gorm:"type:uuid" json:"user_id"`
	Details    string    `json:"details"`
	ChangeType string    `json:"change_type"`
}
