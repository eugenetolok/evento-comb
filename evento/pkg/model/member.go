package model

import (
	"time"

	"github.com/google/uuid"
)

type MemberIn struct {
	Name            string    `json:"name"`
	Surname         string    `json:"surname"`
	Middlename      string    `json:"middlename"`
	DocumnetType    string    `json:"document_type"` // Passport-RF, etc
	Document        string    `json:"document"`
	Email           string    `json:"email"`
	Phone           string    `json:"phone"`
	Responsible     bool      `json:"responsible"`
	Birth           time.Time `json:"birth"`
	AccreditationID uuid.UUID `gorm:"type:uuid" json:"accreditation_id"`
	EventIDs        []uint    `json:"event_ids"`
}

// Member model, includes custom fields. Info about member of event
type Member struct {
	Model
	Document         string        `json:"document" gorm:"unique"`
	PhotoFilename    string        `json:"photo_filename,omitempty"`
	Name             string        `json:"name"`
	Surname          string        `json:"surname"`
	Middlename       string        `json:"middlename"`
	CompanyName      string        `json:"company_name"`
	Email            string        `json:"email"`
	Phone            string        `json:"phone"`
	Barcode          string        `json:"barcode"`
	State            string        `json:"state"`
	Description      string        `json:"description"`
	Birth            time.Time     `json:"birth"`
	Responsible      bool          `json:"responsible"`
	PrintCount       uint          `json:"print_count"`
	GivenBangleCount uint          `json:"given_bangle_count"`
	CompanyID        uuid.UUID     `gorm:"type:uuid" json:"company_id"`
	AccreditationID  uuid.UUID     `gorm:"type:uuid" json:"accreditation_id"`
	InZone           bool          `json:"in_zone" sql:"DEFAULT:false"`
	GivenBangle      bool          `json:"given_bangle" sql:"DEFAULT:false"`
	Blocked          bool          `json:"blocked" sql:"DEFAULT:false"`
	Accreditation    Accreditation `json:"accreditation"`
	Events           []Event       `json:"events" gorm:"many2many:member_events;"`
	Gates            []Gate        `json:"gates" gorm:"many2many:member_gates;"`
	Company          Company       `gorm:"foreignKey:CompanyID" json:"-"` // Changed name, added omitempty
}

// MemberPass - log member enters
type MemberPass struct {
	Model
	MemberID uuid.UUID `gorm:"type:uuid" json:"member_id"`
	GateID   uuid.UUID `gorm:"type:uuid" json:"gate_id"`
}

// MemberPrint - log member enters
type MemberPrint struct {
	Model
	MemberID uuid.UUID `gorm:"type:uuid" json:"member_id"`
}

type MemberHistory struct {
	Model
	MemberID   uuid.UUID `gorm:"type:uuid" json:"member_id"`
	UserID     uuid.UUID `gorm:"type:uuid" json:"user_id"`
	Details    string    `json:"details"`
	ChangeType string    `json:"change_type"`
}
