import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, NotebookPen, XCircle } from "lucide-react";
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
		// Only save if content actually changed
		if (onSaveNote && noteContent !== lastSaved) {
			await onSaveNote(noteContent);
			setLastSaved(noteContent);
			setSaveStatus("saved");
			setTimeout(() => setSaveStatus("idle"), 2000);
		}
	}

	return (
		<div className="space-y-6" {...props}>
			<Card
				className={
					isCorrect
						? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
						: "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
				}
			>
				<CardContent>
					<div className="flex justify-between items-start mb-4">
						<div className="flex items-center gap-3">
							{isCorrect ? (
								<CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
							) : (
								<XCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
							)}
							<div>
								<h4
									className={
										isCorrect
											? "text-lg font-bold text-green-800 dark:text-green-200"
											: "text-lg font-bold text-orange-800 dark:text-orange-200"
									}
								>
									{isCorrect ? "Conduta Adequada" : "Pontos de Atenção"}
								</h4>
								<span className="text-sm text-gray-500 dark:text-gray-400">
									Nota: {score}/100
								</span>
							</div>
						</div>

						{onSaveNote && (
							<button
								type="button"
								onClick={() => setIsNoteOpen(!isNoteOpen)}
								className={twMerge(
									"flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
									isNoteOpen
										? "bg-white border-blue-200 text-blue-700 shadow-sm dark:bg-gray-800 dark:border-blue-800 dark:text-blue-300"
										: "border-transparent text-gray-500 hover:bg-white/50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200",
								)}
							>
								<NotebookPen className="w-4 h-4" />
								{isNoteOpen ? "Ocultar Reflexão" : "Adicionar Reflexão"}
							</button>
						)}
					</div>

					<div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line pl-11 prose dark:prose-invert max-w-none">
						<ReactMarkdown
							remarkPlugins={[remarkGfm, remarkMath]}
							rehypePlugins={[rehypeKatex]}
						>
							{feedback}
						</ReactMarkdown>
					</div>

					{/* Note Input Section with Slide Animation */}
					<div
						className={twMerge(
							"overflow-hidden transition-all duration-300 ease-in-out pl-11",
							isNoteOpen
								? "max-h-96 opacity-100 mt-4"
								: "max-h-0 opacity-0 mt-0",
						)}
					>
						<div className="relative">
							<label
								htmlFor="reflection-note"
								className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide flex justify-between"
							>
								<span>Suas anotações (Privado)</span>
								<span className="font-normal normal-case">
									{isSavingNote && (
										<span className="text-blue-500 animate-pulse">
											Salvando...
										</span>
									)}
									{!isSavingNote && saveStatus === "saved" && (
										<span className="text-green-600 dark:text-green-400">
											Salvo
										</span>
									)}
								</span>
							</label>
							<textarea
								id="reflection-note"
								value={noteContent}
								onChange={(e) => setNoteContent(e.target.value)}
								onBlur={handleBlur}
								placeholder="O que você aprendeu com este erro? O que precisa revisar?"
								className="w-full min-h-[100px] p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y transition-shadow"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card variant="muted">
				<CardContent>
					<h4 className="font-bold text-gray-700 dark:text-gray-300 mb-3 text-sm uppercase tracking-wide">
						Gabarito / Resposta Ideal
					</h4>
					<div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
						<ReactMarkdown
							remarkPlugins={[remarkGfm, remarkMath]}
							rehypePlugins={[rehypeKatex]}
						>
							{officialAnswer}
						</ReactMarkdown>
					</div>
					{onRetry && (
						<button
							type="button"
							onClick={onRetry}
							className="mt-4 text-sm text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white underline"
						>
							Refazer esta questão
						</button>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
