package utils

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type companyPermissionChecker func(c echo.Context, company model.Company) bool

// UUIDMiddleware validates if the ':id' parameter is a valid UUID.
func UUIDMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		idStr := c.Param("id")
		// Attempt to parse the id parameter as a UUID
		_, err := uuid.Parse(idStr)
		if err != nil {
			// If parsing fails, it's not a valid UUID format
			// Return a Bad Request error
			return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf(`{"error": "Invalid ID format: '%s' is not a valid UUID"}`, idStr))
		}

		// If parsing succeeds, call the next handler in the chain
		if err := next(c); err != nil {
			// Propagate errors from subsequent handlers
			c.Error(err)
		}
		return nil // Return nil if next handler executed successfully
	}
}

// RoleMiddleware ...
func RoleMiddleware(roles []string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			user := c.Get("user").(*jwt.Token)
			claims := user.Claims.(*model.JwtCustomClaims)

			for _, role := range roles {
				if claims.Role == role {
					return next(c)
				}
			}

			return echo.NewHTTPError(http.StatusForbidden, "Forbidden")
		}
	}
}

// GetUser gets user id from JWT token
func GetUser(c echo.Context) (uuid.UUID, string) {
	user := c.Get("user").(*jwt.Token)
	claims := user.Claims.(*model.JwtCustomClaims)
	return claims.ID, claims.Role
}

// ResolveCompanyIDForManage safely resolves company_id from query/user context
// and verifies that current user can manage this company.
func ResolveCompanyIDForManage(c echo.Context, db *gorm.DB, rawCompanyID string) (uuid.UUID, error) {
	return resolveScopedCompanyID(c, db, rawCompanyID, CheckCompanyManagePermission)
}

func resolveScopedCompanyID(c echo.Context, db *gorm.DB, rawCompanyID string, checker companyPermissionChecker) (uuid.UUID, error) {
	companyID, err := parseOptionalCompanyID(rawCompanyID)
	if err != nil {
		return uuid.Nil, err
	}

	if companyID == uuid.Nil {
		userID, _ := GetUser(c)
		var user model.User
		if err := db.Select("id", "company_id").First(&user, userID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return uuid.Nil, echo.NewHTTPError(http.StatusNotFound, `{"error":"user is not found"}`)
			}
			return uuid.Nil, echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		if user.CompanyID == uuid.Nil {
			return uuid.Nil, echo.NewHTTPError(http.StatusBadRequest, `{"error":"company not found"}`)
		}
		companyID = user.CompanyID
	}

	var company model.Company
	if err := db.Preload("User").First(&company, companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return uuid.Nil, echo.NewHTTPError(http.StatusNotFound, `{"error":"company is not found"}`)
		}
		return uuid.Nil, echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	if !checker(c, company) {
		return uuid.Nil, echo.NewHTTPError(http.StatusForbidden, `{"error":"user does not have enough permissions"}`)
	}

	return companyID, nil
}

func parseOptionalCompanyID(rawCompanyID string) (uuid.UUID, error) {
	value := strings.TrimSpace(rawCompanyID)
	if value == "" {
		return uuid.Nil, nil
	}

	companyID, err := uuid.Parse(value)
	if err != nil {
		return uuid.Nil, echo.NewHTTPError(http.StatusBadRequest, `{"error":"invalid company_id"}`)
	}

	return companyID, nil
}

// CheckCompanyManagePermission ...
func CheckCompanyManagePermission(c echo.Context, company model.Company) bool {
	userID, userRole := GetUser(c)
	if userRole == "admin" {
		return true
	}
	if userRole == "editor" {
		return company.EditorID == userID
	}
	if userRole == "company" {
		return company.User.ID == userID
	}
	return false
}

// CheckCompanyGetPermission ...
func CheckCompanyGetPermission(c echo.Context, company model.Company) bool {
	userID, userRole := GetUser(c)
	if userRole == "admin" || userRole == "operator" || userRole == "monitoring" {
		return true
	}
	if userRole == "editor" {
		return company.EditorID == userID
	}
	if userRole == "company" {
		return company.User.ID == userID
	}
	return false
}

// CheckUserWritePermission ...
func CheckUserWritePermission(c echo.Context, db *gorm.DB) bool {
	userID, _ := GetUser(c)
	var user model.User
	if err := db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			fmt.Println("!!!! URGENT: user not found!!!", err.Error())
			return false
		}
		fmt.Println("!!!! URGENT: some strange error!!!", err.Error())
		return false
	}
	// Apply delayed freeze/unfreeze for company users just-in-time.
	// This keeps access state correct even if the scheduler tick has not run yet.
	if user.Role == "company" && user.FrozenAt != nil && !user.FrozenAt.After(time.Now()) {
		switch user.FrozenAction {
		case "freeze":
			user.Frozen = true
		case "unfreeze":
			user.Frozen = false
		}
		_ = db.Model(&model.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{
			"frozen":        user.Frozen,
			"frozen_action": "",
			"frozen_at":     nil,
		}).Error
	}
	return !user.Frozen
}
