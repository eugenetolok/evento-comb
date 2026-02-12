package main

import (
	"flag"
	"net/http"

	"github.com/eugenetolok/evento/internal/evento"
	"github.com/eugenetolok/evento/pkg/model"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

var flags model.Flags

func init() {
	flag.BoolVar(&flags.Migrate, "migrate", false, "migrate tables")
	flag.BoolVar(&flags.ShowYamlStruct, "yaml", false, "show yaml struct and exit")
	flag.BoolVar(&flags.AddUser, "user", false, "add new user")
	flag.BoolVar(&flags.DropTable, "drop", false, "WARNING: drops all tables!!!")
	flag.StringVar(&flags.Port, "port", ":7777", "port of application, default is ':7777'")
	flag.Parse()
}

func main() {
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.Gzip())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		Skipper:       middleware.DefaultSkipper,
		AllowOrigins:  []string{"*"},
		AllowMethods:  []string{http.MethodGet, http.MethodHead, http.MethodPut, http.MethodPatch, http.MethodPost, http.MethodDelete},
		ExposeHeaders: []string{"Content-Disposition", "Content-Type", "Content-Length"},
	}))

	// Static SPA serve
	// e.Use(middleware.StaticWithConfig(middleware.StaticConfig{
	// 	Root:   "dist",       // This is the path to your SPA build folder, the folder that is created from running "npm build"
	// 	Index:  "index.html", // This is the default html page for your SPA
	// 	Browse: false,
	// 	HTML5:  true,
	// }))

	// init poravkino
	evento.InitEvento(flags)

	evento.Routes(e)

	// Start server
	e.Logger.Fatal(e.Start(flags.Port))
}
