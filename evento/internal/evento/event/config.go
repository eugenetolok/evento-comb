package event

import (
	"github.com/eugenetolok/evento/pkg/utils"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

var db *gorm.DB

// InitEvents entry point of events
func InitEvents(g *echo.Group, dbInstance *gorm.DB, jwtConfig echojwt.Config) {
	db = dbInstance
	g.Use(echojwt.WithConfig(jwtConfig))
	g.POST("", createEvent, utils.RoleMiddleware([]string{"admin"}))
	g.GET("", getEvents, utils.RoleMiddleware([]string{"admin", "editor", "operator"}))
	g.GET("/:id", getEvent, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
	g.PUT("/:id", updateEvent, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
	g.DELETE("/:id", deleteEvent, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
}
