// src/pages/api/settings.ts
import { getDb } from "@/core/db";
import { getConnectionFromEnv, getServerEnv } from "@/core/env";
import { encryptKey } from "@/core/security";
import {
	type UserSettings,
	userPreferences,
} from "@/modules/preferences/schema";
import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";

export const GET: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) return new Response(null, { status: 401 });

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	try {
		const prefs = await db
			.select({
				settings: userPreferences.settings,
				hasKey: userPreferences.encryptedGeminiKey,
			})
			.from(userPreferences)
			.where(eq(userPreferences.userId, user.id))
			.limit(1);

		const settings = prefs[0]?.settings || {
			theme: "system",
			use_custom_key: false,
		};

		// Retornamos apenas se a chave existe, nunca o valor
		return new Response(
			JSON.stringify({
				...settings,
				has_custom_key: !!prefs[0]?.hasKey,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("GET Settings Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};

export const POST: APIRoute = async (context) => {
	const user = context.locals.user;
	if (!user) return new Response(null, { status: 401 });

	const runtime = context.locals.runtime;
	const env = getServerEnv(runtime);
	const db = getDb(getConnectionFromEnv(env));

	let body: Partial<UserSettings & { apiKey?: string; removeKey?: boolean }>;
	try {
		body = await context.request.json();
	} catch {
		return new Response("Invalid JSON", { status: 400 });
	}

	const rawTheme = body.theme as string;
	const validTheme = ["light", "dark", "system"].includes(rawTheme)
		? (rawTheme as UserSettings["theme"])
		: "system";

	const settingsToSave: UserSettings = {
		theme: validTheme,
		use_custom_key: Boolean(body.use_custom_key),
	};

	try {
		let encryptedKey: string | null | undefined = undefined;

		// Lógica de BYOK
		if (body.removeKey) {
			encryptedKey = null;
			settingsToSave.use_custom_key = false;
		} else if (body.apiKey && body.apiKey.trim().length > 10) {
			if (!env.ENCRYPTION_KEY) {
				throw new Error("Server encryption key not configured");
			}
			encryptedKey = encryptKey(
				body.apiKey.trim(),
				user.id,
				env.ENCRYPTION_KEY,
			);
			settingsToSave.use_custom_key = true;
		}

		await db
			.insert(userPreferences)
			.values({
				userId: user.id,
				settings: settingsToSave,
				encryptedGeminiKey: encryptedKey ?? null,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: userPreferences.userId,
				set: {
					settings: settingsToSave,
					...(encryptedKey !== undefined
						? { encryptedGeminiKey: encryptedKey }
						: {}),
					updatedAt: new Date(),
				},
			});

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error) {
		console.error("POST Settings Error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
