import Button from "@/components/ui/button";
// MUDANÇA 1: Importe do SSR, não do supabase-js
import { createBrowserClient } from "@supabase/ssr";
import { useMemo, useState } from "react";

type EnvConfig = { supabaseUrl: string; supabaseAnonKey: string };

export default function LoginButton({
	env,
	userName,
}: { env: EnvConfig; userName?: string | null }) {
	const supabase = useMemo(
		// MUDANÇA 2: Use createBrowserClient.
		// Ele configura automaticamente os cookies para serem lidos pelo servidor.
		() => createBrowserClient(env.supabaseUrl, env.supabaseAnonKey),
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
				// O flowType PKCE é o padrão do createBrowserClient,
				// mas não custa reforçar se quiser:
				// flowType: 'pkce',
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
