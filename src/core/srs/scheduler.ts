// Constants to avoid magic numbers and make future adjustments easier
export const SRS_RULES = {
	SHORT_INTERVAL_DAYS: 10,
	LONG_INTERVAL_DAYS: 45,
	MASTERY_THRESHOLD: 80,
	PASS_THRESHOLD: 50,
} as const;

export type ReviewState = {
	isMastered: boolean;
	nextReviewDate: Date | null;
	learningStatus: "mastered" | "learning";
};

/**
 * Pure function to calculate the next review state based on the score.
 * Rules:
 * - Score > 80: Mastered (no next review).
 * - Score 50-80: Review in 45 days.
 * - Score < 50: Review in 10 days.
 */
export function calculateReviewState(score: number): ReviewState {
	const now = new Date();
	let nextDate: Date | null = null;
	let isMastered = false;

	if (score > SRS_RULES.MASTERY_THRESHOLD) {
		isMastered = true;
		nextDate = null; // Removed from queue
	} else {
		isMastered = false;
		// Clone date to avoid mutating 'now' if reused
		nextDate = new Date(now);

		if (score >= SRS_RULES.PASS_THRESHOLD) {
			nextDate.setDate(now.getDate() + SRS_RULES.LONG_INTERVAL_DAYS);
		} else {
			nextDate.setDate(now.getDate() + SRS_RULES.SHORT_INTERVAL_DAYS);
		}
	}

	return {
		isMastered,
		nextReviewDate: nextDate,
		learningStatus: isMastered ? "mastered" : "learning",
	};
}
