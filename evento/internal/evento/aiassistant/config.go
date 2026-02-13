package aiassistant

import (
	"database/sql"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
)

var (
	config       model.AIAssistantSettings
	databasePath string
	readOnlyDB   *sql.DB
)

// InitAIAssistant wires AI assistant endpoints.
func InitAIAssistant(g *echo.Group, jwtConfig echojwt.Config, cfg model.AIAssistantSettings, dbPath string) {
	config = cfg
	databasePath = dbPath

	g.Use(echojwt.WithConfig(jwtConfig))
	g.GET("/schema", getSchema, utils.RoleMiddleware([]string{"admin"}))
	g.POST("/query", runQuery, utils.RoleMiddleware([]string{"admin"}))
	g.POST("/export", exportQuery, utils.RoleMiddleware([]string{"admin"}))
}
