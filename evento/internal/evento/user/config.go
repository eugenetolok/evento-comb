package user

import (
	"github.com/eugenetolok/evento/pkg/utils"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

var db *gorm.DB

// InitUsers entry point of users
func InitUsers(g *echo.Group, dbInstance *gorm.DB, jwtConfig echojwt.Config) {
	db = dbInstance
	g.Use(echojwt.WithConfig(jwtConfig))
	g.GET("/me", me)
	g.GET("/frozen", frozen)
	g.GET("", getUsers, utils.RoleMiddleware([]string{"admin"}))
	g.POST("", createUser, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/:id", getUser, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
	g.PUT("/:id", updateUser, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
	g.DELETE("/:id", deleteUser, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/search", searchUsers, utils.RoleMiddleware([]string{"admin"}))
	g.GET("/myCompanies", getUserCompanies)
	g.GET("/myCompany", getUserCompany)
	g.POST("/resetPassword/:id", resetPassword, utils.UUIDMiddleware, utils.RoleMiddleware([]string{"admin", "editor"}))
}
