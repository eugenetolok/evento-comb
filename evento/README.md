# EVENTO

build:
go build --tags json1 -o bin ./...

config:
cp app.yaml.example app.yaml

security env overrides:
EVENTO_SECRET_JWT=<strong-secret-24+chars>
EVENTO_CORS_ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174
EVENTO_AUTH_RATE_LIMIT_RPS=5
EVENTO_AUTH_RATE_LIMIT_BURST=10

ai assistant (OpenRouter):
EVENTO_AI_ENABLED=true
EVENTO_AI_PROVIDER=openrouter
EVENTO_OPENROUTER_API_KEY=<your_openrouter_api_key>
EVENTO_OPENROUTER_MODEL=openai/gpt-4o-mini
EVENTO_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
