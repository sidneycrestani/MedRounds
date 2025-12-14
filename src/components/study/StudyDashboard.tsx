import TagTreeSelector from "@/components/study/TagTreeSelector";
import Button from "@/components/ui/button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TagTreeItem } from "@/modules/taxonomy/services";
import {
	BrainCircuit,
	CheckSquare,
	Play,
	RefreshCcw,
	Square,
} from "lucide-react"; // Adicionei ícone de refresh se quiser
import { useEffect, useMemo, useState } from "react";

type Props = {
	treeData: TagTreeItem[];
	initialSelectedIds: number[];
	onStartSession: (tagIds: number[], quantity: number) => void;
	isLoading: boolean;
};

// Tipo do dado que vem da API nova
type AvailabilityItem = {
	case_id: number;
	question_count: number;
	tag_ids: number[];
};

// Helper recursivo (mantido)
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

	// Estado novo: O Mapa completo de disponibilidade
	const [availabilityMap, setAvailabilityMap] = useState<AvailabilityItem[]>(
		[],
	);
	const [isMapLoading, setIsMapLoading] = useState(true);

	// 1. Fetch ÚNICO ao carregar o componente
	useEffect(() => {
		async function fetchMap() {
			try {
				const res = await fetch("/api/study/availability-map");
				if (res.ok) {
					const data = await res.json();
					setAvailabilityMap(data);
				}
			} catch (error) {
				console.error("Failed to fetch availability map", error);
			} finally {
				setIsMapLoading(false);
			}
		}
		fetchMap();
	}, []);

	// 2. Cálculo Local Instantâneo (useMemo)
	// Toda vez que selectedIds mudar, isso roda em microssegundos
	const availableCount = useMemo(() => {
		if (selectedIds.length === 0) return 0;

		// Set para busca rápida O(1)
		const selectedSet = new Set(selectedIds);
		let total = 0;

		for (const item of availabilityMap) {
			// Se o caso tiver PELO MENOS UMA das tags selecionadas, ele conta.
			// (Lógica OR - se quiser AND, muda para .every, mas SRS geralmente é OR)
			const hasIntersection = item.tag_ids.some((tagId) =>
				selectedSet.has(tagId),
			);

			if (hasIntersection) {
				total += Number(item.question_count); // Postgres retorna count como string as vezes
			}
		}
		return total;
	}, [selectedIds, availabilityMap]);

	// Funções de Bulk Action (mantidas)
	const handleSelectAll = () => setSelectedIds(getAllIdsRecursive(treeData));
	const handleClearAll = () => setSelectedIds([]);

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handleSelectAll}
									className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
								>
									<CheckSquare size={14} /> Todos
								</button>
								<button
									type="button"
									onClick={handleClearAll}
									className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
								>
									<Square size={14} /> Limpar
								</button>
							</div>
						</CardHeader>

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

				<section className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Resumo da Sessão</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center transition-all duration-300">
								<span className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
									Questões Disponíveis
								</span>
								<div className="text-3xl font-bold text-blue-900 mt-1">
									{isMapLoading ? (
										<span className="animate-pulse">...</span>
									) : (
										availableCount
									)}
								</div>
								<p className="text-xs text-blue-700/80 mt-1">
									baseado na sua seleção
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
										(availableCount === 0 && !isMapLoading)
									}
								>
									{!isLoading && <Play className="w-4 h-4 mr-2" />}
									Iniciar Sessão
								</Button>
								{availableCount === 0 &&
									!isMapLoading &&
									selectedIds.length > 0 && (
										<p className="text-xs text-center text-orange-600 mt-2">
											Nenhum caso novo ou para revisão nestes tópicos.
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
