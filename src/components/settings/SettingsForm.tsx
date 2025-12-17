import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserSettings } from "@/modules/preferences/schema";
import { Check, Key, Laptop, Moon, Sun, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const LOCAL_STORAGE_KEY_NAME = "medrounds_gemini_key";

export default function SettingsForm() {
	// Estado Local
	const [theme, setTheme] = useState<UserSettings["theme"]>("system");
	const [apiKey, setApiKey] = useState("");
	const [hasStoredKey, setHasStoredKey] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [saveState, setSaveState] = useState<"idle" | "success" | "error">(
		"idle",
	);

	// 1. Inicialização
	useEffect(() => {
		async function init() {
			try {
				// Carrega configurações do servidor
				const res = await fetch("/api/settings");
				if (res.ok) {
					const data: UserSettings = await res.json();
					setTheme(data.theme);
				}

				// Verifica LocalStorage
				const storedKey = localStorage.getItem(LOCAL_STORAGE_KEY_NAME);
				if (storedKey) {
					setHasStoredKey(true);
					// Não preenchemos o input por segurança visual, apenas indicamos que existe
				}
			} catch (e) {
				console.error("Failed to load settings", e);
			} finally {
				setIsLoading(false);
			}
		}
		init();
	}, []);

	// 2. Manipulação de Tema
	async function handleThemeChange(newTheme: UserSettings["theme"]) {
		setTheme(newTheme);

		// Aplicação Imediata (Feedback Visual)
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

		// Persistência LocalStorage (para o script anti-flash)
		if (newTheme === "system") {
			localStorage.removeItem("theme");
		} else {
			localStorage.setItem("theme", newTheme);
		}

		// Persistência Backend (Background)
		try {
			await fetch("/api/settings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					theme: newTheme,
					use_custom_key: hasStoredKey, // Mantém o estado da chave
				}),
			});
		} catch (e) {
			console.error("Failed to sync theme", e);
		}
	}

	// 3. Manipulação da API Key
	async function handleSaveKey() {
		if (!apiKey.trim()) return;

		setSaveState("idle");
		try {
			// Salva no Browser (BYOK)
			localStorage.setItem(LOCAL_STORAGE_KEY_NAME, apiKey.trim());
			setHasStoredKey(true);
			setApiKey(""); // Limpa o input

			// Avisa o servidor que estamos usando chave customizada
			await fetch("/api/settings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					theme, // Mantém tema atual
					use_custom_key: true,
				}),
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

		// Avisa o servidor
		await fetch("/api/settings", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				theme,
				use_custom_key: false,
			}),
		});
	}

	if (isLoading) {
		return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;
	}

	return (
		<div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-500">
			{/* Seção de Tema */}
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
									? "border-blue-600 bg-blue-50 text-blue-700"
									: "border-gray-200 hover:border-gray-300"
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
									? "border-blue-600 bg-gray-800 text-white"
									: "border-gray-200 hover:border-gray-300"
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
									? "border-blue-600 bg-gray-100 text-gray-900"
									: "border-gray-200 hover:border-gray-300"
							}`}
						>
							<Laptop size={24} />
							<span className="font-medium">Sistema</span>
						</button>
					</div>
				</CardContent>
			</Card>

			{/* Seção da API Key */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Key className="w-5 h-5 text-blue-600" />
						Configuração de IA (BYOK)
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-gray-600 dark:text-gray-300">
						Para usar a correção automática ilimitada, você pode fornecer sua
						própria chave da API Google Gemini. A chave é salva{" "}
						<strong>apenas no seu navegador</strong> e nunca é armazenada em
						nossos servidores.
					</p>

					{hasStoredKey ? (
						<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="bg-green-100 p-2 rounded-full">
									<Check className="w-5 h-5 text-green-700" />
								</div>
								<div>
									<p className="font-medium text-green-900">
										Chave salva com segurança
									</p>
									<p className="text-xs text-green-700">
										Armazenada no LocalStorage
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								onClick={handleRemoveKey}
								className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
									className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-white"
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
