import type { Database } from "@/core/db";
// import { calculateReviewState } from "@/core/srs/scheduler"; // REMOVIDO: Lógica automática desativada para triagem
import type { CaseFeedbackDTO } from "@/modules/cases/types";
import { userCaseHistory, userCaseState } from "@/modules/srs/schema";

export async function processUserAttempt(
	db: Database,
	userId: string,
	caseId: number,
	questionIndex: number,
	score: number,
	aiFeedback?: CaseFeedbackDTO | Record<string, unknown> | null,
) {
	// 1. LÓGICA DE TRIAGEM (ALTERADO)
	// Em vez de calcular a próxima data baseada na nota, jogamos para o "Limbo/Triagem".
	// O aluno deve decidir depois o que fazer.
	const reviewState = {
		isMastered: false,
		nextReviewDate: null, // NULL indica estado de Triagem
		learningStatus: "learning",
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
				nextReviewAt: reviewState.nextReviewDate, // Salva como NULL
				lastScore: score,
				isMastered: reviewState.isMastered,
				learningStatus: reviewState.learningStatus,
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
					nextReviewAt: reviewState.nextReviewDate, // Atualiza para NULL
					lastScore: score,
					isMastered: reviewState.isMastered,
					learningStatus: reviewState.learningStatus,
				},
			});
	});

	return reviewState;
}
