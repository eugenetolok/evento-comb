package aiassistant

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

var (
	sqlIdentifierPattern = `(?:"[^"]+"|` + "`[^`]+`" + `|\[[^\]]+\]|[a-zA-Z_][a-zA-Z0-9_]*)`

	forbiddenSQLPattern = regexp.MustCompile(`(?i)\b(insert|update|delete|drop|alter|create|replace|truncate|attach|detach|pragma|vacuum|reindex|grant|revoke|commit|rollback|savepoint|transaction|analyze)\b`)
	fromJoinPattern     = regexp.MustCompile(`(?is)\b(?:from|join)\s+(` + sqlIdentifierPattern + `(?:\.` + sqlIdentifierPattern + `)?)`)
	ctePattern          = regexp.MustCompile(`(?is)(?:with|,)\s*(` + sqlIdentifierPattern + `)\s+as\s*\(`)
	fromClausePattern   = regexp.MustCompile(`(?is)\bfrom\b\s+(.*?)(?:\bwhere\b|\bgroup\b|\border\b|\bhaving\b|\blimit\b|\boffset\b|\bunion\b|$)`)
	limitPattern        = regexp.MustCompile(`(?i)\blimit\s+(\d+)\b`)
)

func sanitizeSelectSQL(rawSQL string, maxRows int) (string, error) {
	sqlText := strings.TrimSpace(rawSQL)
	for strings.HasSuffix(sqlText, ";") {
		sqlText = strings.TrimSpace(strings.TrimSuffix(sqlText, ";"))
	}
	if sqlText == "" {
		return "", fmt.Errorf("empty sql")
	}
	if strings.Contains(sqlText, ";") {
		return "", fmt.Errorf("multiple statements are not allowed")
	}

	lower := strings.ToLower(sqlText)
	if strings.Contains(lower, "--") || strings.Contains(lower, "/*") || strings.Contains(lower, "*/") {
		return "", fmt.Errorf("comments are not allowed")
	}
	if !strings.HasPrefix(lower, "select") && !strings.HasPrefix(lower, "with") {
		return "", fmt.Errorf("only SELECT statements are allowed")
	}
	if forbiddenSQLPattern.MatchString(sqlText) {
		return "", fmt.Errorf("forbidden sql keyword detected")
	}
	if strings.Contains(lower, "sqlite_master") || strings.Contains(lower, "pragma_") {
		return "", fmt.Errorf("system objects are forbidden")
	}
	if err := disallowCommaJoinSyntax(sqlText); err != nil {
		return "", err
	}

	allowedViews := allowedViewSet()
	allowedWithNames := extractCTENames(sqlText)
	for _, table := range extractFromJoinTables(sqlText) {
		if _, ok := allowedViews[table]; ok {
			continue
		}
		if _, ok := allowedWithNames[table]; ok {
			continue
		}
		return "", fmt.Errorf("table or view %q is not allowed", table)
	}

	return enforceQueryLimit(sqlText, maxRows)
}

func extractFromJoinTables(sqlText string) []string {
	matches := fromJoinPattern.FindAllStringSubmatch(sqlText, -1)
	tables := make([]string, 0, len(matches))
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		normalized := normalizeIdentifier(match[1])
		if normalized == "" {
			continue
		}
		tables = append(tables, normalized)
	}
	return tables
}

func extractCTENames(sqlText string) map[string]struct{} {
	matches := ctePattern.FindAllStringSubmatch(sqlText, -1)
	result := make(map[string]struct{}, len(matches))
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		name := normalizeIdentifier(match[1])
		if name == "" {
			continue
		}
		result[name] = struct{}{}
	}
	return result
}

func enforceQueryLimit(sqlText string, maxRows int) (string, error) {
	if maxRows <= 0 {
		return sqlText, nil
	}

	limitMatch := limitPattern.FindStringSubmatchIndex(sqlText)
	if limitMatch == nil {
		return strings.TrimSpace(sqlText) + fmt.Sprintf(" LIMIT %d", maxRows), nil
	}
	if len(limitMatch) < 4 {
		return "", fmt.Errorf("invalid LIMIT clause")
	}

	valueStart := limitMatch[2]
	valueEnd := limitMatch[3]
	limitValueRaw := sqlText[valueStart:valueEnd]
	limitValue, err := strconv.Atoi(limitValueRaw)
	if err != nil {
		return "", fmt.Errorf("invalid LIMIT value")
	}
	if limitValue <= maxRows {
		return sqlText, nil
	}

	return sqlText[:valueStart] + strconv.Itoa(maxRows) + sqlText[valueEnd:], nil
}

func disallowCommaJoinSyntax(sqlText string) error {
	matches := fromClausePattern.FindAllStringSubmatch(sqlText, -1)
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		segment := strings.TrimSpace(match[1])
		if segment == "" {
			continue
		}
		if strings.Contains(segment, ",") {
			return fmt.Errorf("comma joins are not allowed, use explicit JOIN")
		}
	}
	return nil
}

func normalizeIdentifier(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	parts := strings.Split(value, ".")
	last := strings.TrimSpace(parts[len(parts)-1])
	if len(last) >= 2 {
		first := last[0]
		tail := last[len(last)-1]
		if (first == '"' && tail == '"') || (first == '`' && tail == '`') || (first == '[' && tail == ']') {
			last = last[1 : len(last)-1]
		}
	}
	return strings.ToLower(strings.TrimSpace(last))
}

func detectOutputMode(prompt string, requested string) string {
	mode := strings.ToLower(strings.TrimSpace(requested))
	if mode == "table" || mode == "xlsx" {
		return mode
	}

	lowerPrompt := strings.ToLower(prompt)
	if strings.Contains(lowerPrompt, "xlsx") ||
		strings.Contains(lowerPrompt, "excel") ||
		strings.Contains(lowerPrompt, "выгруз") ||
		strings.Contains(lowerPrompt, "скач") ||
		strings.Contains(lowerPrompt, "файл") {
		return "xlsx"
	}

	return "table"
}
