// src/lib/badgeUtils.js

// --- CONSTANTS ---
// DEPRECATED: ALL LAYOUT INFO IS NOW FETCHED FROM THE BACKEND
// export const BADGE_ZONE_LAYOUT = []; 
// export const ACCREDITATION_ID_TO_CODE = {};


// --- CORE FUNCTIONS ---

/**
 * DEPRECATED: This function is now handled by the backend.
 * The frontend will fetch the complete payload from `/api/members/:id/badge-payload`.
 */
export const generateBadgePayload = (member) => {
    console.error("generateBadgePayload is deprecated and should not be called. Fetch payload from the backend.");
    return {};
};


/**
 * Validates if a single member can be printed and returns reasons if not.
 * @param {object} member - The member object.
 * @param {object} [printLimit] - Optional print limit state { limit, printed }.
 * @returns {{isValid: boolean, reasons: string[]}}
 */
export const getPrintValidationStatus = (member, printLimit = null) => {
    let reasons = [];

    // Check for "Монтаж" accreditation
    if (member.accreditation?.name?.toLowerCase().includes("монтаж")) {
        reasons.push('Аккредитация "Монтаж"');
    }

    if (member.blocked) {
        reasons.push("Пользователь заблокирован");
    }

    // Check for missing photo
    const isAccredPhotoReq = member.accreditation?.require_photo;
    const isAccredGatePhotoReq = member.accreditation?.gates?.some(g => g.require_photo);
    const isMemberAdditionalGatePhotoReq = member.gates?.some(g => g.require_photo);
    const photoIsRequired = isAccredPhotoReq || isAccredGatePhotoReq || isMemberAdditionalGatePhotoReq;

    if (photoIsRequired && !member.photo_filename) {
        reasons.push('Требуется фото');
    }

    // Check company print limits if provided
    if (printLimit && printLimit.limit > 0 && printLimit.printed >= printLimit.limit) {
        reasons.push(`Достигнут лимит компании (${printLimit.printed}/${printLimit.limit})`);
    }

    return {
        isValid: reasons.length === 0,
        reasons: reasons,
    };
};


/**
 * Filters a list of members into valid and invalid groups for printing.
 * @param {Array<object>} membersToValidate - An array of member objects.
 * @returns {{validMembers: Array<object>, invalidMembers: Array<{member: object, reason: string}>}}
 */
export const validateAndSplitMembers = (membersToValidate) => {
    const validMembers = [];
    const invalidMembers = [];

    membersToValidate.forEach(member => {
        // We don't check company limits for mass printing, as that's a per-company rule.
        const { isValid, reasons } = getPrintValidationStatus(member);

        if (!isValid) {
            invalidMembers.push({ member, reason: reasons.join(', ') });
        } else {
            validMembers.push(member);
        }
    });

    return { validMembers, invalidMembers };
};