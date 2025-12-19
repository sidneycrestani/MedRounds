import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavigationTabs } from "@/components/ui/navigation-tabs";
import {
	ArrowRight,
	Check,
	CheckCircle,
	Eye,
	Lightbulb,
	X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { type EnvConfig, useCaseSession } from "../hooks/useCaseSession";
import type { PublicCaseDataDTO } from "../types";
import AnswerInput from "./AnswerInput";
import CaseVignette from "./CaseVignette";
import FeedbackSection from "./FeedbackSection";
import QuestionDisplay from "./QuestionDisplay";

export default function CaseStudyClient({
	data,
	env,
	activeQuestionIndices,
	userProgress,
	onCaseCompleted,
}: {
	data: PublicCaseDataDTO;
	env: EnvConfig;
	activeQuestionIndices: number[];
	userProgress: Record<
		number,
		{ isDue: boolean; nextReview: Date | null; isMastered: boolean }
	> | null;
	onCaseCompleted?: () => void;
}) {
	const {
		activeIndex,
		currentQuestion,
		currentAnswer,
		currentResult,
		isRevealed,
		isLoading,
		tabItems,
		isCaseFullyComplete,
		hasNextPendingQuestion,
		isSavingNote,
		setActiveIndex,
		setAnswer,
		submitAnswer,
		revealAnswer,
		submitSelfEvaluation,
		retry,
		nextQuestion,
		saveNote,
	} = useCaseSession({ data, env, activeQuestionIndices, userProgress });

	const hasResult = !!currentResult;
	const handleNextAndScroll = () => {
		nextQuestion();
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const showExplanation =
		isCaseFullyComplete &&
		data.explanation &&
		data.explanation.trim().length > 0;

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			<CaseVignette
				caseId={data.id}
				title="Contexto"
				vignette={data.vignette}
				media={data.media}
			/>

			<NavigationTabs
				items={tabItems}
				activeIndex={activeIndex}
				onChange={setActiveIndex}
			/>

			<div className="space-y-4">
				<QuestionDisplay
					text={currentQuestion.text}
					media={currentQuestion.media}
				/>

				<AnswerInput
					value={currentAnswer}
					onChange={setAnswer}
					placeholder="Sua resposta..."
					disabled={isLoading || hasResult || isRevealed}
				/>

				{/* 1. Initial State: Inputting */}
				{!hasResult && !isRevealed && (
					<div className="flex items-center gap-4">
						<Button
							onClick={submitAnswer}
							loading={isLoading}
							disabled={!currentAnswer}
						>
							{isLoading ? "Consultando IA..." : "Enviar para IA"}
						</Button>

						<Button
							variant="ghost"
							onClick={revealAnswer}
							disabled={isLoading}
							className="text-gray-600 dark:text-gray-400 hover:dark:bg-gray-800"
						>
							<Eye className="w-4 h-4 mr-2" />
							Ver Gabarito
						</Button>
					</div>
				)}

				{/* 2. Revealed State: Self-Evaluation */}
				{!hasResult && isRevealed && (
					<div className="space-y-6 animate-in fade-in slide-in-from-top-2">
						{/* Box de Gabarito ajustado para Dark Mode */}
						<div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
							<h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase mb-2">
								Gabarito
							</h4>
							<div className="text-gray-900 dark:text-gray-100 whitespace-pre-line leading-relaxed prose dark:prose-invert max-w-none">
								<ReactMarkdown
									remarkPlugins={[remarkGfm, remarkMath]}
									rehypePlugins={[rehypeKatex]}
								>
									{currentQuestion.correctAnswer}
								</ReactMarkdown>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
								Como você se saiu?
							</span>
							<button
								type="button"
								onClick={() => submitSelfEvaluation(false)}
								className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 font-medium transition-colors border border-transparent dark:border-red-800"
							>
								<X className="w-4 h-4" />
								Errei / Revisar
							</button>
							<button
								type="button"
								onClick={() => submitSelfEvaluation(true)}
								className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 font-medium transition-colors border border-transparent dark:border-green-800"
							>
								<Check className="w-4 h-4" />
								Acertei
							</button>
						</div>
					</div>
				)}

				{/* 3. Completed State: Feedback */}
				{hasResult && currentResult && (
					<FeedbackSection
						isCorrect={currentResult.isCorrect}
						score={currentResult.score}
						feedback={currentResult.feedback}
						officialAnswer={currentResult.officialAnswer}
						onRetry={retry}
						onSaveNote={saveNote}
						isSavingNote={isSavingNote}
					/>
				)}

				{/* 4. NEW: Case Explanation / Summary */}
				{showExplanation && (
					<div className="animate-in slide-in-from-bottom-4 duration-700 fade-in fill-mode-forwards mt-8">
						<Card className="border-l-4 border-l-purple-500 bg-purple-50/50 dark:bg-purple-900/10">
							<CardHeader className="pb-2">
								<CardTitle className="text-lg flex items-center gap-2 text-purple-900 dark:text-purple-300">
									<Lightbulb className="w-5 h-5" />
									Comentário
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-gray-800 dark:text-gray-200 leading-relaxed prose dark:prose-invert max-w-none">
									<ReactMarkdown
										remarkPlugins={[remarkGfm, remarkMath]}
										rehypePlugins={[rehypeKatex]}
									>
										{data.explanation}
									</ReactMarkdown>
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				{/* 5. Navigation */}
				{(hasResult || isCaseFullyComplete) && (
					<div className="flex items-center justify-end pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
						{hasNextPendingQuestion ? (
							<Button onClick={handleNextAndScroll}>
								Próxima Questão <ArrowRight className="w-4 h-4 ml-2" />
							</Button>
						) : (
							onCaseCompleted && (
								<Button onClick={onCaseCompleted}>
									Finalizar Caso <CheckCircle className="w-4 h-4 ml-2" />
								</Button>
							)
						)}
					</div>
				)}
			</div>
		</div>
	);
}
