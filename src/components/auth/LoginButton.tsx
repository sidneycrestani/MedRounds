import Button from "@/components/ui/button";
import { createBrowserClient } from "@supabase/ssr";
import { LogOut } from "lucide-react";
import { useMemo, useState } from "react";

type EnvConfig = { supabaseUrl: string; supabaseAnonKey: string };

export default function LoginButton({
	env,
	userName,
}: { env: EnvConfig; userName?: string | null }) {
	const supabase = useMemo(
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
			},
		});
		setLoading(false);
	}

	async function handleLogout() {
		// Redirect to the API route to clear server cookies and sign out
		window.location.href = "/api/auth/signout";
	}

	if (userName) {
		return (
			<div className="flex items-center gap-3">
				<span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline-block">
					{userName}
				</span>
				<Button
					variant="ghost"
					size="sm"
					onClick={handleLogout}
					className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 sm:px-3"
					title="Sair"
				>
					<LogOut size={16} className="sm:mr-2" />
					<span className="hidden sm:inline">Sair</span>
				</Button>
			</div>
		);
	}

	return (
		<Button onClick={handleLogin} loading={loading} variant="secondary">
			Entrar com Google
		</Button>
	);
}
