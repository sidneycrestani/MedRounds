import StudyDashboard from "@/components/study/StudyDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import CaseStudyClient from "@/modules/cases/components/CaseStudyClient";
import type { PublicCaseDataDTO, QueueItemDTO } from "@/modules/cases/types";
import type { TagTreeItem } from "@/modules/taxonomy/services";
import { useEffect, useState } from "react";

type SessionMode = "loading" | "dashboard" | "running" | "summary";

type SessionResponse =
	| {
			status: "active";
			sessionId: string;
			queue: QueueItemDTO[];
			progress: { current: number; total: number };
	  }
	| {
			status: "idle";
			lastPreferences: { tagIds: number[] };
	  };

export default function SessionManager({
	treeData,
}: {
	treeData: TagTreeItem[];
}) {
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

	// Estado do Dashboard (Pre-load)
	const [initialSelectedTags, setInitialSelectedTags] = useState<number[]>([]);

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
					setInitialSelectedTags(data.lastPreferences.tagIds);
					setMode("dashboard");
				}
			} catch (error) {
				console.error(error);
				setMode("dashboard"); // Fallback
			}
		}
		checkSession();
	}, []);

	// 2. Iniciar nova sessão (Disparado pelo Dashboard)
	async function handleStartSession(tagIds: number[], quantity: number) {
		setIsProcessing(true);
		setInitialSelectedTags(tagIds);
		try {
			const res = await fetch("/api/study/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tagIds, quantity }),
			});

			if (!res.ok) throw new Error("Failed to create session");

			// Recarrega estado
			const checkRes = await fetch("/api/study/session");
			const data: SessionResponse = await checkRes.json();

			if (data.status === "active") {
				setQueue(data.queue);
				setCurrentIndex(0);
				setMode("running");
			}
		} catch (error) {
			console.error(error);
			alert("Erro ao iniciar sessão.");
		} finally {
			setIsProcessing(false);
		}
	}

	async function handleEndSession() {
		if (
			!confirm(
				"Tem certeza que deseja encerrar a sessão? O progresso não salvo será perdido.",
			)
		)
			return;

		setIsProcessing(true);
		try {
			// Chama a API para limpar a sessão no banco
			await fetch("/api/study/session", { method: "DELETE" });
		} catch (error) {
			console.error("Erro ao encerrar sessão remota", error);
		} finally {
			setMode("dashboard");
			setQueue([]);
			setCurrentIndex(0);
			setCurrentCaseData(null);
			setIsProcessing(false);
		}
	}

	// 3. Carregar dados do caso atual quando estiver rodando
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

		// CORREÇÃO: Busca dados do caso E progresso atual em paralelo
		Promise.all([
			fetch(`/api/cases/${item.caseId}`).then((r) => r.json()),
			fetch(`/api/cases/${item.caseId}/progress`).then((r) => r.json()),
		])
			.then(([caseData, progressData]) => {
				const originalIndices = item.activeQuestionIndices;

				// Filtra índices: Mantém apenas se NÃO tem progresso ou se está vencido (isDue: true).
				// Se o usuário acabou de responder, isDue será false (agendado para futuro), então removemos da lista.
				const remainingIndices = originalIndices.filter((idx: number) => {
					const p = progressData[idx];
					if (!p) return true; // Nunca visto -> mantém
					return p.isDue; // Visto -> mantém só se estiver vencido
				});

				// Se não sobrou nenhuma questão (usuário já fez todas desse caso mas a sessão não avançou),
				// avançamos automaticamente.
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

	// 4. Handler de conclusão de caso
	function onCaseCompleted() {
		// TODO: Idealmente, informar API que avançou o index (PATCH /api/study/session/progress)
		// Para este MVP, controlamos localmente. A persistência total do progresso fica para o próximo passo.
		setCurrentIndex((prev) => prev + 1);
		setCurrentCaseData(null);
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

	if (mode === "dashboard") {
		return (
			<StudyDashboard
				treeData={treeData}
				initialSelectedIds={initialSelectedTags}
				onStartSession={handleStartSession}
				isLoading={isProcessing}
			/>
		);
	}

	if (mode === "summary") {
		return (
			<div className="max-w-xl mx-auto text-center py-20 animate-in zoom-in-95 duration-500">
				<h2 className="text-3xl font-bold text-gray-900 mb-4">
					Sessão Concluída! 🎉
				</h2>
				<p className="text-gray-600 mb-8">
					Você completou todas as questões planejadas para agora.
				</p>
				<button
					type="button"
					onClick={() => {
						setMode("dashboard");
						setQueue([]);
					}}
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
			<div className="mb-6 flex items-center justify-between text-sm text-gray-500">
				<span>
					Questão {currentIndex + 1} de {queue.length}
				</span>
				<button
					type="button"
					onClick={handleEndSession} // USAR A NOVA FUNÇÃO AQUI
					className="hover:text-red-600 flex items-center gap-1 transition-colors"
				>
					{/* Se quiser ícone: <XCircle size={16} /> */}
					Encerrar Estudo
				</button>
			</div>

			{/* Barra de Progresso */}
			<div className="w-full bg-gray-200 h-1.5 rounded-full mb-8 overflow-hidden">
				<div
					className="bg-blue-600 h-full transition-all duration-500 ease-out"
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
					// CORREÇÃO: Passamos os índices filtrados, não os originais da fila
					activeQuestionIndices={computedActiveIndices}
					// No modo sessão, focamos apenas na fila atual.
					// Passamos null no userProgress para que o Client não bloqueie questões baseadas em SRS antigo,
					// mas sim libere as que foram selecionadas para HOJE (activeQuestionIndices).
					userProgress={null}
					onCaseCompleted={onCaseCompleted}
				/>
			)}
		</div>
	);
}
