package member

import (
	"github.com/eugenetolok/evento/pkg/utils"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

var db *gorm.DB
var memberPhotoDir string

// InitMembers entry point of members
func InitMembers(g *echo.Group, dbInstance *gorm.DB, jwtConfig echojwt.Config, photoDir string) {
	db = dbInstance
	memberPhotoDir = photoDir
	// to here
	g.Use(echojwt.WithConfig(jwtConfig))
	// kick start
	g.GET("/gates/:gateId", getMembersByGate, utils.RoleMiddleware([]string{"admin", "monitoring"}))
	g.GET("/kick/:memberId/:gateId", removeGateFromMember, utils.RoleMiddleware([]string{"admin", "monitoring"}))
	g.POST("/kick/:memberId/:gateId", removeGateFromMember, utils.RoleMiddleware([]string{"admin", "monitoring"}))
	// kick end
	g.GET("/:id/block", block, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin", "monitoring"}))
	g.POST("/:id/block", block, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin", "monitoring"}))
	g.GET("/images", images, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.POST("/check", check, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.GET("/offline", offlineScanner, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.GET("/:id/memberPasses", memberPasses, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.GET("/search", searchMembers, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.GET("/smart-management", getSmartManagementData, utils.RoleMiddleware([]string{"admin"}))
	g.POST("/smart-management", updateSmartManagement, utils.RoleMiddleware([]string{"admin"}))
	g.GET("", getMembers, utils.RoleMiddleware([]string{"admin", "operator", "monitoring"}))
	g.POST("", createMember, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.GET("/:id", getMember, utils.UUIDMiddleware)
	g.PUT("/:id", updateMember, utils.UUIDMiddleware) // disable operator to be able to put on everything?
	g.POST("/:id/regenerate-barcode", regenerateBarcode, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.DELETE("/:id", deleteMember, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.GET("/:id/photo", serveMemberPhoto, utils.UUIDMiddleware)
	g.POST("/:id/photo", uploadMemberPhoto, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.POST("/import", importMembers, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.GET("/template", generateTemplate, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.GET("/company", getCompanyMembers, utils.RoleMiddleware([]string{"admin", "editor", "company"}))
	g.GET("/editor", getEditorMembers, utils.RoleMiddleware([]string{"admin", "editor"}))
	// state:
	g.GET("/setstate/:id", setState, utils.RoleMiddleware([]string{"admin"}))
	g.POST("/setstate/:id", setState, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/print/:id", print, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.POST("/print/:id", print, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.POST("/massPrint", massPrint, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.GET("/giveBangle/:id", giveBangle, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.POST("/giveBangle/:id", giveBangle, utils.RoleMiddleware([]string{"admin", "operator"}))
	// badge:
	g.GET("/:id/badge-payload", getBadgePayload, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin", "operator"}))
	g.POST("/badge-payloads-mass", getMassBadgePayloads, utils.RoleMiddleware([]string{"admin", "operator"}))
}
