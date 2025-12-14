import { createServerClient } from "@supabase/ssr";
import type { AstroCookieSetOptions, MiddlewareHandler } from "astro";

function isPublicAsset(pathname: string) {
	if (
		pathname.startsWith("/assets") ||
		pathname.startsWith("/public") ||
		pathname.startsWith("/_image") ||
		pathname.startsWith("/favicon")
	)
		return true;
	return /\.(css|js|json|png|jpg|jpeg|svg|ico|woff2?|ttf|map)$/.test(pathname);
}

export const onRequest: MiddlewareHandler = async (context, next) => {
	const { url } = context;
	if (isPublicAsset(url.pathname)) return next();

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

	const { data, error } = await supabase.auth.getUser();
	if (!error) context.locals.user = data.user ?? null;

	return next();
};
