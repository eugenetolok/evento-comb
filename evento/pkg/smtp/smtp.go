package smtp

import (
	"bytes"
	"embed"
	"fmt"
	"log"
	"net/url"
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"gopkg.in/gomail.v2"
)

//go:embed user.htm reset_password.htm
var templateFS embed.FS

var mailSettings model.MailSettings

const (
	TemplateKeyCredentials   = "credentials"
	TemplateKeyResetPassword = "reset_password"
)

type ManagedTemplateDefinition struct {
	Key         string   `json:"key"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Subject     string   `json:"subject"`
	Body        string   `json:"body"`
	Variables   []string `json:"variables"`
}

type managedTemplateMeta struct {
	Key            string
	Name           string
	Description    string
	DefaultSubject string
	FileName       string
	Variables      []string
}

type templateOverride struct {
	Subject string
	Body    string
}

var (
	templateOverrides   = map[string]templateOverride{}
	templateOverridesMu sync.RWMutex
)

var managedTemplateCatalog = []managedTemplateMeta{
	{
		Key:            TemplateKeyCredentials,
		Name:           "Доступы нового пользователя",
		Description:    "Письмо с логином/паролем при создании доступа компании",
		DefaultSubject: "Доступ в систему аккредитации VK FEST {{ .City }}",
		FileName:       "user.htm",
		Variables:      []string{"Username", "Password", "City", "Domain", "LoginURL"},
	},
	{
		Key:            TemplateKeyResetPassword,
		Name:           "Сброс пароля",
		Description:    "Письмо с одноразовой ссылкой для сброса пароля",
		DefaultSubject: "Сброс пароля в системе аккредитации VK FEST",
		FileName:       "reset_password.htm",
		Variables:      []string{"Username", "ResetURL", "ExpiresAt", "City", "Domain", "LoginURL"},
	},
}

func InitConfig(m model.MailSettings) {
	mailSettings = m
}

func DefaultManagedTemplateDefinitions() []ManagedTemplateDefinition {
	items := make([]ManagedTemplateDefinition, 0, len(managedTemplateCatalog))
	for _, meta := range managedTemplateCatalog {
		items = append(items, buildDefaultTemplate(meta))
	}
	return items
}

func DefaultManagedTemplate(key string) (ManagedTemplateDefinition, bool) {
	normalized := normalizeTemplateKey(key)
	for _, meta := range managedTemplateCatalog {
		if meta.Key == normalized {
			return buildDefaultTemplate(meta), true
		}
	}
	return ManagedTemplateDefinition{}, false
}

func IsManagedTemplateKey(key string) bool {
	_, ok := DefaultManagedTemplate(key)
	return ok
}

func GetTemplateVariables(key string) []string {
	def, ok := DefaultManagedTemplate(key)
	if !ok {
		return []string{}
	}
	return append([]string{}, def.Variables...)
}

func SetTemplateOverride(key, subject, body string) {
	normalized := normalizeTemplateKey(key)
	if !IsManagedTemplateKey(normalized) {
		return
	}
	templateOverridesMu.Lock()
	templateOverrides[normalized] = templateOverride{
		Subject: subject,
		Body:    body,
	}
	templateOverridesMu.Unlock()
}

func ResetTemplateOverrides() {
	templateOverridesMu.Lock()
	templateOverrides = map[string]templateOverride{}
	templateOverridesMu.Unlock()
}

func ValidateTemplateContent(key, subject, body string) error {
	normalized := normalizeTemplateKey(key)
	if !IsManagedTemplateKey(normalized) {
		return fmt.Errorf("unknown template key")
	}
	if strings.TrimSpace(subject) == "" || strings.TrimSpace(body) == "" {
		return fmt.Errorf("subject and body are required")
	}

	data := sampleTemplateData(normalized)
	if _, err := renderTemplateString(subject, data); err != nil {
		return err
	}
	if _, err := renderTemplateString(body, data); err != nil {
		return err
	}
	return nil
}

// SendCreds sends tickets to user
func SendCreds(email, password string, user model.User) bool {
	baseURL := normalizeDomainURL(mailSettings.Domain)
	data := map[string]interface{}{
		"Username": user.Username,
		"Password": password,
		"City":     mailSettings.City,
		"Domain":   mailSettings.Domain,
		"LoginURL": fmt.Sprintf("%s/login", baseURL),
	}

	templateDef, ok := resolveManagedTemplate(TemplateKeyCredentials)
	if !ok {
		return false
	}
	subject, body, err := renderManagedTemplate(templateDef, data)
	if err != nil {
		log.Print("template rendering error: ", err)
		return false
	}

	m := gomail.NewMessage()
	m.SetHeader("From", mailSettings.From)
	m.SetHeader("To", email)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", strings.ReplaceAll(body, "APP_DOMAIN", mailSettings.Domain))

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

	data := map[string]interface{}{
		"Username":  user.Username,
		"ResetURL":  resetURL,
		"ExpiresAt": expiresAt.Local().Format("02.01.2006 15:04"),
		"City":      mailSettings.City,
		"Domain":    mailSettings.Domain,
		"LoginURL":  fmt.Sprintf("%s/login", baseURL),
	}

	templateDef, ok := resolveManagedTemplate(TemplateKeyResetPassword)
	if !ok {
		return false
	}
	subject, body, err := renderManagedTemplate(templateDef, data)
	if err != nil {
		log.Print("template rendering error: ", err)
		return false
	}

	m := gomail.NewMessage()
	m.SetHeader("From", mailSettings.From)
	m.SetHeader("To", email)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", strings.ReplaceAll(body, "APP_DOMAIN", mailSettings.Domain))

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

func buildDefaultTemplate(meta managedTemplateMeta) ManagedTemplateDefinition {
	body := readEmbeddedTemplate(meta.FileName)
	if body == "" {
		body = fallbackTemplateBody(meta.Key)
	}
	return ManagedTemplateDefinition{
		Key:         meta.Key,
		Name:        meta.Name,
		Description: meta.Description,
		Subject:     meta.DefaultSubject,
		Body:        body,
		Variables:   append([]string{}, meta.Variables...),
	}
}

func resolveManagedTemplate(key string) (ManagedTemplateDefinition, bool) {
	normalized := normalizeTemplateKey(key)
	base, ok := DefaultManagedTemplate(normalized)
	if !ok {
		return ManagedTemplateDefinition{}, false
	}

	templateOverridesMu.RLock()
	override, exists := templateOverrides[normalized]
	templateOverridesMu.RUnlock()
	if !exists {
		return base, true
	}

	if strings.TrimSpace(override.Subject) != "" {
		base.Subject = override.Subject
	}
	if strings.TrimSpace(override.Body) != "" {
		base.Body = override.Body
	}
	return base, true
}

func renderManagedTemplate(def ManagedTemplateDefinition, data map[string]interface{}) (string, string, error) {
	subject, err := renderTemplateString(def.Subject, data)
	if err != nil {
		defaultDef, ok := DefaultManagedTemplate(def.Key)
		if !ok {
			return "", "", err
		}
		subject, err = renderTemplateString(defaultDef.Subject, data)
		if err != nil {
			return "", "", err
		}
	}

	body, err := renderTemplateString(def.Body, data)
	if err != nil {
		defaultDef, ok := DefaultManagedTemplate(def.Key)
		if !ok {
			return "", "", err
		}
		body, err = renderTemplateString(defaultDef.Body, data)
		if err != nil {
			return "", "", err
		}
	}

	return subject, body, nil
}

func renderTemplateString(source string, data map[string]interface{}) (string, error) {
	t, err := template.New("mail-template").Option("missingkey=error").Parse(source)
	if err != nil {
		return "", err
	}
	buf := new(bytes.Buffer)
	if err := t.Execute(buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func normalizeTemplateKey(key string) string {
	return strings.TrimSpace(strings.ToLower(key))
}

func readEmbeddedTemplate(fileName string) string {
	data, err := templateFS.ReadFile(fileName)
	if err != nil {
		return ""
	}
	return string(data)
}

func sampleTemplateData(key string) map[string]interface{} {
	switch normalizeTemplateKey(key) {
	case TemplateKeyCredentials:
		return map[string]interface{}{
			"Username": "demo.user",
			"Password": "Secr3tPwd",
			"City":     "Москва",
			"Domain":   "vkfestreg.ru",
			"LoginURL": "https://vkfestreg.ru/login",
		}
	case TemplateKeyResetPassword:
		return map[string]interface{}{
			"Username":  "demo.user",
			"ResetURL":  "https://vkfestreg.ru/reset-password?token=abc",
			"ExpiresAt": "31.12.2026 23:59",
			"City":      "Москва",
			"Domain":    "vkfestreg.ru",
			"LoginURL":  "https://vkfestreg.ru/login",
		}
	default:
		return map[string]interface{}{}
	}
}

func fallbackTemplateBody(key string) string {
	switch normalizeTemplateKey(key) {
	case TemplateKeyCredentials:
		return `<html><body><p>Логин: <b>{{ .Username }}</b></p><p>Пароль: <b>{{ .Password }}</b></p><p><a href="https://{{ .Domain }}">Войти</a></p></body></html>`
	case TemplateKeyResetPassword:
		return `<html><body><p>Пользователь: <b>{{ .Username }}</b></p><p><a href="{{ .ResetURL }}">Сбросить пароль</a></p><p>Ссылка действует до {{ .ExpiresAt }}</p></body></html>`
	default:
		return "<html><body><p>Template</p></body></html>"
	}
}
