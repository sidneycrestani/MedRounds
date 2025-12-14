import TagTreeSelector from "@/components/study/TagTreeSelector";
import Button from "@/components/ui/button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TagTreeItem } from "@/modules/taxonomy/services";
import { BrainCircuit, Play } from "lucide-react";
import { useState } from "react";

type Props = {
	treeData: TagTreeItem[];
	initialSelectedIds: number[];
	onStartSession: (tagIds: number[], quantity: number) => void;
	isLoading: boolean;
};

export default function StudyDashboard({
	treeData,
	initialSelectedIds,
	onStartSession,
	isLoading,
}: Props) {
	const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
	const [quantity, setQuantity] = useState(20);

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
			{/* Hero Section */}
			<section className="text-center space-y-2 py-4">
				<h1 className="text-3xl font-bold text-gray-900 tracking-tight">
					Vamos praticar hoje?
				</h1>
				<p className="text-gray-600 max-w-xl mx-auto">
					Selecione os tópicos que deseja revisar e personalizaremos uma sessão
					de estudos baseada nas suas necessidades.
				</p>
			</section>

			{/* Main Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Left Column: Tag Selector */}
				<section className="lg:col-span-2">
					<Card className="h-full flex flex-col">
						<CardHeader className="pb-3 border-b border-gray-100">
							<CardTitle className="text-base flex items-center gap-2">
								<BrainCircuit className="w-4 h-4 text-blue-600" />
								Áreas de Estudo
							</CardTitle>
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

				{/* Right Column: Config & Action */}
				<section className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Configuração</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div
								role="radiogroup"
								aria-labelledby="quantity-label"
								className="space-y-3"
							>
								<span
									id="quantity-label"
									className="text-sm font-medium text-gray-700 block mb-1"
								>
									Quantidade de Questões
								</span>
								<div className="grid grid-cols-3 gap-2">
									{[10, 20, 30].map((q) => (
										<button
											key={q}
											type="button"
											onClick={() => setQuantity(q)}
											className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
												quantity === q
													? "bg-blue-600 text-white border-blue-600 shadow-sm"
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
									disabled={selectedIds.length === 0}
								>
									{!isLoading && <Play className="w-4 h-4 mr-2" />}
									Iniciar Sessão
								</Button>
								{selectedIds.length === 0 && (
									<p className="text-xs text-center text-orange-600 mt-2">
										Selecione pelo menos um tópico
									</p>
								)}
							</div>
						</CardContent>
					</Card>

					<div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
						<h4 className="font-semibold text-blue-900 text-sm mb-1">
							Dica de Estudo
						</h4>
						<p className="text-sm text-blue-800 leading-relaxed">
							Misturar tópicos (Interleaving) melhora a retenção a longo prazo
							mais do que estudar um único assunto por vez.
						</p>
					</div>
				</section>
			</div>
		</div>
	);
}
