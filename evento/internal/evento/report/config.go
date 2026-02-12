package report

import (
	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

var db *gorm.DB
var dashboardSettings model.ReportDashboardSettings

// InitReports entry point of reports
func InitReports(g *echo.Group, dbInstance *gorm.DB, jwtConfig echojwt.Config, reportDashboardSettings model.ReportDashboardSettings) {
	db = dbInstance
	dashboardSettings = reportDashboardSettings
	g.Use(echojwt.WithConfig(jwtConfig))
	g.GET("/users", allUsers, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/autos", allAutos, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/members", allMembers, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/companies", allCompanies, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/dashboard", dashboard, utils.RoleMiddleware([]string{"admin"}))
}
