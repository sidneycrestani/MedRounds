import { Skeleton } from "@/components/ui/skeleton";
import CaseStudyClient from "@/modules/cases/components/CaseStudyClient";
import type { PublicCaseDataDTO, QueueItemDTO } from "@/modules/cases/types";
import { useEffect, useState } from "react";

type SessionMode = "loading" | "running" | "summary" | "error";

type SessionResponse =
	| {
			status: "active";
			sessionId: string;
			queue: QueueItemDTO[];
			progress: { current: number; total: number };
	  }
	| {
			status: "idle";
	  };

export default function SessionManager() {
	const [mode, setMode] = useState<SessionMode>("loading");

	// Estado da Sessão Ativa
	const [queue, setQueue] = useState<QueueItemDTO[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [currentCaseData, setCurrentCaseData] =
		useState<PublicCaseDataDTO | null>(null);

	// Estado para armazenar os índices que REALMENTE faltam fazer neste caso
	const [computedActiveIndices, setComputedActiveIndices] = useState<number[]>(
		[],
	);

	// Loading state para transições
	const [isProcessing, setIsProcessing] = useState(false);

	// 1. Inicialização: Verificar sessão existente
	useEffect(() => {
		async function checkSession() {
			try {
				const res = await fetch("/api/study/session");
				if (!res.ok) throw new Error("Failed to check session");
				const data: SessionResponse = await res.json();

				if (data.status === "active") {
					setQueue(data.queue);
					setCurrentIndex(data.progress.current);
					setMode("running");
				} else {
					setMode("error"); // Não deveria montar este componente se não houver sessão
				}
			} catch (error) {
				console.error(error);
				setMode("error");
			}
		}
		checkSession();
	}, []);

	async function handleEndSession() {
		if (
			!confirm(
				"Tem certeza que deseja encerrar a sessão? O progresso não salvo será perdido.",
			)
		)
			return;

		setIsProcessing(true);
		try {
			await fetch("/api/study/session", { method: "DELETE" });
			window.location.reload(); // Recarrega para voltar ao Dashboard
		} catch (error) {
			console.error("Erro ao encerrar sessão remota", error);
			setIsProcessing(false);
		}
	}

	// 2. Carregar dados do caso atual quando estiver rodando
	useEffect(() => {
		if (mode !== "running") return;

		const item = queue[currentIndex];
		if (!item) {
			setMode("summary");
			return;
		}

		setIsProcessing(true);
		setCurrentCaseData(null);
		setComputedActiveIndices([]);

		Promise.all([
			fetch(`/api/cases/${item.caseId}`).then((r) => r.json()),
			fetch(`/api/cases/${item.caseId}/progress`).then((r) => r.json()),
		])
			.then(([caseData, progressData]) => {
				const originalIndices = item.activeQuestionIndices;
				const remainingIndices = originalIndices.filter((idx: number) => {
					const p = progressData[idx];
					if (!p) return true;
					return p.isDue;
				});

				if (remainingIndices.length === 0 && originalIndices.length > 0) {
					onCaseCompleted();
					return;
				}

				setComputedActiveIndices(remainingIndices);
				setCurrentCaseData(caseData);
			})
			.catch((e) => console.error(e))
			.finally(() => setIsProcessing(false));
	}, [mode, currentIndex, queue]);

	// 3. Handler de conclusão de caso
	async function onCaseCompleted() {
		setIsProcessing(true);

		try {
			const res = await fetch("/api/study/session", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "advance" }),
			});

			if (!res.ok) throw new Error("Falha ao salvar progresso");

			const data = await res.json();

			if (data.isCompleted) {
				setMode("summary");
				setQueue([]);
			} else {
				setCurrentIndex((prev) => prev + 1);
				setCurrentCaseData(null);
			}
		} catch (error) {
			console.error("Erro ao avançar questão:", error);
			alert("Erro de conexão ao salvar progresso. Tente novamente.");
		} finally {
			setIsProcessing(false);
		}
	}

	// --- RENDER ---

	if (mode === "loading") {
		return (
			<div className="max-w-4xl mx-auto p-6 space-y-6">
				<Skeleton className="h-12 w-1/3" />
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<Skeleton className="h-96 lg:col-span-2 rounded-xl" />
					<Skeleton className="h-64 rounded-xl" />
				</div>
			</div>
		);
	}

	if (mode === "error") {
		return (
			<div className="text-center py-20">
				<h2 className="text-xl font-bold mb-4">Nenhuma sessão ativa</h2>
				<a
					href="/"
					className="text-blue-600 hover:underline"
					onClick={() => window.location.reload()}
				>
					Voltar para o Dashboard
				</a>
			</div>
		);
	}

	if (mode === "summary") {
		return (
			<div className="max-w-xl mx-auto text-center py-20 animate-in zoom-in-95 duration-500">
				<h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
					Sessão Concluída! 🎉
				</h2>
				<p className="text-gray-600 dark:text-gray-400 mb-8">
					Você completou todas as questões planejadas para agora.
				</p>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
				>
					Voltar ao Início
				</button>
			</div>
		);
	}

	// Mode: Running
	return (
		<div className="max-w-3xl mx-auto py-6">
			{/* Header de Progresso */}
			<div className="mb-6 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
				<span>
					Questão {currentIndex + 1} de {queue.length}
				</span>
				<button
					type="button"
					onClick={handleEndSession}
					className="hover:text-red-600 flex items-center gap-1 transition-colors"
				>
					Encerrar Estudo
				</button>
			</div>

			{/* Barra de Progresso */}
			<div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mb-8 overflow-hidden">
				<div
					className="bg-brand-600 h-full transition-all duration-500 ease-out"
					style={{
						width: `${((currentIndex + 1) / queue.length) * 100}%`,
					}}
				/>
			</div>

			{isProcessing && !currentCaseData && (
				<div className="space-y-4">
					<Skeleton className="h-8 w-3/4" />
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			)}

			{currentCaseData && (
				<CaseStudyClient
					data={currentCaseData}
					env={{
						supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL,
						supabaseAnonKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
					}}
					activeQuestionIndices={computedActiveIndices}
					userProgress={null}
					onCaseCompleted={onCaseCompleted}
				/>
			)}
		</div>
	);
}
