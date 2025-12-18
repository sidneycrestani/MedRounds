import ReviewCard, { type ReviewItem } from "@/components/study/ReviewCard";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCheck, Inbox } from "lucide-react";
import { useEffect, useState } from "react";

export default function ReviewFlow() {
	const [items, setItems] = useState<ReviewItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchReviewList() {
			try {
				const res = await fetch("/api/study/review-list");
				if (res.ok) {
					const data = await res.json();
					setItems(data);
				}
			} catch (error) {
				console.error("Failed to fetch review list", error);
			} finally {
				setLoading(false);
			}
		}
		fetchReviewList();
	}, []);

	async function handleAction(
		action: "short_term" | "long_term" | "dismiss",
		caseId: number,
		qIndex: number,
	) {
		// 1. Chama API
		try {
			await fetch("/api/study/schedule", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ caseId, questionIndex: qIndex, action }),
			});

			// 2. Remove da lista localmente
			setItems((prev) =>
				prev.filter(
					(i) => !(i.case_id === caseId && i.question_index === qIndex),
				),
			);
		} catch (error) {
			alert("Erro ao salvar agendamento. Tente novamente.");
		}
	}

	if (loading) {
		return (
			<div className="max-w-3xl mx-auto space-y-6">
				<Skeleton className="h-64 rounded-xl" />
				<Skeleton className="h-64 rounded-xl" />
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-500">
				<div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full mb-6">
					<CheckCheck className="w-12 h-12 text-green-600 dark:text-green-400" />
				</div>
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
					Tudo limpo!
				</h2>
				<p className="text-gray-500 dark:text-gray-400 max-w-md">
					Você processou todas as suas pendências de revisão. Aproveite para
					descansar ou iniciar uma nova sessão de estudos.
				</p>
				<a
					href="/"
					className="mt-8 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-black hover:bg-gray-800 transition-colors"
				>
					Voltar ao Início
				</a>
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto">
			<div className="mb-8 flex items-center gap-3">
				<div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
					<Inbox className="w-6 h-6 text-blue-700 dark:text-blue-300" />
				</div>
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						Triagem de Erros
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{items.length} {items.length === 1 ? "item" : "itens"} aguardando
						sua revisão.
					</p>
				</div>
			</div>

			<div className="space-y-6">
				{items.map((item) => (
					// Usamos uma key composta para garantir unicidade
					<ReviewCard
						key={`${item.case_id}-${item.question_index}`}
						item={item}
						onAction={handleAction}
					/>
				))}
			</div>
		</div>
	);
}
