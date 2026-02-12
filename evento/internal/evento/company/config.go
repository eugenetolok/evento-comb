package company

import (
	"github.com/eugenetolok/evento/pkg/utils"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

var db *gorm.DB

// InitCompanies entry point of companys
func InitCompanies(g *echo.Group, dbInstance *gorm.DB, jwtConfig echojwt.Config) {
	db = dbInstance
	startCompanyFreezeScheduler(db)
	g.Use(echojwt.WithConfig(jwtConfig))
	// TODO: write restrict logic inside functions for all kind of roles (not middleware)
	g.GET("/search", searchCompanies, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.GET("/editor", editorCompanies, utils.RoleMiddleware([]string{"admin", "editor"}))
	g.GET("/my", getMyCompany, utils.RoleMiddleware([]string{"admin", "company"}))
	g.GET("/freeze/status", getCompanyFreezeStatus, utils.RoleMiddleware([]string{"admin"}))
	g.POST("/freeze/schedule", scheduleCompanyFreezeAll, utils.RoleMiddleware([]string{"admin"}))
	g.POST("/freeze/all", setCompanyFreezeAllNow, utils.RoleMiddleware([]string{"admin"}))
	g.POST("", createCompany, utils.RoleMiddleware([]string{"admin", "editor"}))
	g.GET("/:id", getCompany, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin", "editor"}))
	g.PUT("/:id", updateCompany, utils.RoleMiddleware([]string{"admin", "editor"}), utils.UUIDMiddleware)
	g.DELETE("/:id", deleteCompany, utils.RoleMiddleware([]string{"admin", "editor"}), utils.UUIDMiddleware)
	g.GET("/autos", getCompanyAutos, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.GET("/template", generateTemplate, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.POST("/import", importTemplate, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.GET("/limits", getCompanyLimits, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.GET("/:id/freeze", freezeCompany, utils.RoleMiddleware([]string{"admin", "editor"}))
	g.GET("/:id/printlimit", printLimit, utils.RoleMiddleware([]string{"admin", "operator"}))
	// gates
	g.POST("/:id/add-gate-to-members", addGateToAllMembers, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
	g.POST("/:id/remove-gate-from-members", removeGateFromAllMembers, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
}
