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
	FrontendNavItem struct {
		Label string `yaml:"label" json:"label"`
		Href  string `yaml:"href" json:"href"`
	}
	FrontendLinks struct {
		Docs string `yaml:"docs" json:"docs"`
	}
	FrontendSettings struct {
		Name        string                       `yaml:"name" json:"name"`
		Year        string                       `yaml:"year" json:"year"`
		Description string                       `yaml:"description" json:"description"`
		Version     string                       `yaml:"version" json:"version"`
		City        string                       `yaml:"city" json:"city"`
		Cities      map[string]string            `yaml:"cities" json:"cities"`
		Docs        map[string]string            `yaml:"docs" json:"docs"`
		NavItems    map[string][]FrontendNavItem `yaml:"nav_items" json:"navItems"`
		Links       FrontendLinks                `yaml:"links" json:"links"`
	}
	ReportDashboardSettings struct {
		PassWindowMinutes     int `yaml:"pass_window_minutes" json:"passWindowMinutes"`
		TopItemsLimit         int `yaml:"top_items_limit" json:"topItemsLimit"`
		AnomalyThreshold      int `yaml:"anomaly_threshold" json:"anomalyThreshold"`
		OverloadPercentRed    int `yaml:"overload_percent_red" json:"overloadPercentRed"`
		OverloadPercentYellow int `yaml:"overload_percent_yellow" json:"overloadPercentYellow"`
	}
	ReportSettings struct {
		Dashboard ReportDashboardSettings `yaml:"dashboard" json:"dashboard"`
	}
	AppSettings struct {
		SiteSettings     `yaml:"site_settings"`
		MailSettings     `yaml:"mail_settings"`
		FrontendSettings `yaml:"frontend_settings"`
		ReportSettings   `yaml:"report_settings"`
	}
)
