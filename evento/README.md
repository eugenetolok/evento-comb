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
