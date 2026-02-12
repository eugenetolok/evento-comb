package evento

import (
	"log"
	"net/http"

	"github.com/eugenetolok/evento/internal/evento/accreditation"
	"github.com/eugenetolok/evento/internal/evento/auto"
	"github.com/eugenetolok/evento/internal/evento/badge"
	"github.com/eugenetolok/evento/internal/evento/company"
	"github.com/eugenetolok/evento/internal/evento/event"
	"github.com/eugenetolok/evento/internal/evento/gate"
	"github.com/eugenetolok/evento/internal/evento/member"
	"github.com/eugenetolok/evento/internal/evento/report"
	"github.com/eugenetolok/evento/internal/evento/user"
	"github.com/eugenetolok/evento/pkg/model"
	"github.com/golang-jwt/jwt/v4"
	echojwt "github.com/labstack/echo-jwt"
	"github.com/labstack/echo/v4"
)

func Routes(e *echo.Echo) {
	var jwtConfig = echojwt.Config{
		NewClaimsFunc: func(c echo.Context) jwt.Claims {
			return new(model.JwtCustomClaims)
		},
		SigningKey: []byte(appSettings.SiteSettings.SecretJWT),
		ErrorHandler: func(c echo.Context, err error) error {
			// Log the error or return a custom error message
			log.Printf("JWT Error: %v", err)
			return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired JWT")
		},
	}
	e.POST("/api/auth", authUser)
	// Restricted group
	// r := e.Group("/api/users", utils.RoleMiddleware([]string{"admin", "editor"}))
	// r.Use(echojwt.WithConfig(jwtConfig))
	// e.POST("/api/members/check", member.Check)
	// e.GET("/api/members/offlineScanner", member.OfflineScanner)
	// e.GET("/api/offlineGates", gate.GetGatesExternal)
	auto.InitAutos(e.Group("/api/autos"), db, jwtConfig)
	user.InitUsers(e.Group("/api/users"), db, jwtConfig)
	gate.InitGates(e.Group("/api/gates"), db, jwtConfig)
	badge.InitBadges(e.Group("/api/badges"), db, jwtConfig)
	event.InitEvents(e.Group("/api/events"), db, jwtConfig)
	report.InitReports(e.Group("/api/reports"), db, jwtConfig)
	company.InitCompanies(e.Group("/api/companies"), db, jwtConfig)
	member.InitMembers(e.Group("/api/members"), db, jwtConfig, photoStorageDir)
	accreditation.InitAccreditations(e.Group("/api/accreditations"), db, jwtConfig)
}
