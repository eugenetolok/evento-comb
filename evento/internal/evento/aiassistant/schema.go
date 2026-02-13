package aiassistant

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
)

type viewDefinition struct {
	Name        string
	Description string
	Columns     []string
	CreateSQL   string
}

var readonlyViews = []viewDefinition{
	{
		Name:        "ai_users",
		Description: "Пользователи системы (без пароля и reset-хэшей)",
		Columns: []string{
			"id", "created_at", "updated_at", "username", "role", "frozen", "frozen_at", "frozen_action", "company_id",
		},
		CreateSQL: `CREATE VIEW ai_users AS
SELECT id, created_at, updated_at, username, role, frozen, frozen_at, frozen_action, company_id
FROM users
WHERE deleted_at IS NULL`,
	},
	{
		Name:        "ai_companies",
		Description: "Компании и их лимиты",
		Columns: []string{
			"id", "created_at", "updated_at", "name", "inn", "description", "cars_limit", "members_limit", "in_event_members_limit",
			"responsible_member_id", "default_route", "editor_id", "phone", "email",
		},
		CreateSQL: `CREATE VIEW ai_companies AS
SELECT id, created_at, updated_at, name, inn, description, cars_limit, members_limit, in_event_members_limit,
       responsible_member_id, default_route, editor_id, phone, email
FROM companies
WHERE deleted_at IS NULL`,
	},
	{
		Name:        "ai_members",
		Description: "Участники",
		Columns: []string{
			"id", "created_at", "updated_at", "document", "photo_filename", "name", "surname", "middlename", "company_name", "email", "phone",
			"barcode", "state", "description", "birth", "responsible", "print_count", "given_bangle_count", "company_id",
			"accreditation_id", "in_zone", "given_bangle", "blocked",
		},
		CreateSQL: `CREATE VIEW ai_members AS
SELECT id, created_at, updated_at, document, photo_filename, name, surname, middlename, company_name, email, phone,
       barcode, state, description, birth, responsible, print_count, given_bangle_count, company_id,
       accreditation_id, in_zone, given_bangle, blocked
FROM members
WHERE deleted_at IS NULL`,
	},
	{
		Name:        "ai_autos",
		Description: "Автомобили",
		Columns: []string{
			"id", "created_at", "updated_at", "number", "type", "route", "description", "company_id", "state", "pass", "pass2", "company",
		},
		CreateSQL: `CREATE VIEW ai_autos AS
SELECT id, created_at, updated_at, number, type, route, description, company_id, state, pass, pass2, company
FROM autos
WHERE deleted_at IS NULL`,
	},
	{
		Name:        "ai_accreditations",
		Description: "Типы аккредитаций",
		Columns:     []string{"id", "created_at", "updated_at", "name", "short_name", "description", "position", "hidden", "require_photo"},
		CreateSQL: `CREATE VIEW ai_accreditations AS
SELECT id, created_at, updated_at, name, short_name, description, position, hidden, require_photo
FROM accreditations
WHERE deleted_at IS NULL`,
	},
	{
		Name:        "ai_events",
		Description: "Мероприятия/даты",
		Columns:     []string{"id", "created_at", "updated_at", "name", "description", "position", "time_start", "time_end"},
		CreateSQL: `CREATE VIEW ai_events AS
SELECT id, created_at, updated_at, name, description, position, time_start, time_end
FROM events
WHERE deleted_at IS NULL`,
	},
	{
		Name:        "ai_gates",
		Description: "Зоны доступа",
		Columns:     []string{"id", "created_at", "updated_at", "name", "short_name", "description", "position", "external", "additional", "require_photo"},
		CreateSQL: `CREATE VIEW ai_gates AS
SELECT id, created_at, updated_at, name, short_name, description, position, external, additional, require_photo
FROM gates
WHERE deleted_at IS NULL`,
	},
	{
		Name:        "ai_company_accreditation_limits",
		Description: "Лимиты компании по аккредитациям",
		Columns:     []string{"id", "created_at", "updated_at", "company_id", "accreditation_id", "limit"},
		CreateSQL: `CREATE VIEW ai_company_accreditation_limits AS
SELECT id, created_at, updated_at, company_id, accreditation_id, "limit" AS "limit"
FROM company_accreditation_limits
WHERE deleted_at IS NULL`,
	},
	{
		Name:        "ai_company_event_limits",
		Description: "Лимиты компании по мероприятиям",
		Columns:     []string{"id", "created_at", "updated_at", "company_id", "event_id", "limit"},
		CreateSQL: `CREATE VIEW ai_company_event_limits AS
SELECT id, created_at, updated_at, company_id, event_id, "limit" AS "limit"
FROM company_event_limits
WHERE deleted_at IS NULL`,
	},
	{
		Name:        "ai_company_gate_limits",
		Description: "Лимиты компании по зонам",
		Columns:     []string{"id", "created_at", "updated_at", "company_id", "gate_id", "limit"},
		CreateSQL: `CREATE VIEW ai_company_gate_limits AS
SELECT id, created_at, updated_at, company_id, gate_id, "limit" AS "limit"
FROM company_gate_limits
WHERE deleted_at IS NULL`,
	},
	{
		Name:        "ai_member_passes",
		Description: "Факты проходов через зоны",
		Columns:     []string{"id", "created_at", "member_id", "gate_id"},
		CreateSQL: `CREATE VIEW ai_member_passes AS
SELECT id, created_at, member_id, gate_id
FROM member_passes
WHERE deleted_at IS NULL`,
	},
	{
		Name:        "ai_member_prints",
		Description: "Факты печати бейджей",
		Columns:     []string{"id", "created_at", "member_id"},
		CreateSQL: `CREATE VIEW ai_member_prints AS
SELECT id, created_at, member_id
FROM member_prints
WHERE deleted_at IS NULL`,
	},
	{
		Name:        "ai_member_events",
		Description: "Связи участник-мероприятие",
		Columns:     []string{"member_id", "event_id"},
		CreateSQL: `CREATE VIEW ai_member_events AS
SELECT member_id, event_id
FROM member_events`,
	},
	{
		Name:        "ai_member_gates",
		Description: "Связи участник-доп.зона",
		Columns:     []string{"member_id", "gate_id"},
		CreateSQL: `CREATE VIEW ai_member_gates AS
SELECT member_id, gate_id
FROM member_gates`,
	},
	{
		Name:        "ai_accreditation_gates",
		Description: "Связи аккредитация-зона",
		Columns:     []string{"accreditation_id", "gate_id"},
		CreateSQL: `CREATE VIEW ai_accreditation_gates AS
SELECT accreditation_id, gate_id
FROM accreditation_gates`,
	},
}

// EnsureReadOnlyViews prepares safe views used by the AI assistant.
func EnsureReadOnlyViews(db *gorm.DB) error {
	for _, view := range readonlyViews {
		if err := db.Exec(fmt.Sprintf("DROP VIEW IF EXISTS %s", view.Name)).Error; err != nil {
			return err
		}
		if err := db.Exec(view.CreateSQL).Error; err != nil {
			return err
		}
	}
	return nil
}

func allowedViewSet() map[string]struct{} {
	allowed := make(map[string]struct{}, len(readonlyViews))
	for _, view := range readonlyViews {
		allowed[view.Name] = struct{}{}
	}
	return allowed
}

func schemaPrompt() string {
	var builder strings.Builder
	builder.WriteString("Доступные VIEW для запросов (SQLite):\n")
	for _, view := range readonlyViews {
		builder.WriteString("- ")
		builder.WriteString(view.Name)
		builder.WriteString(" : ")
		builder.WriteString(view.Description)
		builder.WriteString("\n  columns: ")
		builder.WriteString(strings.Join(view.Columns, ", "))
		builder.WriteString("\n")
	}
	return builder.String()
}
