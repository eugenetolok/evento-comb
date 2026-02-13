package smtp

import (
	"bytes"
	"embed"
	"fmt"
	"log"
	"net/url"
	"strings"
	"text/template"
	"time"

	_ "embed"

	"github.com/eugenetolok/evento/pkg/model"
	"gopkg.in/gomail.v2"
)

//go:embed user.htm reset_password.htm
var templateFS embed.FS

var mailSettings model.MailSettings

func InitConfig(m model.MailSettings) {
	mailSettings = m
}

// SendCreds sends tickets to user
func SendCreds(email, password string, user model.User) bool {
	var toSend = struct {
		Username string
		Password string
		City     string
		Domain   string
	}{
		user.Username,
		password,
		mailSettings.City,
		mailSettings.Domain,
	}
	// Read the HTML file from the embed FS
	data, err := templateFS.ReadFile("user.htm")
	if err != nil {
		log.Print("template reading error: ", err)
		return false
	}

	// Create a template and parse the HTML
	t, err := template.New("").Parse(string(data))
	if err != nil {
		log.Print("template parsing error: ", err)
		return false
	}
	buf := new(bytes.Buffer)
	err = t.Execute(buf, toSend)
	if err != nil { // if there is an error
		log.Print("template executing error: ", err)
	}

	m := gomail.NewMessage()
	m.SetHeader("From", mailSettings.From)
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Доступ в систему аккредитации VKFEST 2025 "+mailSettings.City)
	m.SetBody("text/html", strings.ReplaceAll(buf.String(), "APP_DOMAIN", mailSettings.Domain))

	// Send the email to Bob
	d := gomail.NewDialer(mailSettings.SMTP, mailSettings.Port, mailSettings.User, mailSettings.Password)
	if err := d.DialAndSend(m); err != nil {
		log.Println("email didn't send to: " + email)
		return false
	}
	return true
}

// SendPasswordResetLink sends a one-time password reset link.
func SendPasswordResetLink(email string, user model.User, resetToken string, expiresAt time.Time) bool {
	baseURL := normalizeDomainURL(mailSettings.Domain)
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", baseURL, url.QueryEscape(resetToken))

	var toSend = struct {
		Username  string
		ResetURL  string
		ExpiresAt string
		City      string
		Domain    string
		LoginURL  string
	}{
		Username:  user.Username,
		ResetURL:  resetURL,
		ExpiresAt: expiresAt.Local().Format("02.01.2006 15:04"),
		City:      mailSettings.City,
		Domain:    mailSettings.Domain,
		LoginURL:  fmt.Sprintf("%s/login", baseURL),
	}

	data, err := templateFS.ReadFile("reset_password.htm")
	if err != nil {
		log.Print("template reading error: ", err)
		return false
	}

	t, err := template.New("").Parse(string(data))
	if err != nil {
		log.Print("template parsing error: ", err)
		return false
	}
	buf := new(bytes.Buffer)
	err = t.Execute(buf, toSend)
	if err != nil {
		log.Print("template executing error: ", err)
		return false
	}

	m := gomail.NewMessage()
	m.SetHeader("From", mailSettings.From)
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Сброс пароля в системе аккредитации VK FEST")
	m.SetBody("text/html", strings.ReplaceAll(buf.String(), "APP_DOMAIN", mailSettings.Domain))

	d := gomail.NewDialer(mailSettings.SMTP, mailSettings.Port, mailSettings.User, mailSettings.Password)
	if err := d.DialAndSend(m); err != nil {
		log.Println("reset email didn't send to: " + email)
		return false
	}

	return true
}

func normalizeDomainURL(domain string) string {
	value := strings.TrimSpace(domain)
	if value == "" {
		return "https://localhost:5173"
	}
	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
		return strings.TrimRight(value, "/")
	}
	return "https://" + strings.TrimRight(value, "/")
}
