import { createServerClient } from "@supabase/ssr";
import type { APIRoute, AstroCookieSetOptions } from "astro";

export const GET: APIRoute = async (context) => {
	const url = new URL(context.request.url);
	const code = url.searchParams.get("code");
	if (!code) return context.redirect("/auth/error");

	const supabase = createServerClient(
		import.meta.env.PUBLIC_SUPABASE_URL,
		import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				get: (name: string) => context.cookies.get(name)?.value,
				set: (name: string, value: string, options: AstroCookieSetOptions) => {
					context.cookies.set(name, value, options);
				},
				remove: (name: string, options?: AstroCookieSetOptions) => {
					context.cookies.delete(name, options);
				},
			},
		},
	);

	const { error } = await supabase.auth.exchangeCodeForSession(code);
	if (error) return context.redirect("/auth/error");

	return context.redirect("/");
};
