import StudyDashboard from "@/components/study/StudyDashboard";
import type { TagTreeItem } from "@/modules/taxonomy/services";
import { useState } from "react";

type Props = {
	treeData: TagTreeItem[];
	initialSelectedIds: number[];
};

export default function NewSessionController({
	treeData,
	initialSelectedIds,
}: Props) {
	const [isLoading, setIsLoading] = useState(false);

	async function handleStartSession(tagIds: number[], quantity: number) {
		setIsLoading(true);
		try {
			const res = await fetch("/api/study/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tagIds, quantity }),
			});

			if (!res.ok) throw new Error("Falha ao criar sessão");

			// Redireciona para a home, onde o SessionManager assumirá a sessão ativa
			window.location.href = "/";
		} catch (error) {
			console.error(error);
			alert("Erro ao iniciar sessão. Tente novamente.");
			setIsLoading(false);
		}
	}

	return (
		<StudyDashboard
			treeData={treeData}
			initialSelectedIds={initialSelectedIds}
			onStartSession={handleStartSession}
			isLoading={isLoading}
		/>
	);
}
