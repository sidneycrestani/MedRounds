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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Props = {
	treeData: TagTreeItem[];
	initialSelectedIds: number[];
	onStartSession: (tagIds: number[], quantity: number) => void;
	isLoading: boolean;
};

type AvailabilityItem = {
	case_id: number;
	question_count: number;
	tag_ids: number[];
};

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
	const [availabilityMap, setAvailabilityMap] = useState<AvailabilityItem[]>(
		[],
	);
	const [isMapLoading, setIsMapLoading] = useState(true);

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

	const availableCount = useMemo(() => {
		if (selectedIds.length === 0) return 0;
		const selectedSet = new Set(selectedIds);
		let total = 0;
		for (const item of availabilityMap) {
			const hasIntersection = item.tag_ids.some((tagId) =>
				selectedSet.has(tagId),
			);
			if (hasIntersection) {
				total += Number(item.question_count);
			}
		}
		return total;
	}, [selectedIds, availabilityMap]);

	const handleSelectAll = () => setSelectedIds(getAllIdsRecursive(treeData));
	const handleClearAll = () => setSelectedIds([]);

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
			<section className="text-center space-y-2 py-4">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
					Vamos praticar hoje?
				</h1>
				<p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
					Selecione os tópicos que deseja revisar.
				</p>
			</section>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<section className="lg:col-span-2">
					<Card className="h-full flex flex-col">
						<CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700 flex flex-row items-center justify-between">
							<CardTitle className="text-base flex items-center gap-2">
								<BrainCircuit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
								Áreas de Estudo
							</CardTitle>

							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handleSelectAll}
									className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
								>
									<CheckSquare size={14} /> Todos
								</button>
								<button
									type="button"
									onClick={handleClearAll}
									className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
						<div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center rounded-b-xl">
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
							{/* Card de Estatística Ajustado */}
							<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 text-center transition-all duration-300">
								<span className="text-xs text-blue-600 dark:text-blue-300 font-semibold uppercase tracking-wider">
									Questões Disponíveis
								</span>
								<div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
									{isMapLoading ? (
										<span className="animate-pulse">...</span>
									) : (
										availableCount
									)}
								</div>
								<p className="text-xs text-blue-700/80 dark:text-blue-300/70 mt-1">
									baseado na sua seleção
								</p>
							</div>

							<div className="space-y-3">
								<span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
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
													? "bg-black text-white border-black shadow-sm dark:bg-white dark:text-black dark:border-white"
													: "bg-white text-gray-700 border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
											}`}
										>
											{q}
										</button>
									))}
								</div>
							</div>

							<div className="pt-4 border-t border-gray-100 dark:border-gray-700">
								<Button
									className="w-full h-12 text-base shadow-lg shadow-blue-900/10 dark:shadow-none"
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
										<p className="text-xs text-center text-orange-600 dark:text-orange-400 mt-2">
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
