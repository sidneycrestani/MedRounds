import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import { getCaseById } from "@/modules/cases/cases.repository";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	const idParam = context.params.id;
	if (!idParam) {
		return new Response(JSON.stringify({ error: "Missing id" }), {
			status: 400,
		});
	}
	const id = Number(idParam);
	if (!Number.isInteger(id)) {
		return new Response(JSON.stringify({ error: "Invalid id" }), {
			status: 400,
		});
	}

	const data = await getCaseById(db, id);
	if (!data) {
		return new Response(JSON.stringify({ error: "Not found" }), {
			status: 404,
		});
	}
	return new Response(JSON.stringify(data), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
