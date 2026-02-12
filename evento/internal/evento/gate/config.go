package gate

import (
	"github.com/eugenetolok/evento/pkg/utils"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

var db *gorm.DB

// InitGates entry point of gates
func InitGates(g *echo.Group, dbInstance *gorm.DB, jwtConfig echojwt.Config) {
	db = dbInstance
	g.Use(echojwt.WithConfig(jwtConfig))
	g.POST("", createGate, utils.RoleMiddleware([]string{"admin"}))
	g.GET("", getGates, utils.RoleMiddleware([]string{"admin", "editor", "operator"}))
	g.GET("/additional", getAdditionalGates, utils.RoleMiddleware([]string{"admin", "editor"}))
	g.GET("/:id", getGate, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
	g.PUT("/:id", updateGate, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
	g.DELETE("/:id", deleteGate, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
}
