package evento

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

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
