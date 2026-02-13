package aiassistant

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/eugenetolok/evento/pkg/model"
)

type generatedQueryPlan struct {
	SQL        string `json:"sql"`
	OutputMode string `json:"output_mode"`
	Title      string `json:"title"`
}

type openRouterChatRequest struct {
	Model          string                  `json:"model"`
	Messages       []openRouterChatMessage `json:"messages"`
	Temperature    float64                 `json:"temperature"`
	ResponseFormat map[string]string       `json:"response_format,omitempty"`
}

type openRouterChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openRouterChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func generateQueryPlan(ctx context.Context, settings model.AIAssistantSettings, userPrompt string, maxRows int) (generatedQueryPlan, error) {
	if strings.TrimSpace(settings.OpenRouterAPIKey) == "" {
		return generatedQueryPlan{}, fmt.Errorf("OpenRouter API key is not configured")
	}
	if strings.TrimSpace(settings.OpenRouterModel) == "" {
		return generatedQueryPlan{}, fmt.Errorf("OpenRouter model is not configured")
	}

	systemPrompt := buildSystemPrompt(maxRows)
	requestPayload := openRouterChatRequest{
		Model: settings.OpenRouterModel,
		Messages: []openRouterChatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature: settings.LLMTemperature,
		ResponseFormat: map[string]string{
			"type": "json_object",
		},
	}

	requestBytes, err := json.Marshal(requestPayload)
	if err != nil {
		return generatedQueryPlan{}, err
	}

	baseURL := strings.TrimRight(strings.TrimSpace(settings.OpenRouterBaseURL), "/")
	if baseURL == "" {
		baseURL = "https://openrouter.ai/api/v1"
	}
	endpoint := baseURL + "/chat/completions"

	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(requestBytes))
	if err != nil {
		return generatedQueryPlan{}, err
	}
	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.Header.Set("Authorization", "Bearer "+settings.OpenRouterAPIKey)
	if referer := strings.TrimSpace(settings.OpenRouterReferer); referer != "" {
		httpRequest.Header.Set("HTTP-Referer", referer)
	}
	if appTitle := strings.TrimSpace(settings.OpenRouterAppTitle); appTitle != "" {
		httpRequest.Header.Set("X-Title", appTitle)
	}

	client := &http.Client{}
	httpResponse, err := client.Do(httpRequest)
	if err != nil {
		return generatedQueryPlan{}, err
	}
	defer httpResponse.Body.Close()

	responseBody, err := io.ReadAll(httpResponse.Body)
	if err != nil {
		return generatedQueryPlan{}, err
	}
	if httpResponse.StatusCode >= 400 {
		return generatedQueryPlan{}, fmt.Errorf("openrouter request failed: %s", strings.TrimSpace(string(responseBody)))
	}

	var completionResponse openRouterChatResponse
	if err := json.Unmarshal(responseBody, &completionResponse); err != nil {
		return generatedQueryPlan{}, err
	}
	if completionResponse.Error != nil && completionResponse.Error.Message != "" {
		return generatedQueryPlan{}, fmt.Errorf("openrouter error: %s", completionResponse.Error.Message)
	}
	if len(completionResponse.Choices) == 0 {
		return generatedQueryPlan{}, fmt.Errorf("openrouter returned no choices")
	}

	content := strings.TrimSpace(completionResponse.Choices[0].Message.Content)
	if content == "" {
		return generatedQueryPlan{}, fmt.Errorf("openrouter returned empty response")
	}

	plan, err := parseQueryPlan(content)
	if err != nil {
		return generatedQueryPlan{}, err
	}

	plan.OutputMode = detectOutputMode(userPrompt, plan.OutputMode)
	if strings.TrimSpace(plan.Title) == "" {
		plan.Title = "ai_query"
	}
	return plan, nil
}

func parseQueryPlan(content string) (generatedQueryPlan, error) {
	var plan generatedQueryPlan
	if err := json.Unmarshal([]byte(content), &plan); err == nil && strings.TrimSpace(plan.SQL) != "" {
		return plan, nil
	}

	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start < 0 || end <= start {
		return generatedQueryPlan{}, fmt.Errorf("failed to parse model json response")
	}
	trimmed := content[start : end+1]
	if err := json.Unmarshal([]byte(trimmed), &plan); err != nil {
		return generatedQueryPlan{}, fmt.Errorf("failed to decode model response: %w", err)
	}
	if strings.TrimSpace(plan.SQL) == "" {
		return generatedQueryPlan{}, fmt.Errorf("model returned empty SQL")
	}
	return plan, nil
}

func buildSystemPrompt(maxRows int) string {
	limitRule := fmt.Sprintf("4) Учитывай лимит строк: максимум %d.", maxRows)
	if maxRows <= 0 {
		limitRule = "4) Жесткий лимит строк не обязателен. Добавляй LIMIT только если пользователь явно просит сократить выборку."
	}

	return fmt.Sprintf(`Ты помощник для генерации SQL-запросов к SQLite.
Тебе нужно вернуть СТРОГО JSON-объект:
{
  "sql": "<один SQL SELECT или WITH...SELECT>",
  "output_mode": "table|xlsx",
  "title": "<краткое имя выгрузки латиницей_или_кириллицей>"
}

Правила:
1) Разрешены ТОЛЬКО SELECT/CTE-SELECT, без ; в конце, без комментариев.
2) Запрещены любые мутации данных и системные команды.
3) Используй только перечисленные VIEW (НЕ базовые таблицы):
%s
%s
5) Если пользователь просит выгрузку/файл/Excel/XLSX — output_mode="xlsx", иначе output_mode="table".
6) Не используй SELECT *.
7) По умолчанию возвращай только человеко-читаемые бизнес-поля (то, что важно пользователю).
8) Технические поля (id, *_id, created_at, updated_at и т.п.) включай только если пользователь явно попросил.
9) Для каждого столбца в финальном SELECT задавай понятный алиас (желательно на русском, в двойных кавычках), например "Компания", "Количество участников".
   Важно: алиас ставится справа, а источник слева. Правильно: name AS "Имя". Неправильно: "Имя" AS name.
10) Не добавляй markdown и пояснения, только JSON.
`, schemaPrompt(), limitRule)
}
