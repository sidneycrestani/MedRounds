import type { TagTreeItem } from "@/modules/taxonomy/services";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

// --- 1. Componente Auxiliar Limpo ---
// Isola a manipulação direta do DOM (ref) para lidar com o estado visual 'indeterminado'
function IndeterminateCheckbox({
	checked,
	indeterminate,
	onChange,
	className,
	id, // Adicionado
}: {
	checked: boolean;
	indeterminate: boolean;
	onChange: () => void;
	className?: string;
	id: string; // Adicionado
}) {
	const ref = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (ref.current) {
			ref.current.indeterminate = indeterminate;
		}
	}, [indeterminate]);

	return (
		<input
			type="checkbox"
			ref={ref}
			className={className}
			checked={checked}
			onChange={onChange}
			id={id}
		/>
	);
}

// --- 2. Helper Recursivo ---
const getAllIds = (node: TagTreeItem): number[] => {
	let ids = [node.value];
	if (node.children) {
		for (const child of node.children) {
			ids = [...ids, ...getAllIds(child)];
		}
	}
	return ids;
};

// --- 3. Componente Principal ---
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

	// Lógica de manipulação da seleção
	const handleCheck = (node: TagTreeItem, isCurrentlySelected: boolean) => {
		const nodeAndChildrenIds = getAllIds(node);
		let newSelection: number[];

		if (isCurrentlySelected) {
			// Desmarcar: Remove o nó e todos os seus descendentes
			newSelection = selectedIds.filter(
				(id) => !nodeAndChildrenIds.includes(id),
			);
		} else {
			// Marcar: Adiciona o nó e garante que todos os descendentes entrem
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

				// --- Lógica de Estado Otimizada ---
				const isSelected = selectedIds.includes(node.value);

				const descendantIds = useMemo(() => {
					return getAllIds(node).filter((id) => id !== node.value);
				}, [node]);

				const hasSelectedDescendants = descendantIds.some((id) =>
					selectedIds.includes(id),
				);

				const isIndeterminate = !isSelected && hasSelectedDescendants;

				// NOVO: ID único para acessibilidade
				const inputId = `tag-check-${node.id}`;

				return (
					<li key={node.id} className="select-none">
						<div
							className={twMerge(
								"flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 transition-colors",
								isSelected || isIndeterminate ? "bg-blue-50" : "",
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

							<label
								className="flex items-center gap-2 cursor-pointer flex-1"
								htmlFor={inputId} // Corrigido o erro de A11y
							>
								<IndeterminateCheckbox
									className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
									checked={isSelected}
									indeterminate={isIndeterminate}
									onChange={() => handleCheck(node, isSelected)}
									id={inputId} // Passa o ID
								/>
								<span
									className={twMerge(
										"text-sm",
										isSelected || isIndeterminate
											? "font-medium text-blue-900"
											: "text-gray-700",
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
