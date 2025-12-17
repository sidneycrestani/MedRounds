import type { Database } from "@/core/db";
import { calculateReviewState } from "@/core/srs/scheduler";
import type { CaseFeedbackDTO } from "@/modules/cases/types"; // Import the specific type
import { userCaseHistory, userCaseState } from "@/modules/srs/schema";

export async function processUserAttempt(
	db: Database,
	userId: string,
	caseId: number,
	questionIndex: number,
	score: number,
	aiFeedback?: CaseFeedbackDTO | Record<string, unknown> | null, // Strict type
) {
	// 1. Calculate new state using pure domain logic
	const reviewState = calculateReviewState(score);

	// 2. Persist to database within a transaction
	await db.transaction(async (tx) => {
		// A. Log history
		await tx.insert(userCaseHistory).values({
			userId,
			caseId,
			questionIndex,
			score,
			// Drizzle's jsonb column expects 'unknown', so we pass the typed object directly.
			// No 'as any' needed because objects are assignable to unknown.
			aiFeedback,
			attemptedAt: new Date(),
		});

		// B. Update state
		await tx
			.insert(userCaseState)
			.values({
				userId,
				caseId,
				questionIndex,
				nextReviewAt: reviewState.nextReviewDate,
				lastScore: score,
				isMastered: reviewState.isMastered,
				learningStatus: reviewState.learningStatus,
				// Legacy/Default fields required by schema but unused in current logic
				easeFactor: 2.5,
				consecutiveCorrect: 0,
			})
			.onConflictDoUpdate({
				target: [
					userCaseState.userId,
					userCaseState.caseId,
					userCaseState.questionIndex,
				],
				set: {
					nextReviewAt: reviewState.nextReviewDate,
					lastScore: score,
					isMastered: reviewState.isMastered,
					learningStatus: reviewState.learningStatus,
				},
			});
	});

	return reviewState;
}
