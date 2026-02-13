package model

type (
	SiteSettings struct {
		DBPath             string   `yaml:"db_path"`
		Debug              bool     `yaml:"debug"`
		AdminToken         string   `yaml:"admin_token"`
		SecretJWT          string   `yaml:"secret_jwt"`
		PhotoStoragePath   string   `yaml:"photo_storage_path"`
		CORSAllowOrigins   []string `yaml:"cors_allow_origins"`
		AuthRateLimitRPS   int      `yaml:"auth_rate_limit_rps"`
		AuthRateLimitBurst int      `yaml:"auth_rate_limit_burst"`
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
	AIAssistantSettings struct {
		Enabled            bool    `yaml:"enabled" json:"enabled"`
		Provider           string  `yaml:"provider" json:"provider"`
		OpenRouterBaseURL  string  `yaml:"openrouter_base_url" json:"openRouterBaseUrl"`
		OpenRouterModel    string  `yaml:"openrouter_model" json:"openRouterModel"`
		OpenRouterAPIKey   string  `yaml:"openrouter_api_key" json:"-"`
		OpenRouterReferer  string  `yaml:"openrouter_referer" json:"openRouterReferer"`
		OpenRouterAppTitle string  `yaml:"openrouter_app_title" json:"openRouterAppTitle"`
		LLMTemperature     float64 `yaml:"llm_temperature" json:"llmTemperature"`
		LLMTimeoutMS       int     `yaml:"llm_timeout_ms" json:"llmTimeoutMs"`
		QueryTimeoutMS     int     `yaml:"query_timeout_ms" json:"queryTimeoutMs"`
		MaxRows            int     `yaml:"max_rows" json:"maxRows"`
	}
	AppSettings struct {
		SiteSettings        `yaml:"site_settings"`
		MailSettings        `yaml:"mail_settings"`
		FrontendSettings    `yaml:"frontend_settings"`
		ReportSettings      `yaml:"report_settings"`
		AIAssistantSettings `yaml:"ai_assistant"`
	}
)
