package evento

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"

	"github.com/eugenetolok/evento/pkg/model"
)

func updateMembersAndAutosCompanyName() {
	queries := []struct {
		desc  string
		query string
	}{
		{
			"update autos company name",
			`UPDATE autos
			SET company = (
				SELECT name FROM companies WHERE companies.id = autos.company_id
			)
			WHERE company IS NULL OR company != (
				SELECT name FROM companies WHERE companies.id = autos.company_id
			)`,
		},
		{
			"update autos route",
			`UPDATE autos
			SET route = (
				SELECT default_route FROM companies WHERE companies.id = autos.company_id
			)
			WHERE route IS NULL OR route != (
				SELECT default_route FROM companies WHERE companies.id = autos.company_id
			)`,
		},
		{
			"update members company name",
			`WITH updated_values AS (
				SELECT
					m.id AS member_id,
					c.name AS new_company_name
				FROM members m
				JOIN companies c ON m.company_id = c.id
				WHERE m.company_name IS NULL OR m.company_name != c.name
			)
			UPDATE members
			SET company_name = (
				SELECT new_company_name FROM updated_values WHERE updated_values.member_id = members.id
			)
			WHERE id IN (SELECT member_id FROM updated_values);`,
		},
	}

	for _, q := range queries {
		fmt.Printf("Executing: %s...\n", q.desc)
		if err := db.Exec(q.query).Error; err != nil {
			fmt.Printf("Failed to %s: %s\n", q.desc, err.Error())
			return
		}
	}
}

func md5Hash(text string) string {
	hash := md5.Sum([]byte(text))
	return hex.EncodeToString(hash[:])
}

func updateMembersBarcode() {
	var members []model.Member
	db.Where("barcode = ?", "").Find(&members)
	for _, member := range members {
		member.Barcode = md5Hash(fmt.Sprintf("%sFFF300001001001", member.ID.String()))
		db.Save(&member)
	}
}
