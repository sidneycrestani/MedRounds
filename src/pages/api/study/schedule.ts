import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import { userCaseState } from "@/modules/srs/schema";
import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";

export const POST: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}

	let body: {
		caseId: number;
		questionIndex: number;
		action: "short_term" | "long_term" | "dismiss";
	};

	try {
		body = await context.request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
		});
	}

	const { caseId, questionIndex, action } = body;

	if (!caseId || typeof questionIndex !== "number" || !action) {
		return new Response(JSON.stringify({ error: "Missing fields" }), {
			status: 400,
		});
	}

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	// Definição das datas
	const now = new Date();
	let nextReview: Date | null = null;
	let isMastered = false;

	switch (action) {
		case "short_term":
			// Daqui a 30 dias
			nextReview = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
			isMastered = false;
			break;
		case "long_term":
			// Daqui a 6 meses (aprox 180 dias)
			nextReview = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
			isMastered = false;
			break;
		case "dismiss":
			// Marcar como dominado (sai da fila de revisão)
			nextReview = null;
			isMastered = true;
			break;
		default:
			return new Response(JSON.stringify({ error: "Invalid action" }), {
				status: 400,
			});
	}

	try {
		await db
			.update(userCaseState)
			.set({
				nextReviewAt: nextReview,
				isMastered: isMastered,
				// Opcional: Atualizar status de aprendizado visualmente se desejar
				learningStatus: isMastered ? "mastered" : "learning",
			})
			.where(
				and(
					eq(userCaseState.userId, user.id),
					eq(userCaseState.caseId, caseId),
					eq(userCaseState.questionIndex, questionIndex),
				),
			);

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error) {
		console.error("Schedule Update Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
