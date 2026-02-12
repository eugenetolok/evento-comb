package report

import (
	"github.com/eugenetolok/evento/pkg/utils"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

var db *gorm.DB

// InitReports entry point of reports
func InitReports(g *echo.Group, dbInstance *gorm.DB, jwtConfig echojwt.Config) {
	db = dbInstance
	g.Use(echojwt.WithConfig(jwtConfig))
	g.GET("/users", allUsers, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/autos", allAutos, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/members", allMembers, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/companies", allCompanies, utils.RoleMiddleware([]string{"admin"}))
}
