package emailtemplate

import (
	"github.com/eugenetolok/evento/pkg/utils"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

var db *gorm.DB

// InitEmailTemplates wires admin endpoints for editable email templates.
func InitEmailTemplates(g *echo.Group, dbInstance *gorm.DB, jwtConfig echojwt.Config) {
	db = dbInstance
	g.Use(echojwt.WithConfig(jwtConfig))

	g.GET("", getEmailTemplates, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/:key", getEmailTemplate, utils.RoleMiddleware([]string{"admin"}))
	g.PUT("/:key", updateEmailTemplate, utils.RoleMiddleware([]string{"admin"}))
	g.POST("/:key/reset", resetEmailTemplate, utils.RoleMiddleware([]string{"admin"}))
}
