import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import type { APIRoute } from "astro";
import { sql } from "drizzle-orm";

export const GET: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) return new Response(null, { status: 401 });

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	try {
		const query = sql`
			SELECT 
				c.id AS case_id,
				COUNT(DISTINCT q.id) AS question_count,
				ARRAY_AGG(DISTINCT ct.tag_id) AS tag_ids
			FROM content.clinical_cases c
			JOIN content.case_questions q ON q.case_id = c.id
			JOIN content.cases_tags ct ON ct.case_id = c.id
			LEFT JOIN app.user_case_state s 
				ON s.case_id = c.id 
				AND s.question_index = q.order_index
				AND s.user_id = ${user.id}
			WHERE 
				c.status = 'published'
				AND (
					-- CASO 1: Nunca visto (Sem registro na tabela user_case_state)
					s.user_id IS NULL
					
					OR 
					
					-- CASO 2: Vencido (Agendado para o passado)
					-- ALTERAÇÃO CRÍTICA: Excluímos explicitamente itens onde next_review_at IS NULL.
					-- NULL agora significa "Em Triagem", aguardando ação do usuário, 
					-- portanto não deve aparecer na fila automática de estudo.
					(
						s.is_mastered IS FALSE 
						AND s.next_review_at IS NOT NULL 
						AND s.next_review_at <= now()
					)
				)
			GROUP BY c.id
		`;

		const result = await db.execute(query);

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "private, max-age=10",
			},
		});
	} catch (error) {
		console.error("Availability Map Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
