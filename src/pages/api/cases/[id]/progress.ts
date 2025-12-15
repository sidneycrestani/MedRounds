import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import { getUserCaseProgress } from "@/modules/cases/cases.repository";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
	const user = context.locals.user;
	// Se não estiver logado, retorna objeto vazio (sem progresso)
	if (!user) return new Response(JSON.stringify({}), { status: 200 });

	const idParam = context.params.id;
	if (!idParam) return new Response(null, { status: 400 });
	const id = Number(idParam);
	if (!Number.isInteger(id)) return new Response(null, { status: 400 });

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	try {
		const progress = await getUserCaseProgress(db, user.id, id);
		return new Response(JSON.stringify(progress), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error fetching case progress:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
