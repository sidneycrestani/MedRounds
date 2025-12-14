import Button from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";
import { useMemo, useState } from "react";

type EnvConfig = { supabaseUrl: string; supabaseAnonKey: string };

export default function LoginButton({
	env,
	userName,
}: { env: EnvConfig; userName?: string | null }) {
	const supabase = useMemo(
		() =>
			createClient(env.supabaseUrl, env.supabaseAnonKey, {
				auth: {
					flowType: "pkce",
				},
			}),
		[env.supabaseUrl, env.supabaseAnonKey],
	);
	const [loading, setLoading] = useState(false);

	async function handleLogin() {
		setLoading(true);
		await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: new URL(
					"/api/auth/callback",
					window.location.origin,
				).toString(),
			},
		});
		setLoading(false);
	}

	if (userName) {
		return (
			<div className="flex items-center gap-2">
				<span className="text-sm text-gray-600">{userName}</span>
			</div>
		);
	}

	return (
		<Button onClick={handleLogin} loading={loading} variant="secondary">
			Entrar com Google
		</Button>
	);
}
