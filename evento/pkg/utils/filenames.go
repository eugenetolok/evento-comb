package utils

import (
	"path/filepath"
	"regexp"
	"strings"

	"github.com/labstack/echo/v4"
	// You'll need to install this: go get github.com/mozillaz/go-transliterate
)

// SanitizeFilename creates a safe filename from a given string.
func SanitizeFilename(name string) string {
	// 1. Transliterate
	name = Transliterate(name)
	// If transliteration fails, we'll proceed with the original (potentially Cyrillic) name,
	// but the subsequent steps will still try to sanitize it.

	// 2. Convert to lowercase
	name = strings.ToLower(name)

	// 3. Replace spaces and common problematic characters with underscores
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, "\\", "_")
	name = strings.ReplaceAll(name, ":", "_")
	name = strings.ReplaceAll(name, "*", "_")
	name = strings.ReplaceAll(name, "?", "_")
	name = strings.ReplaceAll(name, "\"", "_")
	name = strings.ReplaceAll(name, "<", "_")
	name = strings.ReplaceAll(name, ">", "_")
	name = strings.ReplaceAll(name, "|", "_")

	// 4. Remove any remaining non-alphanumeric characters (except underscore and dot)
	reg := regexp.MustCompile(`[^a-z0-9_.]+`)
	name = reg.ReplaceAllString(name, "")

	// 5. Ensure it doesn't start or end with underscore or dot, and remove multiple underscores/dots
	name = strings.Trim(name, "_.")
	name = regexp.MustCompile(`__+`).ReplaceAllString(name, "_")
	name = regexp.MustCompile(`\.\.+`).ReplaceAllString(name, ".")

	// 6. Truncate if too long (e.g., 100 chars before extension)
	if len(name) > 100 {
		if ext := filepath.Ext(name); ext != "" {
			base := name[:len(name)-len(ext)]
			if len(base) > 100-len(ext) {
				base = base[:100-len(ext)]
			}
			name = base + ext
		} else {
			name = name[:100]
		}
	}
	// Ensure it's not empty
	if name == "" || name == "." {
		return "unnamed_file"
	}

	return name
}

// GetCityIdentifierFromRequest is a placeholder.
// You need to implement logic to determine the city.
// This could be from a subdomain, a query parameter, or a default.
// For now, it returns a placeholder.
func GetCityIdentifierFromRequest(c echo.Context) string {
	// Example: Read from a header or a pre-set config based on host
	// This is a simplified example. Your actual implementation will depend on how your app determines the current city.
	// For subdomains like "spb.vkfestreg.ru", "msk.vkfestreg.ru"
	host := c.Request().Host
	parts := strings.Split(host, ".")
	if len(parts) > 2 { // e.g., spb.vkfestreg.ru
		return parts[0]
	}
	// Fallback or default city identifier
	return "vkfest" // Or some other default
}
