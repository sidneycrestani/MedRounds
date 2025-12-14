import TagTreeSelector from "@/components/study/TagTreeSelector";
import Button from "@/components/ui/button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TagTreeItem } from "@/modules/taxonomy/services";
import { BrainCircuit, CheckSquare, Loader2, Play, Square } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
	treeData: TagTreeItem[];
	initialSelectedIds: number[];
	onStartSession: (tagIds: number[], quantity: number) => void;
	isLoading: boolean;
};

// Helper recursivo para pegar todos os IDs
function getAllIdsRecursive(nodes: TagTreeItem[]): number[] {
	let ids: number[] = [];
	for (const node of nodes) {
		ids.push(node.value);
		if (node.children && node.children.length > 0) {
			ids = [...ids, ...getAllIdsRecursive(node.children)];
		}
	}
	return ids;
}

export default function StudyDashboard({
	treeData,
	initialSelectedIds,
	onStartSession,
	isLoading,
}: Props) {
	const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
	const [quantity, setQuantity] = useState(20);
	const [availableCount, setAvailableCount] = useState<number | null>(null);
	const [isCounting, setIsCounting] = useState(false);

	// Funções de Bulk Action
	const handleSelectAll = () => {
		const allIds = getAllIdsRecursive(treeData);
		setSelectedIds(allIds);
	};

	const handleClearAll = () => {
		setSelectedIds([]);
	};

	// ... (Mantenha o useEffect e updateStatsAndPreferences da resposta anterior aqui) ...
	// REPETINDO O useEffect PARA CONTEXTO (NÃO DUPLIQUE NO CÓDIGO FINAL)
	useEffect(() => {
		const timer = setTimeout(() => {
			updateStatsAndPreferences(selectedIds);
		}, 600);
		return () => clearTimeout(timer);
	}, [selectedIds]);

	async function updateStatsAndPreferences(ids: number[]) {
		if (ids.length === 0) {
			setAvailableCount(0);
			return;
		}
		setIsCounting(true);
		try {
			fetch("/api/study/session", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tagIds: ids }),
			});
			const res = await fetch("/api/study/stats", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tagIds: ids }),
			});
			if (res.ok) {
				const data = await res.json();
				setAvailableCount(data.count);
			}
		} catch (err) {
			console.error(err);
		} finally {
			setIsCounting(false);
		}
	}

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
			{/* ... Hero Section igual ... */}
			<section className="text-center space-y-2 py-4">
				<h1 className="text-3xl font-bold text-gray-900 tracking-tight">
					Vamos praticar hoje?
				</h1>
				<p className="text-gray-600 max-w-xl mx-auto">
					Selecione os tópicos que deseja revisar.
				</p>
			</section>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<section className="lg:col-span-2">
					<Card className="h-full flex flex-col">
						<CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
							<CardTitle className="text-base flex items-center gap-2">
								<BrainCircuit className="w-4 h-4 text-blue-600" />
								Áreas de Estudo
							</CardTitle>

							{/* Novos Botões de Ação em Massa */}
							<div className="flex items-center gap-2">
								{isCounting && (
									<Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
								)}
								<button
									type="button"
									onClick={handleSelectAll}
									className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
									title="Selecionar todos"
								>
									<CheckSquare size={14} /> Todos
								</button>
								<button
									type="button"
									onClick={handleClearAll}
									className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
									title="Limpar seleção"
								>
									<Square size={14} /> Limpar
								</button>
							</div>
						</CardHeader>

						{/* ... Restante do CardContent igual ... */}
						<CardContent className="flex-1 p-0 overflow-y-auto max-h-[500px] scrollbar-thin">
							<div className="p-4">
								<TagTreeSelector
									nodes={treeData}
									selectedIds={selectedIds}
									onSelectionChange={setSelectedIds}
								/>
							</div>
						</CardContent>
						<div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
							{selectedIds.length} tópicos selecionados
						</div>
					</Card>
				</section>

				{/* ... Right Column igual à resposta anterior ... */}
				<section className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Resumo da Sessão</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
								<span className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
									Questões Disponíveis
								</span>
								<div className="text-3xl font-bold text-blue-900 mt-1">
									{isCounting ? (
										<span className="text-2xl opacity-50">...</span>
									) : (
										(availableCount ?? "-")
									)}
								</div>
								<p className="text-xs text-blue-700/80 mt-1">
									baseado no seu SRS e seleção atual
								</p>
							</div>

							<div className="space-y-3">
								<span className="text-sm font-medium text-gray-700 block mb-1">
									Meta para agora
								</span>
								<div className="grid grid-cols-3 gap-2">
									{[10, 20, 30].map((q) => (
										<button
											key={q}
											type="button"
											onClick={() => setQuantity(q)}
											className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
												quantity === q
													? "bg-black text-white border-black shadow-sm"
													: "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
											}`}
										>
											{q}
										</button>
									))}
								</div>
							</div>

							<div className="pt-4 border-t border-gray-100">
								<Button
									className="w-full h-12 text-base shadow-lg shadow-blue-900/10"
									onClick={() => onStartSession(selectedIds, quantity)}
									loading={isLoading}
									disabled={
										selectedIds.length === 0 ||
										(availableCount === 0 && !isCounting)
									}
								>
									{!isLoading && <Play className="w-4 h-4 mr-2" />}
									Iniciar Sessão
								</Button>
								{availableCount === 0 &&
									!isCounting &&
									selectedIds.length > 0 && (
										<p className="text-xs text-center text-orange-600 mt-2">
											Nenhuma questão disponível para os tópicos selecionados.
										</p>
									)}
							</div>
						</CardContent>
					</Card>
				</section>
			</div>
		</div>
	);
}
