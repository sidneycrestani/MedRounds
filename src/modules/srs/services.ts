import type { Database } from "@/core/db";
import type { CaseFeedbackDTO } from "@/modules/cases/types";
import { userCaseHistory, userCaseState } from "@/modules/srs/schema";

export async function processUserAttempt(
	db: Database,
	userId: string,
	caseId: number,
	questionIndex: number,
	score: number,
	isCorrect: boolean,
	aiFeedback?: CaseFeedbackDTO | Record<string, unknown> | null,
) {
	// 1. LÓGICA DE TRIAGEM (SRS BOOLEANO)
	// Se acertou (true) -> Masterizado (sai da fila).
	// Se errou (false) -> Learning (cai na fila de triagem/revisão).
	// Em ambos os casos, nextReviewDate é NULL.
	// - Se masterizado + NULL: Não aparece na lista de "Revisar" nem na "Estudar".
	// - Se !masterizado + NULL: Aparece na lista de "Revisar" (Inbox).

	const reviewState = {
		isMastered: isCorrect,
		nextReviewDate: null,
		learningStatus: isCorrect ? "mastered" : "learning",
	};

	// 2. Persist to database within a transaction
	await db.transaction(async (tx) => {
		// A. Log history
		await tx.insert(userCaseHistory).values({
			userId,
			caseId,
			questionIndex,
			score,
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
				nextReviewAt: reviewState.nextReviewDate, // Sempre NULL
				lastScore: score,
				isMastered: reviewState.isMastered,
				learningStatus: reviewState.learningStatus,
				easeFactor: 2.5,
				consecutiveCorrect: isCorrect ? 1 : 0,
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
					// Opcional: incrementar consecutiveCorrect se necessário no futuro
				},
			});
	});

	return reviewState;
}
