package user

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/smtp"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const passwordResetTokenTTL = 24 * time.Hour
const minPasswordLength = 8

type resetPasswordRequest struct {
	Password       string `json:"password"`
	RecipientEmail string `json:"recipient_email"`
	RecepientEmail string `json:"recepient_email"` // legacy typo support
}

type completeResetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

func resetPassword(c echo.Context) error {
	requesterID, requesterRole := utils.GetUser(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var user model.User
	if err := db.First(&user, id).Error; err != nil {
		return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
	}
	if requesterRole == "editor" {
		if user.CompanyID == uuid.Nil {
			return c.String(http.StatusForbidden, `{"error":"user does not have enough permissions"}`)
		}
		var company model.Company
		if err := db.Select("id", "editor_id").First(&company, user.CompanyID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.String(http.StatusNotFound, `{"error":"company is not found"}`)
			}
			return c.String(http.StatusInternalServerError, err.Error())
		}
		if company.EditorID != requesterID {
			return c.String(http.StatusForbidden, `{"error":"user does not have enough permissions"}`)
		}
	}

	var passwordReset resetPasswordRequest
	if err := c.Bind(&passwordReset); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	newPassword := strings.TrimSpace(passwordReset.Password)
	recipientEmail := strings.TrimSpace(passwordReset.RecipientEmail)
	if recipientEmail == "" {
		recipientEmail = strings.TrimSpace(passwordReset.RecepientEmail)
	}
	if newPassword == "" && recipientEmail == "" {
		return c.String(http.StatusBadRequest, `{"error":"password or recipient_email is required"}`)
	}
	if newPassword != "" && len(newPassword) < minPasswordLength {
		return c.String(http.StatusBadRequest, `{"error":"password must be at least 8 characters"}`)
	}

	updates := map[string]interface{}{}
	var tokenForEmail string
	var expiresAt time.Time

	if newPassword != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Println("password hashing failed", err)
			return c.String(http.StatusInternalServerError, err.Error())
		}
		updates["password"] = string(hashedPassword)
		updates["password_reset_token_hash"] = ""
		updates["password_reset_expires_at"] = nil
	}

	if recipientEmail != "" {
		tokenForEmail = utils.GenerateRandomString(64)
		if tokenForEmail == "" {
			return c.String(http.StatusInternalServerError, `{"error":"failed to generate reset token"}`)
		}
		expiresAt = time.Now().UTC().Add(passwordResetTokenTTL)
		updates["password_reset_token_hash"] = utils.SHA256Hash(tokenForEmail)
		updates["password_reset_expires_at"] = expiresAt
	}

	if len(updates) > 0 {
		if err := db.Model(&model.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
	}

	if recipientEmail != "" {
		if ok := smtp.SendPasswordResetLink(recipientEmail, user, tokenForEmail, expiresAt); !ok {
			_ = db.Model(&model.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{
				"password_reset_token_hash": "",
				"password_reset_expires_at": nil,
			}).Error
			return c.String(http.StatusInternalServerError, `{"error":"failed to send reset email"}`)
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"password_updated":       newPassword != "",
		"reset_email_sent":       recipientEmail != "",
		"reset_expires_at":       expiresAt,
		"recipient_email_masked": maskEmail(recipientEmail),
		"recepient_email_masked": maskEmail(recipientEmail),
	})
}

// CompleteResetPassword finalizes password reset using one-time token from email.
func CompleteResetPassword(c echo.Context) error {
	var request completeResetPasswordRequest
	if err := c.Bind(&request); err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid request payload"}`)
	}

	resetToken := strings.TrimSpace(request.Token)
	newPassword := strings.TrimSpace(request.Password)
	if resetToken == "" || newPassword == "" {
		return c.String(http.StatusBadRequest, `{"error":"token and password are required"}`)
	}
	if len(newPassword) < minPasswordLength {
		return c.String(http.StatusBadRequest, `{"error":"password must be at least 8 characters"}`)
	}

	var user model.User
	tokenHash := utils.SHA256Hash(resetToken)
	if err := db.Where("password_reset_token_hash = ?", tokenHash).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusBadRequest, `{"error":"invalid or expired reset token"}`)
		}
		return c.String(http.StatusInternalServerError, `{"error":"internal server error"}`)
	}

	now := time.Now().UTC()
	if user.PasswordResetExpiresAt == nil || user.PasswordResetExpiresAt.Before(now) {
		_ = db.Model(&model.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{
			"password_reset_token_hash": "",
			"password_reset_expires_at": nil,
		}).Error
		return c.String(http.StatusBadRequest, `{"error":"invalid or expired reset token"}`)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Println("password hashing failed", err)
		return c.String(http.StatusInternalServerError, `{"error":"internal server error"}`)
	}

	if err := db.Model(&model.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{
		"password":                  string(hashedPassword),
		"password_reset_token_hash": "",
		"password_reset_expires_at": nil,
	}).Error; err != nil {
		return c.String(http.StatusInternalServerError, `{"error":"internal server error"}`)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"password_updated": true,
	})
}

func maskEmail(email string) string {
	if email == "" {
		return ""
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return ""
	}
	local := parts[0]
	if len(local) <= 2 {
		return "***@" + parts[1]
	}
	return local[:2] + "***@" + parts[1]
}
