package member

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils" // For permission checks
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

const maxUploadSize = 5 * 1024 * 1024 // 5 MB
var allowedMimeTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
}

// uploadMemberPhoto handles POST /api/members/:id/photo
func uploadMemberPhoto(c echo.Context) error {
	// 0. Check write permissions first (Frozen status)
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}

	// 1. Get Member ID
	idStr := c.Param("id")
	memberID, err := uuid.Parse(idStr)
	if err != nil {
		// Middleware should catch this, but double-check
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid member ID format")
	}

	// 2. Fetch Member
	var member model.Member
	// Preload Company.User if needed for permission check, or just CompanyID
	if err := db.Select("id", "company_id", "photo_filename").First(&member, memberID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Member not found")
		}
		log.Printf("Error fetching member %s: %v", memberID, err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error fetching member")
	}

	// 3. Permission Check (Example: using CheckCompanyManagePermission)
	// Adapt this check based on your exact requirements (who can upload?)
	var companyForCheck model.Company // Need company data for the check
	if err := db.Preload("User").First(&companyForCheck, member.CompanyID).Error; err != nil {
		log.Printf("Error fetching company %s for permission check: %v", member.CompanyID, err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Database error checking permissions")
	}
	if !utils.CheckCompanyManagePermission(c, companyForCheck) {
		return echo.NewHTTPError(http.StatusForbidden, "Permission denied to modify this member")
	}

	// 4. Get File from Request
	file, err := c.FormFile("photo") // "photo" is the expected form field name
	if err != nil {
		log.Printf("Error getting form file: %v", err)
		return echo.NewHTTPError(http.StatusBadRequest, "Missing or invalid 'photo' form field")
	}

	// 5. Validate File Size
	if file.Size > maxUploadSize {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("File size exceeds limit of %d MB", maxUploadSize/1024/1024))
	}

	// 6. Validate File Type
	src, err := file.Open()
	if err != nil {
		log.Printf("Error opening uploaded file: %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to open uploaded file")
	}
	defer src.Close()

	// Read first 512 bytes to determine MIME type
	buffer := make([]byte, 512)
	_, err = src.Read(buffer)
	if err != nil && err != io.EOF {
		log.Printf("Error reading file header: %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to read file type")
	}
	// Reset reader to the beginning
	_, err = src.Seek(0, io.SeekStart)
	if err != nil {
		log.Printf("Error seeking file: %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed processing file")
	}

	mimeType := http.DetectContentType(buffer)
	if !allowedMimeTypes[mimeType] {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("Invalid file type: %s. Allowed types: %v", mimeType, getAllowedTypesString()))
	}

	// 7. Generate Unique Filename (member_uuid.original_extension)
	originalExt := filepath.Ext(file.Filename)
	if originalExt == "" { // Basic check for extension
		originalExt = getExtensionFromMime(mimeType) // Fallback based on detected MIME
		if originalExt == "" {
			return echo.NewHTTPError(http.StatusBadRequest, "Cannot determine file extension")
		}
	}
	newFilename := fmt.Sprintf("%s%s", memberID.String(), strings.ToLower(originalExt))
	fullPath := filepath.Join(memberPhotoDir, newFilename) // Use path from config

	// 8. Delete Old File (if exists) before saving new one
	if member.PhotoFilename != "" && member.PhotoFilename != newFilename {
		oldPath := filepath.Join(memberPhotoDir, member.PhotoFilename)
		if err := os.Remove(oldPath); err != nil && !os.IsNotExist(err) {
			// Log error but continue, maybe the old file was already gone
			log.Printf("Warning: Failed to delete old photo '%s': %v", oldPath, err)
		}
	}

	// 9. Save New File
	dst, err := os.Create(fullPath)
	if err != nil {
		log.Printf("Error creating destination file '%s': %v", fullPath, err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save file")
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		log.Printf("Error copying file to '%s': %v", fullPath, err)
		// Attempt to clean up partially written file
		os.Remove(fullPath)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to copy file content")
	}

	// 10. Update Database
	if err := db.Model(&member).Update("PhotoFilename", newFilename).Error; err != nil {
		log.Printf("Error saving member photo filename %s to DB: %v", memberID, err)
		// Attempt to clean up the newly saved file as the DB update failed
		os.Remove(fullPath)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update member record")
	}

	// 11. Return Success
	log.Printf("Successfully uploaded photo for member %s to %s", memberID, fullPath)
	// Return the updated member object or just a success message
	return c.JSON(http.StatusOK, member) // Return updated member
}

// ServeMemberPhoto handles GET /:id/photo
func serveMemberPhoto(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var member model.Member
	if err := db.First(&member, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `Участник не найден`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	if member.PhotoFilename == "" {
		return c.String(http.StatusNotFound, `Фото не найдено`)
	}
	var company model.Company
	if err := db.Preload("User").First(&company, member.CompanyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `ID компании неверный`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	if !utils.CheckCompanyGetPermission(c, company) {
		return c.String(http.StatusForbidden, `У пользователя недостаточно привелегий`)
	}

	fullPath := filepath.Join(memberPhotoDir, member.PhotoFilename)

	// Check if file exists before serving
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		return echo.NewHTTPError(http.StatusNotFound, "Photo not found")
	} else if err != nil {
		log.Printf("Error accessing photo file '%s': %v", fullPath, err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Error accessing file")
	}

	// Let Echo handle serving the file (sets Content-Type etc.)
	return c.File(fullPath)
}

// --- Helper Functions ---

func getAllowedTypesString() string {
	keys := make([]string, 0, len(allowedMimeTypes))
	for k := range allowedMimeTypes {
		keys = append(keys, k)
	}
	return strings.Join(keys, ", ")
}

// Basic fallback for extension based on detected MIME type
func getExtensionFromMime(mime string) string {
	switch mime {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	default:
		return ""
	}
}
