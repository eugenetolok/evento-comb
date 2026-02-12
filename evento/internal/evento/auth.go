package evento

import (
	"net/http"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/golang-jwt/jwt/v4"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Auth ...
type Auth struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func authUser(c echo.Context) error {
	var auth Auth
	if err := c.Bind(&auth); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}
	if auth.Username == "" || auth.Password == "" {
		return c.String(http.StatusBadRequest, `{"error":"bad request"}`)
	}
	var user model.User
	// Fetch user by username first
	if err := db.Where("username = ?", auth.Username).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Username not found is an unauthorized case
			return c.String(http.StatusUnauthorized, `{"error":"invalid credentials"}`)
		}
		// Other database error
		return c.String(http.StatusInternalServerError, `{"error":"database error"}`)
	}

	// Compare the provided password with the stored hash
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(auth.Password))
	if err != nil {
		// Passwords don't match or other bcrypt error
		return c.String(http.StatusUnauthorized, `{"error":"invalid credentials"}`)
	}

	// Set custom claims
	claims := &model.JwtCustomClaims{
		ID:   user.ID,
		Role: user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 72)),
		},
	}

	// Create token with claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Generate encoded token and send it as response.
	t, err := token.SignedString([]byte(appSettings.SiteSettings.SecretJWT))
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, echo.Map{
		"token": t,
	})
}
