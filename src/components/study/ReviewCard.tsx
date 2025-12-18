import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	AlertTriangle,
	BrainCircuit,
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	PenLine,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

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
	// Accordion state
	const [isContextOpen, setIsContextOpen] = useState(false);

	const [notes, setNotes] = useState(item.user_notes || "");
	// Se não tem notas, começa em modo de edição automaticamente (mas sem foco)
	const [isEditingNotes, setIsEditingNotes] = useState(!item.user_notes);

	// Estado para controlar o foco manual vs automático
	const [shouldFocus, setShouldFocus] = useState(false);

	const [isSaving, setIsSaving] = useState(false);
	const [isExiting, setIsExiting] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-focus APENAS se shouldFocus for verdadeiro
	useEffect(() => {
		if (isEditingNotes && shouldFocus && textareaRef.current) {
			textareaRef.current.focus();
			setShouldFocus(false); // Reseta o gatilho
		}
	}, [isEditingNotes, shouldFocus]);

	async function handleBlur() {
		// Só salva e sai do modo de edição se houver conteúdo. Se vazio, permanece como "prompt".
		// Se o usuário apagar tudo, consideramos como "sem nota" visualmente depois.

		if (notes !== item.user_notes) {
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

		// Se salvou algo, volta para o modo de leitura (card bonito)
		if (notes.trim().length > 0) {
			setIsEditingNotes(false);
		}
	}

	async function handleButtonClick(
		action: "short_term" | "long_term" | "dismiss",
	) {
		setIsExiting(true);
		setTimeout(async () => {
			await onAction(action, item.case_id, item.question_index);
		}, 300);
	}

	if (isExiting) {
		return (
			<div className="h-0 opacity-0 overflow-hidden transition-all duration-300 ease-in-out" />
		);
	}

	return (
		<Card className="mb-6 shadow-sm border-l-4 border-l-orange-400 dark:border-l-orange-500 animate-in slide-in-from-bottom-4 duration-500 group">
			<CardContent className="pt-6 space-y-6">
				{/* 1. Header & ID */}
				<div className="flex justify-between items-start">
					<div>
						<span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
							<AlertTriangle size={12} /> Revisão Pendente #{item.case_id}
						</span>
						<h2 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
							{item.case_title}
						</h2>
					</div>
				</div>

				{/* 2. REFLECTION SECTION (Unified Logic) */}
				<div className="space-y-2">
					{/* Caso A: Modo Leitura (Tem notas e não está editando) */}
					{!isEditingNotes && notes.trim().length > 0 ? (
						<button
							type="button"
							className="w-full text-left bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all relative group/note"
							onClick={() => {
								setShouldFocus(true); // Solicita foco explicitamente
								setIsEditingNotes(true);
							}}
							title="Clique para editar"
						>
							<div className="flex items-start gap-3">
								<div className="bg-amber-100 dark:bg-amber-900/40 p-1.5 rounded-full shrink-0">
									<BrainCircuit className="w-4 h-4 text-amber-700 dark:text-amber-500" />
								</div>
								<div className="flex-1 min-w-0">
									<h3 className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase mb-1 flex items-center gap-2">
										Sua Reflexão
										<span className="text-[10px] font-normal opacity-0 group-hover/note:opacity-70 transition-opacity bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded">
											Editar
										</span>
									</h3>
									<p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-line leading-relaxed">
										{notes}
									</p>
								</div>
								<PenLine className="w-4 h-4 text-amber-400 opacity-0 group-hover/note:opacity-100 transition-opacity absolute top-4 right-4" />
							</div>
						</button>
					) : (
						// Caso B: Modo Edição OU Modo Vazio (Prompt de Escrita)
						<div className="animate-in fade-in duration-300">
							<label
								htmlFor={`note-${item.case_id}`}
								className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 pl-1"
							>
								<BrainCircuit className="w-4 h-4" />
								{notes.trim().length === 0
									? "Análise de Causa Raiz"
									: "Editando Reflexão"}
							</label>

							<div className="relative">
								<textarea
									id={`note-${item.case_id}`}
									ref={textareaRef}
									className="w-full min-h-[100px] p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all resize-y placeholder:text-gray-400 dark:placeholder:text-gray-500"
									placeholder="Por que errei? Falta de conhecimento, leitura desatenta ou conceito equivocado?"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									onBlur={handleBlur}
								/>
								{/* Indicador de status de salvamento discreto dentro da caixa */}
								<div className="absolute bottom-3 right-3 pointer-events-none">
									{isSaving ? (
										<span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full animate-pulse border border-amber-100">
											Salvando...
										</span>
									) : null}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* 3. The Context (Accordion) */}
				<div className="border rounded-lg dark:border-gray-700 overflow-hidden mt-4">
					<button
						type="button"
						onClick={() => setIsContextOpen(!isContextOpen)}
						className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
					>
						<span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
							Ver Contexto & Gabarito
						</span>
						{isContextOpen ? (
							<ChevronDown size={14} className="text-gray-400" />
						) : (
							<ChevronRight size={14} className="text-gray-400" />
						)}
					</button>

					{isContextOpen && (
						<div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 space-y-4 border-t dark:border-gray-700 animate-in slide-in-from-top-2">
							{/* Vignette */}
							<div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
								<ReactMarkdown>{item.vignette}</ReactMarkdown>
							</div>

							{/* Question & Answer Grid */}
							<div className="grid gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
								<div className="pt-2">
									<h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1">
										Pergunta
									</h4>
									<div className="text-sm text-gray-700 dark:text-gray-300">
										<ReactMarkdown
											remarkPlugins={[remarkGfm, remarkMath]}
											rehypePlugins={[rehypeKatex]}
										>
											{item.question_text}
										</ReactMarkdown>
									</div>
								</div>

								<div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
									<h4 className="text-xs font-bold text-green-700 dark:text-green-500 uppercase mb-1 flex items-center gap-2">
										<CheckCircle2 size={12} /> Gabarito
									</h4>
									<div className="text-sm prose prose-sm dark:prose-invert">
										<ReactMarkdown
											remarkPlugins={[remarkGfm, remarkMath]}
											rehypePlugins={[rehypeKatex]}
										>
											{item.correct_answer_text}
										</ReactMarkdown>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* 4. Action Area (Dispatch) */}
				<div className="pt-4 border-t border-gray-100 dark:border-gray-800">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<button
							type="button"
							onClick={() => handleButtonClick("short_term")}
							className="group relative flex flex-col items-center justify-center gap-1 p-3 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900/50 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all"
						>
							<div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-bold text-sm">
								<AlertTriangle size={16} /> Curto Prazo
							</div>
							<span className="text-xs text-orange-600/60 dark:text-orange-400/60 font-medium">
								~10 dias
							</span>
						</button>

						<button
							type="button"
							onClick={() => handleButtonClick("long_term")}
							className="group relative flex flex-col items-center justify-center gap-1 p-3 bg-white dark:bg-gray-800 border-2 border-blue-100 dark:border-blue-900/50 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
						>
							<div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-sm">
								<Calendar size={16} /> Longo Prazo
							</div>
							<span className="text-xs text-blue-600/60 dark:text-blue-400/60 font-medium">
								~45 dias
							</span>
						</button>

						<button
							type="button"
							onClick={() => handleButtonClick("dismiss")}
							className="group relative flex flex-col items-center justify-center gap-1 p-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/10 rounded-xl transition-all text-gray-400 hover:text-green-700 dark:hover:text-green-400"
						>
							<div className="flex items-center gap-2 font-bold text-sm">
								<CheckCircle2 size={16} /> Finalizar
							</div>
							<span className="text-xs opacity-70 font-medium">Dominado</span>
						</button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
