import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import type { APIRoute } from "astro";
import { sql } from "drizzle-orm";

export const GET: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	try {
		// A query busca itens na tabela de estado que estão "pendentes" (sem data definida e não dominados).
		// O LATERAL JOIN busca a entrada mais recente do histórico para pegar o feedback e notas da última tentativa.
		const query = sql`
			SELECT 
				s.case_id,
				s.question_index,
				c.title AS case_title,
				c.vignette,
				q.question_text,
				q.correct_answer_text,
				h.ai_feedback,
				h.user_notes,
				h.score AS last_score,
				h.attempted_at
			FROM app.user_case_state s
			JOIN content.clinical_cases c ON c.id = s.case_id
			JOIN content.case_questions q ON q.case_id = s.case_id AND q.order_index = s.question_index
			LEFT JOIN LATERAL (
				SELECT ai_feedback, user_notes, score, attempted_at
				FROM app.user_case_history h_inner
				WHERE h_inner.user_id = s.user_id
				  AND h_inner.case_id = s.case_id
				  AND h_inner.question_index = s.question_index
				ORDER BY h_inner.attempted_at DESC
				LIMIT 1
			) h ON TRUE
			WHERE s.user_id = ${user.id}
			  AND s.next_review_at IS NULL
			  AND s.is_mastered IS FALSE
			ORDER BY h.attempted_at DESC;
		`;

		const result = await db.execute(query);

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Review List Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
