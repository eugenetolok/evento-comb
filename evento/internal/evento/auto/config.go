package auto

import (
	"github.com/eugenetolok/evento/pkg/utils"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

var db *gorm.DB

// InitAutos entry point of autos
func InitAutos(g *echo.Group, dbInstance *gorm.DB, jwtConfig echojwt.Config) {
	db = dbInstance
	g.Use(echojwt.WithConfig(jwtConfig))
	g.GET("", getAutos, utils.RoleMiddleware([]string{"admin", "operator", "monitoring"}))
	g.GET("/editor", getEditorAutos, utils.RoleMiddleware([]string{"admin", "editor"}))
	g.GET("/company", getCompanyAutos, utils.RoleMiddleware([]string{"admin", "company"}))
	g.POST("", createAuto, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.GET("/:id", getAuto, utils.UUIDMiddleware)
	g.PUT("/:id", updateAuto, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.DELETE("/:id", deleteAuto, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.GET("/template", generateTemplate, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.POST("/import", importTemplate, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.GET("/givePass/:id", givePass, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.GET("/givePass2/:id", givePass2, utils.RoleMiddleware([]string{"admin", "operator"}))
}
