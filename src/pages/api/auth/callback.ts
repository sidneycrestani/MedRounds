import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
	const url = new URL(context.request.url);
	const code = url.searchParams.get("code");

	if (!code) {
		return context.redirect("/auth/error?message=Nenhum código fornecido");
	}

	const supabase = createServerClient(
		import.meta.env.PUBLIC_SUPABASE_URL,
		import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll() {
					const cookies = parseCookieHeader(
						context.request.headers.get("Cookie") ?? "",
					);
					// ADICIONE ESTE .map PARA CORRIGIR O TIPO
					return cookies.map((cookie) => ({
						name: cookie.name,
						value: cookie.value ?? "", // Garante string, evitando 'undefined'
					}));
				},
				setAll(cookiesToSet) {
					for (const { name, value, options } of cookiesToSet) {
						context.cookies.set(name, value, options);
					}
				},
			},
		},
	);

	const { error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		console.error("Erro no callback:", error);
		return context.redirect(
			`/auth/error?message=${encodeURIComponent(error.message)}`,
		);
	}

	return context.redirect("/");
};
