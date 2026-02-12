package user

import (
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/google/uuid"
	"github.com/jinzhu/copier"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// user crud operations
func getUsers(c echo.Context) error {
	var users []model.User
	if err := db.Find(&users).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, users)
}

func getUser(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var user model.User
	if err := db.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, user)
}

func createUser(c echo.Context) error {
	var userIn model.UserIn
	var user model.User
	if err := c.Bind(&userIn); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}
	copier.Copy(&user, &userIn)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Println("password hashing failed", err)
		return c.String(http.StatusInternalServerError, err.Error())
	}
	fmt.Println("user", user)
	user.Password = string(hashedPassword)
	if err := db.Create(&user).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, user)
}

func updateUser(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	var userIn model.UserIn
	var user model.User
	if err := db.First(&user, id).Error; err != nil {
		return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
	}
	if err := c.Bind(&userIn); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}
	user.Username = userIn.Username
	user.Role = userIn.Role
	user.Frozen = userIn.Frozen
	db.Save(&user)
	return c.JSON(http.StatusOK, user)
}

func deleteUser(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.String(http.StatusBadRequest, `{"error":"invalid id"}`)
	}
	if err := db.Delete(&model.User{}, id).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}
