package evento

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/eugenetolok/evento/internal/evento/aiassistant"
	"github.com/eugenetolok/evento/internal/evento/emailtemplate"
	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/smtp"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/manifoldco/promptui"
	"golang.org/x/crypto/bcrypt"
	"gopkg.in/yaml.v3"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var (
	db *gorm.DB
	// yaml settings
	appSettings model.AppSettings

	photoStorageDir string
)

func InitEvento(f model.Flags) {
	// flags
	if f.ShowYamlStruct {
		yamlFile, _ := yaml.Marshal(&appSettings)
		fmt.Println(string(yamlFile))
		os.Exit(0)
	}
	// init configs
	updateConfig()
	smtp.InitConfig(appSettings.MailSettings)

	// Resolve and prepare photo storage directory
	photoStorageDir = appSettings.SiteSettings.PhotoStoragePath
	// If the path is relative, make it absolute based on the working directory
	if !filepath.IsAbs(photoStorageDir) {
		photoStorageDir = filepath.Join(utils.WorkDir(), photoStorageDir)
	}
	log.Printf("Photo storage directory: %s", photoStorageDir)
	// Create the directory if it doesn't exist
	if err := os.MkdirAll(photoStorageDir, 0755); err != nil { // 0755 permissions
		panic(fmt.Sprintf("failed to create photo storage directory '%s': %v", photoStorageDir, err))
	}
	// init db
	dsn := appSettings.SiteSettings.DBPath
	fmt.Println("db_path", appSettings.SiteSettings.DBPath)
	var err error
	db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	if f.DropTable {
		db.Migrator().DropTable(
			model.User{}, model.Member{}, model.Company{}, model.Auto{}, model.Accreditation{}, model.Event{}, model.Gate{}, model.CompanyAccreditationLimit{}, model.CompanyEventLimit{}, model.CompanyGateLimit{}, model.MemberPass{}, model.MemberPrint{}, model.MemberHistory{}, model.CompanyHistory{}, model.AutoHistory{}, model.BadgeTemplate{}, model.EmailTemplate{})
		log.Println("All tables are dropped")
		os.Exit(0)
	}
	if f.Migrate {
		db.AutoMigrate(
			model.User{}, model.Member{}, model.Company{}, model.Auto{}, model.Accreditation{}, model.Event{}, model.Gate{}, model.CompanyAccreditationLimit{}, model.CompanyEventLimit{}, model.CompanyGateLimit{}, model.MemberPass{}, model.MemberPrint{}, model.MemberHistory{}, model.CompanyHistory{}, model.AutoHistory{}, model.BadgeTemplate{}, model.EmailTemplate{})
		log.Println("All tables are migrated")
		os.Exit(0)
	}
	if f.AddUser {
		var user model.User
		user.Username, user.Password, user.Role = promptUser()
		// Hash the password before saving
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Println("password hashing failed", err)
			os.Exit(1)
		}
		user.Password = string(hashedPassword) // Store the hash
		if err := db.Create(&user).Error; err != nil {
			log.Println("user creation failed", err)
			os.Exit(1)
		}
		os.Exit(0)
	}
	if err := validateSecuritySettings(&appSettings); err != nil {
		log.Fatal(err)
	}
	ensureUserFreezeScheduleColumns()
	syncDerivedCompanyFieldsOnce()
	syncEmptyMemberBarcodesOnce()
	if err := aiassistant.EnsureReadOnlyViews(db); err != nil {
		log.Fatalf("ai assistant views init failed: %v", err)
	}
	if err := emailtemplate.EnsureAndLoad(db); err != nil {
		log.Fatalf("email templates init failed: %v", err)
	}
}

func updateConfig() {
	if !utils.UnmarshalYaml("app.yaml", &appSettings) {
		log.Println("settings invalid")
	}
	applyDefaultAppSettings(&appSettings)
	applyEnvOverrides(&appSettings)
}

func applyDefaultAppSettings(settings *model.AppSettings) {
	currentYear := fmt.Sprintf("%d", time.Now().Year())

	if settings.SiteSettings.DBPath == "" {
		settings.SiteSettings.DBPath = "test.db"
	}
	if settings.SiteSettings.PhotoStoragePath == "" {
		settings.SiteSettings.PhotoStoragePath = "photos"
	}
	if len(settings.SiteSettings.CORSAllowOrigins) == 0 {
		settings.SiteSettings.CORSAllowOrigins = []string{
			"http://localhost:5173",
			"http://localhost:5174",
			"http://127.0.0.1:5173",
			"http://127.0.0.1:5174",
		}
	}
	if settings.SiteSettings.AuthRateLimitRPS <= 0 {
		settings.SiteSettings.AuthRateLimitRPS = 5
	}
	if settings.SiteSettings.AuthRateLimitBurst <= 0 {
		settings.SiteSettings.AuthRateLimitBurst = 10
	}

	if settings.FrontendSettings.Name == "" {
		settings.FrontendSettings.Name = "VK FEST"
	}
	if settings.FrontendSettings.Description == "" {
		settings.FrontendSettings.Description = "Регистрация участников VK FEST"
	}
	if settings.FrontendSettings.Year == "" {
		settings.FrontendSettings.Year = currentYear
	}
	if settings.FrontendSettings.Version == "" {
		settings.FrontendSettings.Version = "0.4.7"
	}
	if settings.FrontendSettings.City == "" {
		settings.FrontendSettings.City = "Санкт-Петербург"
	}

	if settings.FrontendSettings.Cities == nil {
		settings.FrontendSettings.Cities = map[string]string{}
	}
	defaultCities := map[string]string{
		"spb": "Санкт-Петербург",
		"msk": "Москва",
		"clb": "Челябинск",
		"sir": "Сириус (Сочи)",
		"kzn": "Казань",
		"":    settings.FrontendSettings.Year,
	}
	for key, value := range defaultCities {
		if settings.FrontendSettings.Cities[key] == "" {
			settings.FrontendSettings.Cities[key] = value
		}
	}

	if settings.FrontendSettings.Docs == nil {
		settings.FrontendSettings.Docs = map[string]string{}
	}
	defaultDocs := map[string]string{
		"spb": fmt.Sprintf("https://cloud.mail.ru/public/QYxH/taxBiV818/VK%%20Fest%%20%%D0%%A1%%D0%%B0%%D0%%BD%%D0%%BA%%D1%%82-%%D0%%9F%%D0%%B5%%D1%%82%%D0%%B5%%D1%%80%%D0%%B1%%D1%%83%%D1%%80%%D0%%B3%%2005-06.07.%s", settings.FrontendSettings.Year),
		"msk": fmt.Sprintf("https://cloud.mail.ru/public/QYxH/taxBiV818/VK%%20Fest%%20%%D0%%9C%%D0%%BE%%D1%%81%%D0%%BA%%D0%%B2%%D0%%B0%%2019-20.07.%s", settings.FrontendSettings.Year),
		"clb": fmt.Sprintf("https://cloud.mail.ru/public/QYxH/taxBiV818/VK%%20Fest%%20%%D0%%A7%%D0%%B5%%D0%%BB%%D1%%8F%%D0%%B1%%D0%%B8%%D0%%BD%%D1%%81%%D0%%BA%%2014.06.%s", settings.FrontendSettings.Year),
		"sir": fmt.Sprintf("https://cloud.mail.ru/public/QYxH/taxBiV818/VK%%20Fest%%20%%D0%%A1%%D0%%B8%%D1%%80%%D0%%B8%%D1%%83%%D1%%81%%2021.06.%s", settings.FrontendSettings.Year),
		"kzn": fmt.Sprintf("https://cloud.mail.ru/public/QYxH/taxBiV818/VK%%20Fest%%20%%D0%%9A%%D0%%B0%%D0%%B7%%D0%%B0%%D0%%BD%%D1%%8C%%2029.06.%s", settings.FrontendSettings.Year),
		"":    "https://vkfestreg.ru",
	}
	for key, value := range defaultDocs {
		if settings.FrontendSettings.Docs[key] == "" {
			settings.FrontendSettings.Docs[key] = value
		}
	}

	if settings.FrontendSettings.NavItems == nil {
		settings.FrontendSettings.NavItems = map[string][]model.FrontendNavItem{}
	}
	defaultNavItems := map[string][]model.FrontendNavItem{
		"admin": {
			{Label: "Главная", Href: "/dashboard"},
			{Label: "Компании", Href: "/dashboard/companies/admin"},
			{Label: "Участники", Href: "/dashboard/members/admin"},
			{Label: "Автомобили", Href: "/dashboard/autos/admin"},
			{Label: "Администрирование", Href: "/dashboard/admin/main"},
		},
		"editor": {
			{Label: "Главная", Href: "/dashboard"},
			{Label: "Мои компании", Href: "/dashboard/companies/editor"},
			{Label: "Мои участники", Href: "/dashboard/members/editor"},
			{Label: "Мои автомобили", Href: "/dashboard/autos/editor"},
		},
		"company": {
			{Label: "Мои участники", Href: "/dashboard/members/company"},
			{Label: "Мои автомобили", Href: "/dashboard/autos/company"},
		},
		"operator": {
			{Label: "Участники", Href: "/dashboard/members/operator"},
			{Label: "Автомобили", Href: "/dashboard/autos/operator"},
		},
		"monitoring": {
			{Label: "Участники", Href: "/dashboard/members/monitoring"},
			{Label: "Автомобили", Href: "/dashboard/autos/operator"},
		},
		"": []model.FrontendNavItem{},
	}
	for key, value := range defaultNavItems {
		if len(settings.FrontendSettings.NavItems[key]) == 0 {
			settings.FrontendSettings.NavItems[key] = value
		}
	}

	if settings.FrontendSettings.Links.Docs == "" {
		settings.FrontendSettings.Links.Docs = "/toread"
	}

	if settings.ReportSettings.Dashboard.PassWindowMinutes <= 0 {
		settings.ReportSettings.Dashboard.PassWindowMinutes = 120
	}
	if settings.ReportSettings.Dashboard.TopItemsLimit <= 0 {
		settings.ReportSettings.Dashboard.TopItemsLimit = 15
	}
	if settings.ReportSettings.Dashboard.AnomalyThreshold <= 0 {
		settings.ReportSettings.Dashboard.AnomalyThreshold = 5
	}
	if settings.ReportSettings.Dashboard.OverloadPercentRed <= 0 {
		settings.ReportSettings.Dashboard.OverloadPercentRed = 100
	}
	if settings.ReportSettings.Dashboard.OverloadPercentYellow <= 0 {
		settings.ReportSettings.Dashboard.OverloadPercentYellow = 85
	}

	if settings.AIAssistantSettings.Provider == "" {
		settings.AIAssistantSettings.Provider = "openrouter"
	}
	if settings.AIAssistantSettings.OpenRouterBaseURL == "" {
		settings.AIAssistantSettings.OpenRouterBaseURL = "https://openrouter.ai/api/v1"
	}
	if settings.AIAssistantSettings.OpenRouterModel == "" {
		settings.AIAssistantSettings.OpenRouterModel = "openai/gpt-4o-mini"
	}
	if settings.AIAssistantSettings.OpenRouterReferer == "" {
		settings.AIAssistantSettings.OpenRouterReferer = "https://vkfestreg.ru"
	}
	if settings.AIAssistantSettings.OpenRouterAppTitle == "" {
		settings.AIAssistantSettings.OpenRouterAppTitle = "evento-ai-assistant"
	}
	if settings.AIAssistantSettings.LLMTimeoutMS <= 0 {
		settings.AIAssistantSettings.LLMTimeoutMS = 15000
	}
	if settings.AIAssistantSettings.QueryTimeoutMS <= 0 {
		settings.AIAssistantSettings.QueryTimeoutMS = 5000
	}
	if settings.AIAssistantSettings.MaxRows <= 0 {
		settings.AIAssistantSettings.MaxRows = 500
	}
	if settings.AIAssistantSettings.LLMTemperature < 0 {
		settings.AIAssistantSettings.LLMTemperature = 0
	}
	if settings.AIAssistantSettings.LLMTemperature > 1 {
		settings.AIAssistantSettings.LLMTemperature = 0.1
	}
}

func applyEnvOverrides(settings *model.AppSettings) {
	applyStringEnv("EVENTO_DB_PATH", &settings.SiteSettings.DBPath)
	applyStringEnv("EVENTO_PHOTO_STORAGE_PATH", &settings.SiteSettings.PhotoStoragePath)
	applyStringEnv("EVENTO_SECRET_JWT", &settings.SiteSettings.SecretJWT)

	applyStringEnv("EVENTO_SMTP_FROM_NAME", &settings.MailSettings.FromName)
	applyStringEnv("EVENTO_SMTP_FROM", &settings.MailSettings.From)
	applyStringEnv("EVENTO_SMTP_HOST", &settings.MailSettings.SMTP)
	applyStringEnv("EVENTO_SMTP_USER", &settings.MailSettings.User)
	applyStringEnv("EVENTO_SMTP_PASSWORD", &settings.MailSettings.Password)
	applyStringEnv("EVENTO_SMTP_DOMAIN", &settings.MailSettings.Domain)
	applyStringEnv("EVENTO_SMTP_CITY", &settings.MailSettings.City)

	applyIntEnv("EVENTO_SMTP_PORT", &settings.MailSettings.Port)
	applyIntEnv("EVENTO_AUTH_RATE_LIMIT_RPS", &settings.SiteSettings.AuthRateLimitRPS)
	applyIntEnv("EVENTO_AUTH_RATE_LIMIT_BURST", &settings.SiteSettings.AuthRateLimitBurst)
	applyIntEnv("EVENTO_AI_LLM_TIMEOUT_MS", &settings.AIAssistantSettings.LLMTimeoutMS)
	applyIntEnv("EVENTO_AI_QUERY_TIMEOUT_MS", &settings.AIAssistantSettings.QueryTimeoutMS)
	applyIntEnv("EVENTO_AI_MAX_ROWS", &settings.AIAssistantSettings.MaxRows)

	applyStringEnv("EVENTO_AI_PROVIDER", &settings.AIAssistantSettings.Provider)
	applyStringEnv("EVENTO_OPENROUTER_BASE_URL", &settings.AIAssistantSettings.OpenRouterBaseURL)
	applyStringEnv("EVENTO_OPENROUTER_MODEL", &settings.AIAssistantSettings.OpenRouterModel)
	applyStringEnv("EVENTO_OPENROUTER_API_KEY", &settings.AIAssistantSettings.OpenRouterAPIKey)
	applyStringEnv("EVENTO_OPENROUTER_REFERER", &settings.AIAssistantSettings.OpenRouterReferer)
	applyStringEnv("EVENTO_OPENROUTER_APP_TITLE", &settings.AIAssistantSettings.OpenRouterAppTitle)

	if enabledRaw := strings.TrimSpace(os.Getenv("EVENTO_AI_ENABLED")); enabledRaw != "" {
		settings.AIAssistantSettings.Enabled = strings.EqualFold(enabledRaw, "true") || enabledRaw == "1"
	}

	if tempRaw := strings.TrimSpace(os.Getenv("EVENTO_AI_TEMPERATURE")); tempRaw != "" {
		parsed, err := strconv.ParseFloat(tempRaw, 64)
		if err != nil {
			log.Printf("invalid float env EVENTO_AI_TEMPERATURE=%q: %v", tempRaw, err)
		} else {
			settings.AIAssistantSettings.LLMTemperature = parsed
		}
	}

	if origins := strings.TrimSpace(os.Getenv("EVENTO_CORS_ALLOW_ORIGINS")); origins != "" {
		settings.SiteSettings.CORSAllowOrigins = splitCommaSeparated(origins)
	}
}

func applyStringEnv(key string, target *string) {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		*target = value
	}
}

func applyIntEnv(key string, target *int) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		log.Printf("invalid integer env %s=%q: %v", key, value, err)
		return
	}
	*target = parsed
}

func splitCommaSeparated(raw string) []string {
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func validateSecuritySettings(settings *model.AppSettings) error {
	secret := strings.TrimSpace(settings.SiteSettings.SecretJWT)
	if secret == "" || strings.EqualFold(secret, "change-me") {
		return fmt.Errorf("unsafe site_settings.secret_jwt: set a strong value in app.yaml or EVENTO_SECRET_JWT")
	}
	if len(secret) < 24 {
		return fmt.Errorf("site_settings.secret_jwt is too short: minimum length is 24 characters")
	}
	settings.SiteSettings.CORSAllowOrigins = splitCommaSeparated(strings.Join(settings.SiteSettings.CORSAllowOrigins, ","))
	if len(settings.SiteSettings.CORSAllowOrigins) == 0 {
		return fmt.Errorf("site_settings.cors_allow_origins must contain at least one allowed origin")
	}
	if settings.SiteSettings.AuthRateLimitRPS <= 0 {
		return fmt.Errorf("site_settings.auth_rate_limit_rps must be greater than 0")
	}
	if settings.SiteSettings.AuthRateLimitBurst <= 0 {
		return fmt.Errorf("site_settings.auth_rate_limit_burst must be greater than 0")
	}
	if settings.AIAssistantSettings.Enabled {
		if strings.ToLower(strings.TrimSpace(settings.AIAssistantSettings.Provider)) != "openrouter" {
			return fmt.Errorf("ai_assistant.provider must be \"openrouter\"")
		}
		if strings.TrimSpace(settings.AIAssistantSettings.OpenRouterAPIKey) == "" {
			return fmt.Errorf("ai_assistant.openrouter_api_key is required when ai_assistant.enabled=true")
		}
		if strings.TrimSpace(settings.AIAssistantSettings.OpenRouterModel) == "" {
			return fmt.Errorf("ai_assistant.openrouter_model is required when ai_assistant.enabled=true")
		}
		if settings.AIAssistantSettings.MaxRows <= 0 {
			return fmt.Errorf("ai_assistant.max_rows must be greater than 0")
		}
	}
	return nil
}

func GetCORSAllowOrigins() []string {
	origins := make([]string, len(appSettings.SiteSettings.CORSAllowOrigins))
	copy(origins, appSettings.SiteSettings.CORSAllowOrigins)
	return origins
}

// Function to prompt user for username and password using promptui
func promptUser() (string, string, string) {
	// Create prompts for username and password
	usernamePrompt := promptui.Prompt{
		Label: "Enter username",
	}

	passwordPrompt := promptui.Prompt{
		Label: "Enter password",
		Mask:  '*',
	}

	rolePrompt := promptui.Select{
		Label: "Select role",
		Items: []string{"admin", "editor", "company", "operator", "monitoring"},
	}

	// Prompt user for username
	username, err := usernamePrompt.Run()
	if err != nil {
		fmt.Println("Prompt failed:", err)
		os.Exit(1)
	}

	// Prompt user for password
	password, err := passwordPrompt.Run()
	if err != nil {
		fmt.Println("Prompt failed:", err)
		os.Exit(1)
	}

	// Prompt user for username
	_, role, err := rolePrompt.Run()
	if err != nil {
		fmt.Println("Prompt failed:", err)
		os.Exit(1)
	}

	return strings.TrimSpace(username), strings.TrimSpace(password), strings.TrimSpace(role)
}
