package smtp

import (
	"bytes"
	"embed"
	"log"
	"strings"
	"text/template"

	_ "embed"

	"github.com/eugenetolok/evento/pkg/model"
	"gopkg.in/gomail.v2"
)

//go:embed user.htm
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
