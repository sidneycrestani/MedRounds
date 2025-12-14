import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import { userCaseHistory, userCaseState } from "@/modules/srs/schema";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (context) => {
	// 1. Verificação de Autenticação
	const user = context.locals.user;
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}

	// 2. Parse do Corpo da Requisição
	let body: { caseId: number; score: number };
	try {
		body = await context.request.json();
	} catch (e) {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
		});
	}

	const { caseId, score } = body;
	if (typeof caseId !== "number" || typeof score !== "number") {
		return new Response(JSON.stringify({ error: "Invalid input types" }), {
			status: 400,
		});
	}

	try {
		// 3. Conexão com o Banco
		const runtime = context.locals.runtime;
		const env = getServerEnv(runtime);
		const db = getDb(getConnectionFromEnv(env));

		// 4. Aplicação da Lógica Simplificada
		// < 50 -> errou, agenda para daqui 10 dias
		// entre 50 e 80 -> agenda para 45 dias
		// > 80 = questão concluída, não agendar mais (nextDate = null)

		const now = new Date();
		let nextDate: Date | null = null;
		let isMastered = false;

		if (score > 80) {
			isMastered = true;
			nextDate = null; // Concluído (retira da fila)
		} else if (score >= 50) {
			isMastered = false;
			nextDate = new Date(now);
			nextDate.setDate(now.getDate() + 45); // +45 dias
		} else {
			isMastered = false;
			nextDate = new Date(now);
			nextDate.setDate(now.getDate() + 10); // +10 dias
		}

		// 5. Transação no Banco de Dados
		await db.transaction(async (tx) => {
			// A. Registra o histórico da tentativa
			await tx.insert(userCaseHistory).values({
				userId: user.id,
				caseId,
				score,
				attemptedAt: now,
			});

			// B. Atualiza ou cria o estado atual do SRS
			await tx
				.insert(userCaseState)
				.values({
					userId: user.id,
					caseId,
					nextReviewAt: nextDate,
					lastScore: score,
					isMastered,
					learningStatus: isMastered ? "mastered" : "learning",
					// Valores default para colunas legadas ou não usadas nessa lógica simplificada
					easeFactor: 2.5,
					consecutiveCorrect: score > 50 ? 1 : 0,
				})
				.onConflictDoUpdate({
					target: [userCaseState.userId, userCaseState.caseId],
					set: {
						nextReviewAt: nextDate,
						lastScore: score,
						isMastered,
						learningStatus: isMastered ? "mastered" : "learning",
					},
				});
		});

		return new Response(
			JSON.stringify({ success: true, nextReview: nextDate }),
			{
				status: 200,
			},
		);
	} catch (error) {
		console.error("SRS Processing Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
