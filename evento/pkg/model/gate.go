package model

// Gate model, includes
type Gate struct {
	Model
	Name           string          `json:"name"`
	ShortName      string          `json:"short_name"`
	Description    string          `json:"description"`
	Position       uint            `json:"position"`
	External       bool            `json:"external"`
	Additional     bool            `json:"additional"`
	RequirePhoto   bool            `json:"require_photo"`
	Accreditations []Accreditation `json:"accreditations" gorm:"many2many:accreditation_gates;"`
}

// GateIn model, includes
type GateIn struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Position    uint   `json:"position"`
	External    bool   `json:"external"`
	Additional  bool   `json:"additional"`
}
