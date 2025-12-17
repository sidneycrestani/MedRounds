import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import type { HTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

type Props = HTMLAttributes<HTMLDivElement> & {
	isCorrect: boolean;
	score: number;
	feedback: string;
	officialAnswer: string;
	onRetry?: () => void;
};

export default function FeedbackSection({
	isCorrect,
	score,
	feedback,
	officialAnswer,
	onRetry,
	...props
}: Props) {
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
					</div>
					<div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line pl-11 prose dark:prose-invert max-w-none">
						<ReactMarkdown
							remarkPlugins={[remarkGfm, remarkMath]}
							rehypePlugins={[rehypeKatex]}
						>
							{feedback}
						</ReactMarkdown>
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
