package evento

import "net/http"

import "github.com/labstack/echo/v4"

func frontendConfig(c echo.Context) error {
	return c.JSON(http.StatusOK, appSettings.FrontendSettings)
}
