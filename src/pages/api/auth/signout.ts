import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
	const supabase = createServerClient(
		import.meta.env.PUBLIC_SUPABASE_URL,
		import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll() {
					const cookies = parseCookieHeader(
						context.request.headers.get("Cookie") ?? "",
					);
					return cookies.map((cookie) => ({
						name: cookie.name,
						value: cookie.value ?? "",
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

	await supabase.auth.signOut();
	return context.redirect("/");
};
