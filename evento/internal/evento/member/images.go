package member

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
)

func images(c echo.Context) error {
	files, err := os.ReadDir(memberPhotoDir)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "unable to read directory"})
	}

	var names []string
	for _, file := range files {
		if !file.IsDir() {
			name := file.Name()
			ext := filepath.Ext(name)
			nameWithoutExt := strings.TrimSuffix(name, ext)
			names = append(names, nameWithoutExt)
		}
	}

	return c.JSON(http.StatusOK, names)
}
