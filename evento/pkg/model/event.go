package model

import "time"

// Event ...
type Event struct {
	Model
	Name        string    `json:"name" gorm:"unique"`
	Description string    `json:"description"`
	Position    uint      `json:"position"`
	TimeStart   time.Time `json:"time_start"`
	TimeEnd     time.Time `json:"time_end"`
}
