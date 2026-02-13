package member

import (
	"errors"
	"fmt"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"gorm.io/gorm"
)

const (
	memberBarcodeBytes       = 16
	memberBarcodeMaxAttempts = 8
)

func generateUniqueMemberBarcode(tx *gorm.DB) (string, error) {
	if tx == nil {
		return "", errors.New("database connection is nil")
	}

	for attempt := 0; attempt < memberBarcodeMaxAttempts; attempt++ {
		candidate := utils.GenerateRandomHex(memberBarcodeBytes)
		if candidate == "" {
			continue
		}

		var count int64
		if err := tx.Model(&model.Member{}).Where("barcode = ?", candidate).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return candidate, nil
		}
	}

	return "", fmt.Errorf("failed to generate unique barcode after %d attempts", memberBarcodeMaxAttempts)
}
