package model

// Accreditation model, info about accreditation which is allowed to be on event
type Accreditation struct {
	Model
	Name         string   `json:"name" gorm:"unique"`
	ShortName    string   `json:"short_name"`
	Description  string   `json:"description"`
	Position     uint     `json:"position"`
	Hidden       bool     `json:"hidden"`
	RequirePhoto bool     `json:"require_photo"`
	Gates        []Gate   `json:"gates" gorm:"many2many:accreditation_gates;"`
	Members      []Member `json:"members" gorm:"foreignkey:AccreditationID"`
}
