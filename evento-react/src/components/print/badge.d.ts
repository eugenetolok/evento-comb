type PrintValidationResult = {
	isValid: boolean;
	reasons: string[];
};

type PrintSplitResult = {
	validMembers: any[];
	invalidMembers: Array<{ member: any; reason: string }>;
};

export function generateBadgePayload(member: any): Record<string, any>;
export function getPrintValidationStatus(member: any, printLimit?: any): PrintValidationResult;
export function validateAndSplitMembers(membersToValidate: any[]): PrintSplitResult;
