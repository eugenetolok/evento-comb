package aiassistant

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/labstack/echo/v4"
	_ "github.com/mattn/go-sqlite3"
	"github.com/tealeg/xlsx/v3"
)

type queryRequest struct {
	Prompt        string `json:"prompt"`
	OutputMode    string `json:"output_mode"`
	Unlimited     bool   `json:"unlimited"`
	HumanReadable *bool  `json:"human_readable"`
}

type exportRequest struct {
	SQL           string `json:"sql"`
	Title         string `json:"title"`
	Unlimited     bool   `json:"unlimited"`
	HumanReadable *bool  `json:"human_readable"`
}

type queryResponse struct {
	Prompt        string                   `json:"prompt"`
	Title         string                   `json:"title"`
	SQL           string                   `json:"sql"`
	OutputMode    string                   `json:"output_mode"`
	Columns       []string                 `json:"columns"`
	Rows          []map[string]interface{} `json:"rows"`
	RowCount      int                      `json:"row_count"`
	Unlimited     bool                     `json:"unlimited"`
	HumanReadable bool                     `json:"human_readable"`
	GeneratedAt   string                   `json:"generated_at"`
}

type schemaViewResponse struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Columns     []string `json:"columns"`
}

type schemaResponse struct {
	Enabled bool                 `json:"enabled"`
	MaxRows int                  `json:"max_rows"`
	Views   []schemaViewResponse `json:"views"`
}

var readableColumnNames = map[string]string{
	"name":               "Имя",
	"surname":            "Фамилия",
	"middlename":         "Отчество",
	"full_name":          "ФИО",
	"document":           "Документ",
	"company":            "Компания",
	"company_name":       "Компания",
	"accreditation":      "Аккредитация",
	"accreditation_name": "Аккредитация",
	"email":              "Email",
	"phone":              "Телефон",
	"number":             "Номер",
	"type":               "Тип",
	"route":              "Маршрут",
	"state":              "Статус",
	"description":        "Описание",
	"event":              "Мероприятие",
	"event_name":         "Мероприятие",
	"gate":               "Зона",
	"gate_name":          "Зона",
	"limit":              "Лимит",
	"count":              "Количество",
	"total":              "Итого",
	"pass":               "Пропуск",
	"pass2":              "Пропуск 2",
	"in_zone":            "В зоне",
	"blocked":            "Заблокирован",
	"responsible":        "Ответственный",
	"birth":              "Дата рождения",
	"print_count":        "Печатей",
	"given_bangle_count": "Выдано браслетов",
	"given_bangle":       "Выдан браслет",
	"short_name":         "Короткое имя",
	"time_start":         "Начало",
	"time_end":           "Окончание",
	"frozen":             "Заморожена",
	"frozen_at":          "Заморожена с",
	"username":           "Логин",
	"role":               "Роль",
}

var technicalColumns = map[string]struct{}{
	"id":                    {},
	"user_id":               {},
	"member_id":             {},
	"company_id":            {},
	"gate_id":               {},
	"event_id":              {},
	"accreditation_id":      {},
	"responsible_member_id": {},
	"editor_id":             {},
	"created_at":            {},
	"updated_at":            {},
	"deleted_at":            {},
	"photo_filename":        {},
}

var (
	reversedHumanAliasPattern = regexp.MustCompile(`(?i)(["'])([^"']*[\p{Cyrillic}][^"']*)["']\s+as\s+([a-z_][a-z0-9_]*)`)
	schemaColumnSet           = buildSchemaColumnSet()
)

func getSchema(c echo.Context) error {
	views := make([]schemaViewResponse, 0, len(readonlyViews))
	for _, view := range readonlyViews {
		views = append(views, schemaViewResponse{
			Name:        view.Name,
			Description: view.Description,
			Columns:     view.Columns,
		})
	}

	return c.JSON(http.StatusOK, schemaResponse{
		Enabled: config.Enabled,
		MaxRows: config.MaxRows,
		Views:   views,
	})
}

func runQuery(c echo.Context) error {
	if !config.Enabled {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": "ai assistant is disabled in config",
		})
	}
	if strings.ToLower(strings.TrimSpace(config.Provider)) != "openrouter" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "unsupported ai provider",
		})
	}

	var request queryRequest
	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}
	request.Prompt = strings.TrimSpace(request.Prompt)
	if request.Prompt == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "prompt is required",
		})
	}
	if len(request.Prompt) > 4000 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "prompt is too long",
		})
	}
	humanReadable := resolveHumanReadable(request.HumanReadable)
	maxRows := resolveMaxRows(request.Unlimited)

	llmCtx, llmCancel := context.WithTimeout(c.Request().Context(), time.Duration(config.LLMTimeoutMS)*time.Millisecond)
	defer llmCancel()

	plan, err := generateQueryPlan(llmCtx, config, request.Prompt, maxRows)
	if err != nil {
		return c.JSON(http.StatusBadGateway, map[string]string{
			"error": fmt.Sprintf("ai generation failed: %s", err.Error()),
		})
	}
	plan.SQL = rewriteReversedHumanAliases(plan.SQL)

	safeSQL, err := sanitizeSelectSQL(plan.SQL, maxRows)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("unsafe sql generated: %s", err.Error()),
		})
	}
	plan.SQL = safeSQL

	rows, columns, err := executeReadOnlyQuery(c.Request().Context(), safeSQL, config.QueryTimeoutMS, maxRows)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("query execution failed: %s", err.Error()),
		})
	}
	if humanReadable {
		columns, rows = applyHumanReadableResult(columns, rows)
	}

	finalOutputMode := detectOutputMode(request.Prompt, request.OutputMode)
	if request.OutputMode == "" || strings.EqualFold(request.OutputMode, "auto") {
		finalOutputMode = detectOutputMode(request.Prompt, plan.OutputMode)
	}

	if finalOutputMode == "xlsx" {
		fileBytes, err := buildXLSX(columns, rows)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": fmt.Sprintf("xlsx build failed: %s", err.Error()),
			})
		}

		now := time.Now().Format("20060102_150405")
		title := strings.TrimSpace(plan.Title)
		if title == "" {
			title = "ai_query"
		}
		filename := utils.SanitizeFilename(fmt.Sprintf("%s_%s.xlsx", title, now))
		c.Response().Header().Set(echo.HeaderContentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Response().Header().Set(echo.HeaderContentDisposition, "attachment; filename="+filename)
		c.Response().Header().Set("X-AI-SQL", safeSQL)
		return c.Blob(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileBytes)
	}

	response := queryResponse{
		Prompt:        request.Prompt,
		Title:         plan.Title,
		SQL:           safeSQL,
		OutputMode:    finalOutputMode,
		Columns:       columns,
		Rows:          rows,
		RowCount:      len(rows),
		Unlimited:     request.Unlimited,
		HumanReadable: humanReadable,
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
	}
	return c.JSON(http.StatusOK, response)
}

func exportQuery(c echo.Context) error {
	if !config.Enabled {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": "ai assistant is disabled in config",
		})
	}
	if strings.ToLower(strings.TrimSpace(config.Provider)) != "openrouter" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "unsupported ai provider",
		})
	}

	var request exportRequest
	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid request body",
		})
	}

	request.SQL = strings.TrimSpace(request.SQL)
	if request.SQL == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "sql is required",
		})
	}
	if len(request.SQL) > 16000 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "sql is too long",
		})
	}

	maxRows := resolveMaxRows(request.Unlimited)
	humanReadable := resolveHumanReadable(request.HumanReadable)
	safeSQL, err := sanitizeSelectSQL(request.SQL, maxRows)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("unsafe sql: %s", err.Error()),
		})
	}

	rows, columns, err := executeReadOnlyQuery(c.Request().Context(), safeSQL, config.QueryTimeoutMS, maxRows)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("query execution failed: %s", err.Error()),
		})
	}
	if humanReadable {
		columns, rows = applyHumanReadableResult(columns, rows)
	}

	fileBytes, err := buildXLSX(columns, rows)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("xlsx build failed: %s", err.Error()),
		})
	}

	title := strings.TrimSpace(request.Title)
	if title == "" {
		title = "ai_export"
	}
	filename := utils.SanitizeFilename(fmt.Sprintf("%s_%s.xlsx", title, time.Now().Format("20060102_150405")))
	c.Response().Header().Set(echo.HeaderContentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Response().Header().Set(echo.HeaderContentDisposition, "attachment; filename="+filename)
	c.Response().Header().Set("X-AI-SQL", safeSQL)
	return c.Blob(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileBytes)
}

func executeReadOnlyQuery(parent context.Context, query string, timeoutMS int, maxRows int) ([]map[string]interface{}, []string, error) {
	dbConn, err := getReadOnlyDB()
	if err != nil {
		return nil, nil, err
	}

	queryCtx, cancel := context.WithTimeout(parent, time.Duration(timeoutMS)*time.Millisecond)
	defer cancel()

	rows, err := dbConn.QueryContext(queryCtx, query)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, nil, err
	}

	resultRows := make([]map[string]interface{}, 0)
	for rows.Next() {
		valueBuffer := make([]interface{}, len(columns))
		valuePointers := make([]interface{}, len(columns))
		for i := range valueBuffer {
			valuePointers[i] = &valueBuffer[i]
		}

		if err := rows.Scan(valuePointers...); err != nil {
			return nil, nil, err
		}

		rowMap := make(map[string]interface{}, len(columns))
		for i, columnName := range columns {
			rowMap[columnName] = normalizeSQLValue(valueBuffer[i])
		}
		resultRows = append(resultRows, rowMap)

		if maxRows > 0 && len(resultRows) >= maxRows {
			break
		}
	}

	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	return resultRows, columns, nil
}

func getReadOnlyDB() (*sql.DB, error) {
	if readOnlyDB != nil {
		return readOnlyDB, nil
	}

	dsn := buildReadOnlyDSN(databasePath)
	conn, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, err
	}
	conn.SetMaxOpenConns(1)
	conn.SetMaxIdleConns(1)
	conn.SetConnMaxLifetime(10 * time.Minute)
	readOnlyDB = conn
	return readOnlyDB, nil
}

func buildReadOnlyDSN(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		trimmed = "main.db"
	}
	if !strings.HasPrefix(trimmed, "file:") {
		trimmed = "file:" + filepath.Clean(trimmed)
	}
	if strings.Contains(trimmed, "?") {
		return trimmed + "&mode=ro&_query_only=1&_busy_timeout=5000"
	}
	return trimmed + "?mode=ro&_query_only=1&_busy_timeout=5000"
}

func normalizeSQLValue(value interface{}) interface{} {
	switch typed := value.(type) {
	case nil:
		return nil
	case []byte:
		return string(typed)
	case time.Time:
		return typed.UTC().Format(time.RFC3339)
	default:
		return typed
	}
}

func buildXLSX(columns []string, rows []map[string]interface{}) ([]byte, error) {
	file := xlsx.NewFile()
	sheet, err := file.AddSheet("AI Query")
	if err != nil {
		return nil, err
	}

	header := sheet.AddRow()
	for _, column := range columns {
		cell := header.AddCell()
		cell.SetString(column)
	}

	for _, row := range rows {
		sheetRow := sheet.AddRow()
		for _, column := range columns {
			cell := sheetRow.AddCell()
			value := row[column]
			if value == nil {
				cell.SetString("")
				continue
			}
			cell.SetString(fmt.Sprint(value))
		}
	}

	buffer := new(bytes.Buffer)
	if err := file.Write(buffer); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func resolveMaxRows(unlimited bool) int {
	if unlimited {
		return 0
	}
	return config.MaxRows
}

func resolveHumanReadable(flag *bool) bool {
	if flag == nil {
		return true
	}
	return *flag
}

func applyHumanReadableResult(columns []string, rows []map[string]interface{}) ([]string, []map[string]interface{}) {
	if len(columns) == 0 {
		return columns, rows
	}

	selectedColumns := make([]string, 0, len(columns))
	for _, column := range columns {
		if !isTechnicalColumn(column) {
			selectedColumns = append(selectedColumns, column)
		}
	}
	if len(selectedColumns) == 0 {
		selectedColumns = columns
	}

	displayNames := make([]string, 0, len(selectedColumns))
	used := make(map[string]int, len(selectedColumns))
	for _, column := range selectedColumns {
		displayNames = append(displayNames, uniqueDisplayColumnName(humanizeColumnName(column), used))
	}

	resultRows := make([]map[string]interface{}, 0, len(rows))
	for _, row := range rows {
		resultRow := make(map[string]interface{}, len(selectedColumns))
		for index, sourceColumn := range selectedColumns {
			displayColumn := displayNames[index]
			resultRow[displayColumn] = row[sourceColumn]
		}
		resultRows = append(resultRows, resultRow)
	}

	return displayNames, resultRows
}

func isTechnicalColumn(column string) bool {
	normalized := normalizeColumnName(column)
	if normalized == "" {
		return false
	}
	if _, exists := technicalColumns[normalized]; exists {
		return true
	}
	return strings.HasSuffix(normalized, "_id")
}

func normalizeColumnName(column string) string {
	value := strings.TrimSpace(column)
	if len(value) >= 2 {
		first := value[0]
		last := value[len(value)-1]
		if (first == '"' && last == '"') || (first == '`' && last == '`') || (first == '[' && last == ']') {
			value = value[1 : len(value)-1]
		}
	}
	return strings.ToLower(strings.TrimSpace(value))
}

func humanizeColumnName(column string) string {
	raw := strings.TrimSpace(column)
	if raw == "" {
		return "Колонка"
	}
	if hasCyrillic(raw) || strings.Contains(raw, " ") {
		return raw
	}

	normalized := normalizeColumnName(raw)
	if label, exists := readableColumnNames[normalized]; exists {
		return label
	}

	parts := strings.Split(normalized, "_")
	for index, part := range parts {
		if label, exists := readableColumnNames[part]; exists {
			parts[index] = strings.ToLower(label)
		}
	}
	joined := strings.Join(parts, " ")
	if joined == "" {
		return raw
	}
	return capitalizeWords(joined)
}

func uniqueDisplayColumnName(base string, used map[string]int) string {
	label := strings.TrimSpace(base)
	if label == "" {
		label = "Колонка"
	}

	count := used[label]
	used[label] = count + 1
	if count == 0 {
		return label
	}
	return fmt.Sprintf("%s (%d)", label, count+1)
}

func capitalizeWords(value string) string {
	parts := strings.Fields(strings.TrimSpace(value))
	for index, part := range parts {
		if part == "" {
			continue
		}
		runes := []rune(part)
		runes[0] = unicode.ToUpper(runes[0])
		parts[index] = string(runes)
	}
	return strings.Join(parts, " ")
}

func hasCyrillic(value string) bool {
	for _, symbol := range value {
		if unicode.In(symbol, unicode.Cyrillic) {
			return true
		}
	}
	return false
}

func buildSchemaColumnSet() map[string]struct{} {
	result := make(map[string]struct{})
	for _, view := range readonlyViews {
		for _, column := range view.Columns {
			normalized := normalizeColumnName(column)
			if normalized == "" {
				continue
			}
			result[normalized] = struct{}{}
		}
	}
	return result
}

func rewriteReversedHumanAliases(sqlText string) string {
	return reversedHumanAliasPattern.ReplaceAllStringFunc(sqlText, func(fragment string) string {
		matches := reversedHumanAliasPattern.FindStringSubmatch(fragment)
		if len(matches) < 4 {
			return fragment
		}

		label := strings.TrimSpace(matches[2])
		sourceColumn := strings.ToLower(strings.TrimSpace(matches[3]))
		if label == "" || sourceColumn == "" {
			return fragment
		}
		if _, exists := schemaColumnSet[sourceColumn]; !exists {
			return fragment
		}

		safeLabel := strings.ReplaceAll(label, `"`, `""`)
		return fmt.Sprintf(`%s AS "%s"`, sourceColumn, safeLabel)
	})
}
