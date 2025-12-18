// src/modules/cases/components/FeedbackSection.tsx

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Info, NotebookPen, XCircle } from "lucide-react";
import { type HTMLAttributes, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { twMerge } from "tailwind-merge";

type Props = HTMLAttributes<HTMLDivElement> & {
	isCorrect: boolean;
	score: number;
	feedback: string;
	officialAnswer: string;
	onRetry?: () => void;
	onSaveNote?: (note: string) => Promise<void>;
	isSavingNote?: boolean;
};

export default function FeedbackSection({
	isCorrect,
	score,
	feedback,
	officialAnswer,
	onRetry,
	onSaveNote,
	isSavingNote = false,
	...props
}: Props) {
	const [isNoteOpen, setIsNoteOpen] = useState(false);
	const [noteContent, setNoteContent] = useState("");
	const [lastSaved, setLastSaved] = useState("");
	const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

	async function handleBlur() {
		if (onSaveNote && noteContent !== lastSaved) {
			await onSaveNote(noteContent);
			setLastSaved(noteContent);
			setSaveStatus("saved");
			setTimeout(() => setSaveStatus("idle"), 2000);
		}
	}

	return (
		<div
			className="space-y-8 mt-8 animate-in fade-in slide-in-from-top-4 duration-500"
			{...props}
		>
			{/* Bloco de Avaliação da IA */}
			<div
				className={twMerge(
					"rounded-2xl border-2 p-1 transition-all",
					isCorrect
						? "bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30"
						: "bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/30",
				)}
			>
				<div className="p-5 sm:p-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
						<div className="flex items-center gap-4">
							<div
								className={twMerge(
									"p-3 rounded-xl shadow-sm",
									isCorrect
										? "bg-green-500 text-white"
										: "bg-orange-500 text-white",
								)}
							>
								{isCorrect ? (
									<CheckCircle2 className="w-6 h-6" />
								) : (
									<XCircle className="w-6 h-6" />
								)}
							</div>
							<div>
								<h4
									className={twMerge(
										"text-xl font-bold tracking-tight",
										isCorrect
											? "text-green-900 dark:text-green-300"
											: "text-orange-900 dark:text-orange-300",
									)}
								>
									{isCorrect ? "Conduta Correta" : "Sugestão de Melhora"}
								</h4>
								<p className="text-sm opacity-70 text-gray-600 dark:text-gray-400">
									Avaliação gerada por inteligência artificial
								</p>
							</div>
						</div>

						{onSaveNote && (
							<button
								type="button"
								onClick={() => setIsNoteOpen(!isNoteOpen)}
								className={twMerge(
									"flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border",
									isNoteOpen
										? "bg-white border-blue-200 text-blue-700 shadow-sm dark:bg-gray-800 dark:border-blue-800 dark:text-blue-300"
										: "bg-transparent border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800",
								)}
							>
								<NotebookPen className="w-4 h-4" />
								{isNoteOpen ? "Fechar Notas" : "Adicionar Reflexão"}
							</button>
						)}
					</div>

					<div className="text-gray-800 dark:text-gray-200 leading-relaxed prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-strong:text-current">
						<ReactMarkdown
							remarkPlugins={[remarkGfm, remarkMath]}
							rehypePlugins={[rehypeKatex]}
						>
							{feedback}
						</ReactMarkdown>
					</div>

					{/* Seção de Notas do Usuário */}
					<div
						className={twMerge(
							"overflow-hidden transition-all duration-300 ease-in-out",
							isNoteOpen
								? "max-h-96 opacity-100 mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50"
								: "max-h-0 opacity-0 mt-0",
						)}
					>
						<div className="relative space-y-3">
							<div className="flex justify-between items-center">
								<label
									htmlFor="reflection-note"
									className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest"
								>
									Sua Reflexão (Privada)
								</label>
								<div className="text-[10px] font-medium">
									{isSavingNote && (
										<span className="text-blue-500 animate-pulse flex items-center gap-1">
											<div className="w-1 h-1 bg-current rounded-full animate-bounce" />
											Salvando...
										</span>
									)}
									{!isSavingNote && saveStatus === "saved" && (
										<span className="text-green-600 dark:text-green-400 flex items-center gap-1">
											<CheckCircle2 size={10} /> Salvo com sucesso
										</span>
									)}
								</div>
							</div>
							<textarea
								id="reflection-note"
								value={noteContent}
								onChange={(e) => setNoteContent(e.target.value)}
								onBlur={handleBlur}
								placeholder="O que você aprendeu com esta questão? Por que errou ou como pode consolidar esse acerto?"
								className="w-full min-h-[120px] p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-950/50 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all shadow-inner"
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Gabarito Oficial */}
			<div className="relative group">
				<div className="absolute -inset-0.5 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
				<Card
					variant="muted"
					className="relative border-none bg-gray-100/50 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden"
				>
					<CardContent className="pt-6">
						<div className="flex items-center gap-2 mb-4 text-gray-500 dark:text-gray-400">
							<Info className="w-4 h-4" />
							<h4 className="font-bold text-xs uppercase tracking-widest">
								Gabarito & Referência
							</h4>
						</div>
						<div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed bg-white/40 dark:bg-gray-900/30 p-5 rounded-xl border border-white/60 dark:border-gray-700/30">
							<ReactMarkdown
								remarkPlugins={[remarkGfm, remarkMath]}
								rehypePlugins={[rehypeKatex]}
							>
								{officialAnswer}
							</ReactMarkdown>
						</div>
						{onRetry && (
							<div className="mt-4 flex justify-center">
								<button
									type="button"
									onClick={onRetry}
									className="text-xs font-medium text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors py-2 px-4 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
								>
									Deseja responder novamente?{" "}
									<span className="underline ml-1">Clique aqui</span>
								</button>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
