package user

import (
	"fmt"
	"log"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/smtp"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
)

func resetPassword(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var user model.User
	if err := db.First(&user, id).Error; err != nil {
		return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
	}
	var passwordReset = struct {
		Password       string `json:"password"`
		RecepientEmail string `json:"recepient_email"`
	}{}
	if err := c.Bind(&passwordReset); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(passwordReset.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Println("password hashing failed", err)
		return c.String(http.StatusInternalServerError, err.Error())
	}
	if passwordReset.RecepientEmail != "" {
		fmt.Println("email will be sent to:", passwordReset.RecepientEmail)
		smtp.SendCreds(passwordReset.RecepientEmail, passwordReset.Password, user)
	}
	user.Password = string(hashedPassword)
	db.Save(&user)
	return c.JSON(http.StatusOK, user)
}
