package badge

import (
	"github.com/eugenetolok/evento/pkg/utils"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

var db *gorm.DB

// InitBadges entry point of badges
func InitBadges(g *echo.Group, dbInstance *gorm.DB, jwtConfig echojwt.Config) {
	db = dbInstance
	g.Use(echojwt.WithConfig(jwtConfig))
	g.POST("", createBadgeTemplate, utils.RoleMiddleware([]string{"admin"}))
	g.GET("", getBadgeTemplates, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/:id", getBadgeTemplate, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
	g.PUT("/:id", updateBadgeTemplate, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
	g.DELETE("/:id", deleteBadgeTemplate, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
}
