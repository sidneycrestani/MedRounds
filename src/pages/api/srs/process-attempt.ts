import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import type { CaseFeedbackDTO } from "@/modules/cases/types";
import { processUserAttempt } from "@/modules/srs/services";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (context) => {
	// 1. Authentication Check
	const user = context.locals.user;
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}

	// 2. Input Validation
	// Define the expected body shape
	type RequestBody = {
		caseId: number;
		score: number;
		questionIndex: number;
		isCorrect?: boolean; // Propriedade direta (autoavaliação simplificada)
		feedback?: CaseFeedbackDTO; // Objeto de feedback (IA ou Mock)
	};

	let body: RequestBody;
	try {
		body = await context.request.json();
	} catch (e) {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
		});
	}

	const { caseId, score, questionIndex, feedback } = body;

	// Extração da Lógica Booleana (isCorrect)
	// Prioridade 1: Propriedade direta no body
	// Prioridade 2: Propriedade dentro do objeto feedback
	// Fallback: Baseado no score (legacy support/safety)
	let isCorrect = body.isCorrect;
	if (
		isCorrect === undefined &&
		feedback &&
		typeof feedback.isCorrect === "boolean"
	) {
		isCorrect = feedback.isCorrect;
	}

	// Fallback de segurança se ainda for undefined
	if (isCorrect === undefined) {
		isCorrect = score >= 100;
	}

	if (
		typeof caseId !== "number" ||
		typeof score !== "number" ||
		typeof questionIndex !== "number"
	) {
		return new Response(JSON.stringify({ error: "Invalid input types" }), {
			status: 400,
		});
	}

	try {
		// 3. Dependency Injection
		const runtime = context.locals.runtime;
		const env = getServerEnv(runtime);
		const db = getDb(getConnectionFromEnv(env));

		// 4. Delegate to Service Layer
		const result = await processUserAttempt(
			db,
			user.id,
			caseId,
			questionIndex,
			score,
			isCorrect, // Passando o booleano obrigatório
			feedback,
		);

		return new Response(
			JSON.stringify({
				success: true,
				nextReview: result.nextReviewDate,
				status: result.learningStatus,
			}),
			{ status: 200 },
		);
	} catch (error) {
		console.error("SRS Processing Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
