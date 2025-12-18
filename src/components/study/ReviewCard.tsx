import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	BookOpen,
	CalendarClock,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Clock,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// Tipo derivado da query do review-list
export type ReviewItem = {
	case_id: number;
	question_index: number;
	case_title: string;
	vignette: string;
	question_text: string;
	correct_answer_text: string;
	ai_feedback: { feedback: string; isCorrect: boolean } | null;
	user_notes: string | null;
};

type Props = {
	item: ReviewItem;
	onAction: (
		action: "short_term" | "long_term" | "dismiss",
		caseId: number,
		qIndex: number,
	) => Promise<void>;
};

export default function ReviewCard({ item, onAction }: Props) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [notes, setNotes] = useState(item.user_notes || "");
	const [isSaving, setIsSaving] = useState(false);
	const [isExiting, setIsExiting] = useState(false); // Para animação de saída

	// Lógica de Auto-Save
	async function handleBlur() {
		// Só salva se mudou algo em relação ao original (ou ao último save)
		if (notes === item.user_notes) return;

		setIsSaving(true);
		try {
			await fetch("/api/study/notes", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					caseId: item.case_id,
					questionIndex: item.question_index,
					notes,
				}),
			});
		} catch (e) {
			console.error("Failed to save notes", e);
		} finally {
			setIsSaving(false);
		}
	}

	async function handleButtonClick(
		action: "short_term" | "long_term" | "dismiss",
	) {
		setIsExiting(true);
		// Aguarda a animação (500ms) antes de notificar o pai para remover do DOM
		setTimeout(async () => {
			await onAction(action, item.case_id, item.question_index);
		}, 500);
	}

	if (isExiting) {
		return (
			<div className="h-0 opacity-0 overflow-hidden transition-all duration-500 ease-in-out" />
		);
	}

	return (
		<Card className="mb-8 border-l-4 border-l-blue-500 shadow-md animate-in slide-in-from-bottom-4 duration-500">
			<CardContent className="pt-6 space-y-6">
				{/* Cabeçalho */}
				<div className="flex justify-between items-start">
					<div>
						<span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
							Caso Clínico #{item.case_id}
						</span>
						<h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
							{item.case_title}
						</h2>
					</div>
					<Button
						variant="ghost"
						onClick={() => setIsExpanded(!isExpanded)}
						className="text-xs h-8"
					>
						{isExpanded ? (
							<>
								<ChevronUp size={14} className="mr-1" /> Ocultar Contexto
							</>
						) : (
							<>
								<BookOpen size={14} className="mr-1" /> Ver Contexto
							</>
						)}
					</Button>
				</div>

				{/* Contexto (Accordion) */}
				{isExpanded && (
					<div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
						<ReactMarkdown>{item.vignette}</ReactMarkdown>
					</div>
				)}

				{/* A Questão e o Erro */}
				<div className="space-y-4">
					<div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
						<h3 className="text-sm font-bold text-gray-500 uppercase">
							Pergunta
						</h3>
						<ReactMarkdown
							remarkPlugins={[remarkGfm, remarkMath]}
							rehypePlugins={[rehypeKatex]}
						>
							{item.question_text}
						</ReactMarkdown>
					</div>

					{/* Feedback da IA */}
					{item.ai_feedback && (
						<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-lg">
							<h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
								<span className="bg-blue-200 dark:bg-blue-800 p-1 rounded">
									🤖
								</span>{" "}
								Análise do Erro
							</h3>
							<div className="text-blue-900 dark:text-blue-100 text-sm leading-relaxed whitespace-pre-line">
								{item.ai_feedback.feedback}
							</div>
						</div>
					)}

					{/* Gabarito */}
					<div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
						<h3 className="text-xs font-bold text-gray-500 uppercase mb-2">
							Gabarito Oficial
						</h3>
						<div className="prose prose-sm dark:prose-invert max-w-none">
							<ReactMarkdown
								remarkPlugins={[remarkGfm, remarkMath]}
								rehypePlugins={[rehypeKatex]}
							>
								{item.correct_answer_text}
							</ReactMarkdown>
						</div>
					</div>
				</div>

				{/* Reflexão */}
				<div className="space-y-2">
					<label
						htmlFor={`notes-${item.case_id}-${item.question_index}`}
						className="text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between"
					>
						<span>Suas Notas & Reflexão</span>
						{isSaving && (
							<span className="text-xs text-gray-400 animate-pulse">
								Salvando...
							</span>
						)}
					</label>
					<textarea
						id={`notes-${item.case_id}-${item.question_index}`}
						className="w-full min-h-[100px] p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y"
						placeholder="Por que eu errei? O que preciso lembrar na próxima?"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						onBlur={handleBlur}
					/>
				</div>

				{/* Ações (Footer) */}
				<div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
					<span className="text-sm text-gray-500 font-medium">
						Quando rever?
					</span>
					<div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
						<button
							type="button"
							onClick={() => handleButtonClick("short_term")}
							className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 hover:border-amber-300 transition-all font-medium text-sm"
						>
							<Clock size={16} /> 1 Mês
						</button>
						<button
							type="button"
							onClick={() => handleButtonClick("long_term")}
							className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all font-medium text-sm"
						>
							<CalendarClock size={16} /> 6 Meses
						</button>
						<button
							type="button"
							onClick={() => handleButtonClick("dismiss")}
							className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all text-sm"
							title="Marcar como masterizado (não revisar mais)"
						>
							<CheckCircle size={16} /> Finalizar
						</button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
