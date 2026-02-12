package evento

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/smtp"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/manifoldco/promptui"
	"github.com/robfig/cron"
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
			model.User{}, model.Member{}, model.Company{}, model.Auto{}, model.Accreditation{}, model.Event{}, model.Gate{}, model.CompanyAccreditationLimit{}, model.CompanyEventLimit{}, model.CompanyGateLimit{}, model.MemberPass{}, model.MemberPrint{}, model.MemberHistory{}, model.CompanyHistory{}, model.AutoHistory{}, model.BadgeTemplate{})
		log.Println("All tables are dropped")
		os.Exit(0)
	}
	if f.Migrate {
		db.AutoMigrate(
			model.User{}, model.Member{}, model.Company{}, model.Auto{}, model.Accreditation{}, model.Event{}, model.Gate{}, model.CompanyAccreditationLimit{}, model.CompanyEventLimit{}, model.CompanyGateLimit{}, model.MemberPass{}, model.MemberPrint{}, model.MemberHistory{}, model.CompanyHistory{}, model.AutoHistory{}, model.BadgeTemplate{})
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
	c := cron.New()
	c.AddFunc("@every 60s", updateMembersAndAutosCompanyName)
	c.AddFunc("@every 60s", updateMembersBarcode)
	c.Start()
}

func updateConfig() {
	if !utils.UnmarshalYaml("app.yaml", &appSettings) {
		log.Println("settings invalid")
	}
	applyDefaultAppSettings(&appSettings)
}

func applyDefaultAppSettings(settings *model.AppSettings) {
	currentYear := fmt.Sprintf("%d", time.Now().Year())

	if settings.SiteSettings.DBPath == "" {
		settings.SiteSettings.DBPath = "test.db"
	}
	if settings.SiteSettings.PhotoStoragePath == "" {
		settings.SiteSettings.PhotoStoragePath = "photos"
	}
	if settings.SiteSettings.SecretJWT == "" {
		settings.SiteSettings.SecretJWT = "change-me"
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
