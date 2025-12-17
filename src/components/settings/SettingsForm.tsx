import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton"; // Importei o componente
import type { UserSettings } from "@/modules/preferences/schema";
import { Check, Key, Laptop, Moon, Sun, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const LOCAL_STORAGE_KEY_NAME = "medrounds_gemini_key";

export default function SettingsForm() {
	const [theme, setTheme] = useState<UserSettings["theme"]>("system");
	const [apiKey, setApiKey] = useState("");
	const [hasStoredKey, setHasStoredKey] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [saveState, setSaveState] = useState<"idle" | "success" | "error">(
		"idle",
	);

	useEffect(() => {
		async function init() {
			try {
				const res = await fetch("/api/settings");
				if (res.ok) {
					const data: UserSettings = await res.json();
					setTheme(data.theme);
				}
				const storedKey = localStorage.getItem(LOCAL_STORAGE_KEY_NAME);
				if (storedKey) {
					setHasStoredKey(true);
				}
			} catch (e) {
				console.error("Failed to load settings", e);
			} finally {
				setIsLoading(false);
			}
		}
		init();
	}, []);

	async function handleThemeChange(newTheme: UserSettings["theme"]) {
		setTheme(newTheme);
		const root = document.documentElement;
		if (
			newTheme === "dark" ||
			(newTheme === "system" &&
				window.matchMedia("(prefers-color-scheme: dark)").matches)
		) {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}

		if (newTheme === "system") {
			localStorage.removeItem("theme");
		} else {
			localStorage.setItem("theme", newTheme);
		}

		try {
			await fetch("/api/settings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					theme: newTheme,
					use_custom_key: hasStoredKey,
				}),
			});
		} catch (e) {
			console.error("Failed to sync theme", e);
		}
	}

	async function handleSaveKey() {
		if (!apiKey.trim()) return;
		setSaveState("idle");
		try {
			localStorage.setItem(LOCAL_STORAGE_KEY_NAME, apiKey.trim());
			setHasStoredKey(true);
			setApiKey("");
			await fetch("/api/settings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ theme, use_custom_key: true }),
			});
			setSaveState("success");
			setTimeout(() => setSaveState("idle"), 2000);
		} catch (e) {
			setSaveState("error");
		}
	}

	async function handleRemoveKey() {
		if (!confirm("Tem certeza? A chave será removida deste dispositivo."))
			return;
		localStorage.removeItem(LOCAL_STORAGE_KEY_NAME);
		setHasStoredKey(false);
		setApiKey("");
		await fetch("/api/settings", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ theme, use_custom_key: false }),
		});
	}

	if (isLoading) {
		// CORREÇÃO: Usando o componente Skeleton que agora suporta dark mode
		// ou aplicando as classes manualmente se preferir manter a div
		return <Skeleton className="h-64 rounded-xl" />;
	}

	return (
		<div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-500">
			<Card>
				<CardHeader>
					<CardTitle>Aparência</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4">
						<button
							type="button"
							onClick={() => handleThemeChange("light")}
							className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
								theme === "light"
									? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-500"
									: "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 dark:text-gray-300"
							}`}
						>
							<Sun size={24} />
							<span className="font-medium">Claro</span>
						</button>

						<button
							type="button"
							onClick={() => handleThemeChange("dark")}
							className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
								theme === "dark"
									? "border-blue-600 bg-gray-800 text-white dark:border-blue-500"
									: "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 dark:text-gray-300"
							}`}
						>
							<Moon size={24} />
							<span className="font-medium">Escuro</span>
						</button>

						<button
							type="button"
							onClick={() => handleThemeChange("system")}
							className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
								theme === "system"
									? "border-blue-600 bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white dark:border-blue-500"
									: "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 dark:text-gray-300"
							}`}
						>
							<Laptop size={24} />
							<span className="font-medium">Sistema</span>
						</button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
						Configuração de IA (BYOK)
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Para usar a correção automática ilimitada, você pode fornecer sua
						própria chave da API Google Gemini. A chave é salva{" "}
						<strong>apenas no seu navegador</strong> e nunca é armazenada em
						nossos servidores.
					</p>

					{hasStoredKey ? (
						<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="bg-green-100 dark:bg-green-800 p-2 rounded-full">
									<Check className="w-5 h-5 text-green-700 dark:text-green-100" />
								</div>
								<div>
									<p className="font-medium text-green-900 dark:text-green-100">
										Chave salva com segurança
									</p>
									<p className="text-xs text-green-700 dark:text-green-300">
										Armazenada no LocalStorage
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								onClick={handleRemoveKey}
								className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
							>
								<Trash2 size={18} />
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							<div className="relative">
								<input
									type="password"
									value={apiKey}
									onChange={(e) => setApiKey(e.target.value)}
									placeholder="Cole sua chave API do Gemini aqui (AIza...)"
									className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
								/>
							</div>
							<div className="flex justify-end">
								<Button
									onClick={handleSaveKey}
									disabled={apiKey.length < 10}
									state={saveState}
								>
									Salvar Chave no Dispositivo
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
