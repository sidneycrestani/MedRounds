import CaseStudyClient from "@/modules/cases/components/CaseStudyClient";
import { useEffect, useMemo, useState } from "react";

type RootTag = { id: number; slug: string; name: string };
type QueueItem = { caseId: number; activeQuestionIndices: number[] };
type PublicCaseQuestion = {
	id: number;
	text: string;
	media?: string;
	order: number;
};
type PublicCaseData = {
	id: number;
	title: string;
	vignette: string;
	media?: string;
	questions: PublicCaseQuestion[];
	prevId: number | null;
	nextId: number | null;
	searchParams: string;
};

type Mode = "setup" | "running" | "summary";

export default function SessionManager({
	rootTags,
}: {
	rootTags: RootTag[];
}) {
	const [mode, setMode] = useState<Mode>("setup");
	const [queue, setQueue] = useState<QueueItem[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [currentCaseData, setCurrentCaseData] = useState<PublicCaseData | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [selected, setSelected] = useState<Record<string, boolean>>({});

	const selectedTags = useMemo(
		() => Object.keys(selected).filter((k) => selected[k]),
		[selected],
	);

	async function startSession() {
		setIsLoading(true);
		try {
			const res = await fetch("/api/study/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tags: selectedTags }),
			});
			if (!res.ok) throw new Error("failed");
			const data: QueueItem[] = await res.json();
			setQueue(data);
			setCurrentIndex(0);
			setMode("running");
		} catch {
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (mode !== "running") return;
		const item = queue[currentIndex];
		if (!item) {
			setMode("summary");
			return;
		}
		setIsLoading(true);
		setCurrentCaseData(null);
		fetch(`/api/cases/${item.caseId}`)
			.then((r) => r.json())
			.then((d: PublicCaseData) => setCurrentCaseData(d))
			.finally(() => setIsLoading(false));
	}, [mode, currentIndex, queue]);

	function onCaseCompleted() {
		setCurrentIndex((prev) => prev + 1);
		setCurrentCaseData(null);
	}

	if (mode === "setup") {
		return (
			<div className="max-w-3xl mx-auto p-6 space-y-6">
				<h1 className="text-2xl font-bold">Sessão de Estudo</h1>
				<div className="space-y-2">
					{rootTags.map((t) => (
						<label key={t.slug} className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={!!selected[t.slug]}
								onChange={(e) =>
									setSelected((prev) => ({
										...prev,
										[t.slug]: e.target.checked,
									}))
								}
							/>
							<span>{t.name}</span>
						</label>
					))}
				</div>
				<button
					type="button"
					onClick={startSession}
					disabled={isLoading}
					className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-300"
				>
					Iniciar Sessão
				</button>
			</div>
		);
	}

	if (mode === "summary") {
		return (
			<div className="max-w-3xl mx-auto p-6 space-y-6">
				<h1 className="text-2xl font-bold">Sessão concluída</h1>
				<p className="text-gray-600">Parabéns! Você concluiu esta sessão.</p>
				<button
					type="button"
					onClick={() => {
						setMode("setup");
						setQueue([]);
						setCurrentIndex(0);
						setCurrentCaseData(null);
						setSelected({});
					}}
					className="px-4 py-2 rounded bg-blue-600 text-white"
				>
					Nova Sessão
				</button>
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto p-6">
			{isLoading && <p className="text-gray-600">Carregando...</p>}
			{currentCaseData && (
				<CaseStudyClient
					data={currentCaseData}
					env={{
						supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL,
						supabaseAnonKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
					}}
					activeQuestionIndices={
						queue[currentIndex]?.activeQuestionIndices ?? []
					}
					userProgress={null}
					onCaseCompleted={onCaseCompleted}
				/>
			)}
		</div>
	);
}
