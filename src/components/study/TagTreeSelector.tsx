import type { TagTreeItem } from "@/modules/taxonomy/services";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

type Props = {
	nodes: TagTreeItem[];
	selectedIds: number[];
	onSelectionChange: (ids: number[]) => void;
	level?: number;
};

export default function TagTreeSelector({
	nodes,
	selectedIds,
	onSelectionChange,
	level = 0,
}: Props) {
	const [expanded, setExpanded] = useState<Record<number, boolean>>({});

	const toggleExpand = (id: number) => {
		setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	// Helper: Coleta todos os IDs de um nó e seus descendentes
	const getAllIds = (node: TagTreeItem): number[] => {
		let ids = [node.value];
		for (const child of node.children) {
			ids = [...ids, ...getAllIds(child)];
		}
		return ids;
	};

	const handleCheck = (node: TagTreeItem) => {
		const nodeAndChildrenIds = getAllIds(node);
		const isCurrentlySelected = selectedIds.includes(node.value);

		let newSelection: number[];

		if (isCurrentlySelected) {
			// Se já está selecionado, desmarca ele e todos os filhos
			newSelection = selectedIds.filter(
				(id) => !nodeAndChildrenIds.includes(id),
			);
		} else {
			// Se não está, adiciona ele e todos os filhos (evitando duplicatas)
			const uniqueIds = new Set([...selectedIds, ...nodeAndChildrenIds]);
			newSelection = Array.from(uniqueIds);
		}

		onSelectionChange(newSelection);
	};

	if (!nodes || nodes.length === 0) return null;

	return (
		<ul className="flex flex-col gap-1">
			{nodes.map((node) => {
				const hasChildren = node.children && node.children.length > 0;
				const isExpanded = expanded[node.id];
				const isSelected = selectedIds.includes(node.value);

				return (
					<li key={node.id} className="select-none">
						<div
							className={twMerge(
								"flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 transition-colors",
								isSelected ? "bg-blue-50" : "",
							)}
							style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
						>
							<button
								type="button"
								onClick={() => toggleExpand(node.id)}
								className={twMerge(
									"p-1 rounded text-gray-400 hover:text-gray-700 transition-transform",
									!hasChildren && "invisible",
								)}
							>
								{isExpanded ? (
									<ChevronDown size={14} />
								) : (
									<ChevronRight size={14} />
								)}
							</button>

							<label className="flex items-center gap-2 cursor-pointer flex-1">
								<input
									type="checkbox"
									className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
									checked={isSelected}
									onChange={() => handleCheck(node)}
								/>
								<span
									className={twMerge(
										"text-sm",
										isSelected ? "font-medium text-blue-900" : "text-gray-700",
									)}
								>
									{node.label}
								</span>
							</label>
						</div>

						{hasChildren && isExpanded && (
							<TagTreeSelector
								nodes={node.children}
								selectedIds={selectedIds}
								onSelectionChange={onSelectionChange}
								level={level + 1}
							/>
						)}
					</li>
				);
			})}
		</ul>
	);
}
