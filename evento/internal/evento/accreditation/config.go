package accreditation

import (
	"github.com/eugenetolok/evento/pkg/utils"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

var db *gorm.DB

// InitAccreditations entry point of accreditations
func InitAccreditations(g *echo.Group, dbInstance *gorm.DB, jwtConfig echojwt.Config) {
	db = dbInstance
	g.Use(echojwt.WithConfig(jwtConfig))
	g.GET("", getAccreditations, utils.RoleMiddleware([]string{"admin", "editor", "operator"}))
	g.GET("/all", getAccreditationsAll, utils.RoleMiddleware([]string{"admin", "editor", "operator"}))
	g.POST("", createAccreditation, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/:id", getAccreditation, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
	g.PUT("/:id", updateAccreditation, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
	g.DELETE("/:id", deleteAccreditation, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
}
