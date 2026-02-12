package model

type (
	SiteSettings struct {
		DBPath           string `yaml:"db_path"`
		Debug            bool   `yaml:"debug"`
		AdminToken       string `yaml:"admin_token"`
		SecretJWT        string `yaml:"secret_jwt"`
		PhotoStoragePath string `yaml:"photo_storage_path"`
	}
	MailSettings struct {
		FromName string `yaml:"from_name"`
		From     string `yaml:"from"`
		SMTP     string `yaml:"smtp"`
		Port     int    `yaml:"port"`
		User     string `yaml:"user"`
		Password string `yaml:"password"`
		Domain   string `yaml:"domain"`
		City     string `yaml:"city"`
	}
	AppSettings struct {
		SiteSettings `yaml:"site_settings"`
		MailSettings `yaml:"mail_settings"`
	}
)
