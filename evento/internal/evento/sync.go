package evento

import (
	"fmt"
	"log"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
)

func syncDerivedCompanyFieldsOnce() {
	queries := []struct {
		description string
		sql         string
	}{
		{
			description: "sync autos.company",
			sql: `UPDATE autos
				  SET company = (SELECT name FROM companies WHERE companies.id = autos.company_id)
				  WHERE company IS NULL OR company != (SELECT name FROM companies WHERE companies.id = autos.company_id)`,
		},
		{
			description: "sync autos.route",
			sql: `UPDATE autos
				  SET route = (SELECT default_route FROM companies WHERE companies.id = autos.company_id)
				  WHERE route IS NULL OR route != (SELECT default_route FROM companies WHERE companies.id = autos.company_id)`,
		},
		{
			description: "sync members.company_name",
			sql: `UPDATE members
				  SET company_name = (SELECT name FROM companies WHERE companies.id = members.company_id)
				  WHERE company_name IS NULL OR company_name != (SELECT name FROM companies WHERE companies.id = members.company_id)`,
		},
	}

	for _, query := range queries {
		if err := db.Exec(query.sql).Error; err != nil {
			log.Printf("startup sync failed (%s): %v", query.description, err)
		}
	}
}

func syncEmptyMemberBarcodesOnce() {
	var members []model.Member
	if err := db.Where("barcode = '' OR barcode IS NULL").Find(&members).Error; err != nil {
		log.Printf("startup barcode sync failed while selecting members: %v", err)
		return
	}

	for _, member := range members {
		barcode, err := generateUniqueMemberBarcodeForSync()
		if err != nil {
			log.Printf("startup barcode generation failed for member %s: %v", member.ID.String(), err)
			continue
		}
		if err := db.Model(&model.Member{}).Where("id = ?", member.ID).Update("barcode", barcode).Error; err != nil {
			log.Printf("startup barcode sync failed for member %s: %v", member.ID.String(), err)
		}
	}
}

func generateUniqueMemberBarcodeForSync() (string, error) {
	const (
		barcodeBytes       = 16
		maxBarcodeAttempts = 8
	)

	for attempt := 0; attempt < maxBarcodeAttempts; attempt++ {
		candidate := utils.GenerateRandomHex(barcodeBytes)
		if candidate == "" {
			continue
		}

		var count int64
		if err := db.Model(&model.Member{}).Where("barcode = ?", candidate).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return candidate, nil
		}
	}

	return "", fmt.Errorf("failed to generate unique barcode after %d attempts", maxBarcodeAttempts)
}

func ensureUserFreezeScheduleColumns() {
	if !db.Migrator().HasColumn(&model.User{}, "FrozenAt") {
		if err := db.Migrator().AddColumn(&model.User{}, "FrozenAt"); err != nil {
			log.Printf("unable to add users.frozen_at column: %v", err)
		}
	}
	if !db.Migrator().HasColumn(&model.User{}, "FrozenAction") {
		if err := db.Migrator().AddColumn(&model.User{}, "FrozenAction"); err != nil {
			log.Printf("unable to add users.frozen_action column: %v", err)
		}
	}
	if !db.Migrator().HasColumn(&model.User{}, "PasswordResetTokenHash") {
		if err := db.Migrator().AddColumn(&model.User{}, "PasswordResetTokenHash"); err != nil {
			log.Printf("unable to add users.password_reset_token_hash column: %v", err)
		}
	}
	if !db.Migrator().HasColumn(&model.User{}, "PasswordResetExpiresAt") {
		if err := db.Migrator().AddColumn(&model.User{}, "PasswordResetExpiresAt"); err != nil {
			log.Printf("unable to add users.password_reset_expires_at column: %v", err)
		}
	}
}
