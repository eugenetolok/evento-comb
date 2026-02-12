// internal/evento/member/logic.go (add this function)
// or create internal/evento/member/limits.go and place it there

package member

import (
	// ... other imports
	"errors"
	"fmt"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ... (keep existing functions like getCompanyMembers, getEditorMembers, setState etc.)

// validateMemberLimits checks if adding/updating a member violates company limits.
// memberID is nil for creation, or the existing member's ID for update.
func validateMemberLimits(tx *gorm.DB, companyID, accreditationID uuid.UUID, eventIDs, gateIDs []uuid.UUID, memberID *uuid.UUID) error {
	var company model.Company
	// Fetch company with all necessary preloads for limits
	if err := tx.Preload("AccreditationLimits").
		Preload("EventLimits").
		Preload("GateLimits").
		Preload("Members"). // Preload members to check general member limit
		First(&company, companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("компания %s не найдена", companyID)
		}
		return fmt.Errorf("ошибка при получении данных компании: %w", err)
	}

	// --- General Member Limit Check ---
	currentMemberCount := int64(len(company.Members))
	// For updates, the member already exists, so the count doesn't increase unless it's a new member
	isCreating := memberID == nil || *memberID == uuid.Nil
	if isCreating && uint(currentMemberCount+1) > company.MembersLimit {
		return fmt.Errorf("достигнут общий лимит участников для компании (%d)", company.MembersLimit)
	}

	// --- Accreditation Limit Check ---
	var accredLimitValue uint = 0
	foundAccredLimit := false
	for _, limit := range company.AccreditationLimits {
		if limit.AccreditationID == accreditationID {
			accredLimitValue = limit.Limit
			foundAccredLimit = true
			break
		}
	}

	if foundAccredLimit { // Only check if a specific limit is set for this accreditation
		var count int64
		query := tx.Model(&model.Member{}).Where("company_id = ? AND accreditation_id = ?", companyID, accreditationID)
		// Exclude the current member being updated from the count
		if memberID != nil && *memberID != uuid.Nil {
			query = query.Where("id != ?", *memberID)
		}
		if err := query.Count(&count).Error; err != nil {
			return fmt.Errorf("ошибка при подсчете участников для лимита аккредитации: %w", err)
		}

		if uint(count+1) > accredLimitValue {
			var accreditation model.Accreditation
			tx.Select("name").First(&accreditation, accreditationID) // Fetch name for better error message
			return fmt.Errorf("достигнут лимит для аккредитации '%s' (%d)", accreditation.Name, accredLimitValue)
		}
	} else {
		// Optional: Decide if an accreditation WITHOUT a specific limit entry is allowed at all
		// If not, return an error here:
		// return fmt.Errorf("для компании не установлен лимит для аккредитации %s", accreditationID)
		// If allowed (meaning no limit), do nothing.
		return fmt.Errorf("для компании не установлен лимит для аккредитации %s", accreditationID)
	}

	// --- Event Limits Check ---
	eventLimitMap := make(map[uuid.UUID]uint)
	for _, limit := range company.EventLimits {
		eventLimitMap[limit.EventID] = limit.Limit
	}

	for _, eventID := range eventIDs {
		limitValue, limitExists := eventLimitMap[eventID]
		if !limitExists {
			// Optional: Decide if an event WITHOUT a specific limit entry is allowed
			// If not: return fmt.Errorf("для компании не установлен лимит для мероприятия %s", eventID)
			// If allowed, continue to the next eventID
			// continue
			return fmt.Errorf("для компании не установлен лимит для мероприятия %s", eventID)
		}

		var count int64
		// We need to count existing members (excluding self if updating) associated with this specific event
		query := tx.Model(&model.Member{}).
			Joins("JOIN member_events ON member_events.member_id = members.id").
			Where("members.company_id = ? AND member_events.event_id = ?", companyID, eventID)

		if memberID != nil && *memberID != uuid.Nil {
			query = query.Where("members.id != ?", *memberID)
		}

		if err := query.Count(&count).Error; err != nil {
			return fmt.Errorf("ошибка при подсчете участников для лимита мероприятия %s: %w", eventID, err)
		}

		if uint(count+1) > limitValue {
			var event model.Event
			tx.Select("name").First(&event, eventID)
			return fmt.Errorf("достигнут лимит для мероприятия '%s' (%d)", event.Name, limitValue)
		}
	}

	// --- Gate Limits Check ---
	var accreditation model.Accreditation
	if err := tx.Preload("Gates").First(&accreditation, accreditationID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("аккредитация %s не найдена", accreditationID)
		}
		return fmt.Errorf("ошибка при получении данных аккредитации: %w", err)
	}
	// Build a set of gate IDs to be removed
	toRemove := make(map[uuid.UUID]struct{})
	for _, gate := range accreditation.Gates {
		toRemove[gate.ID] = struct{}{}
	}
	// Filter gateIDs to exclude IDs present in toRemove
	filteredGateIDs := make([]uuid.UUID, 0, len(gateIDs))
	for _, id := range gateIDs {
		if _, found := toRemove[id]; !found {
			filteredGateIDs = append(filteredGateIDs, id)
		}
	}
	// Now gateIDs contains only the IDs not present in accreditation.Gates
	gateIDs = filteredGateIDs

	gateLimitMap := make(map[uuid.UUID]uint)
	for _, limit := range company.GateLimits {
		gateLimitMap[limit.GateID] = limit.Limit
	}

	for _, gateID := range gateIDs {
		limitValue, limitExists := gateLimitMap[gateID]
		if !limitExists {
			// Optional: Decide if a gate WITHOUT a specific limit entry is allowed
			// If not: return fmt.Errorf("для компании не установлен лимит для доп. зоны %s", gateID)
			// If allowed, continue to the next gateID
			// continue
			return fmt.Errorf("для компании не установлен лимит для доп. зоны %s", gateID)
		}

		var count int64
		// Count existing members (excluding self if updating) associated with this specific gate
		query := tx.Model(&model.Member{}).
			Joins("JOIN member_gates ON member_gates.member_id = members.id").
			Where("members.company_id = ? AND member_gates.gate_id = ?", companyID, gateID)

		if memberID != nil && *memberID != uuid.Nil {
			query = query.Where("members.id != ?", *memberID)
		}

		if err := query.Count(&count).Error; err != nil {
			return fmt.Errorf("ошибка при подсчете участников для лимита доп. зоны %s: %w", gateID, err)
		}

		if uint(count+1) > limitValue {
			var gate model.Gate
			tx.Select("name").First(&gate, gateID)
			return fmt.Errorf("достигнут лимит для доп. зоны '%s' (%d)", gate.Name, limitValue)
		}
	}

	return nil // All limits are respected
}
