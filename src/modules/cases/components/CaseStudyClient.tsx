// src/modules/cases/components/CaseStudyClient.tsx
import { Button } from "@/components/ui/button";
import { NavigationTabs } from "@/components/ui/navigation-tabs";
import { Check, Eye, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import {
	type EnvConfig,
	type PublicCaseData,
	useCaseSession,
} from "../hooks/useCaseSession";
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
	data: PublicCaseData;
	env: EnvConfig;
	activeQuestionIndices: number[];
	userProgress: Record<
		number,
		{ isDue: boolean; nextReview: Date | null; isMastered: boolean }
	> | null;
	onCaseCompleted?: () => void;
}) {
	const {
		// State & Computed
		activeIndex,
		currentQuestion,
		currentAnswer,
		currentResult,
		isRevealed,
		isLoading,
		tabItems,
		isCaseFullyComplete,

		// Actions
		setActiveIndex,
		setAnswer,
		submitAnswer,
		revealAnswer,
		submitSelfEvaluation,
		retry,
	} = useCaseSession({ data, env, activeQuestionIndices, userProgress });

	const hasResult = !!currentResult;

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			<CaseVignette
				title="Vignette"
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

				{/* ZONE OF ACTION */}

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
							className="text-gray-600"
						>
							<Eye className="w-4 h-4 mr-2" />
							Ver Gabarito
						</Button>

						<div className="ml-auto flex items-center gap-2 text-sm">
							{data.prevId && (
								<a
									href={`/case/${data.prevId}${data.searchParams}`}
									className="text-gray-600 hover:text-black underline"
								>
									Anterior
								</a>
							)}
							{data.nextId && (
								<a
									href={`/case/${data.nextId}${data.searchParams}`}
									className="text-gray-600 hover:text-black underline"
								>
									Próxima
								</a>
							)}
						</div>
					</div>
				)}

				{/* 2. Revealed State: Self-Evaluation */}
				{!hasResult && isRevealed && (
					<div className="space-y-6 animate-in fade-in slide-in-from-top-2">
						<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
							<h4 className="font-bold text-gray-700 text-sm uppercase mb-2">
								Gabarito Oficial
							</h4>
							<div className="text-gray-900 whitespace-pre-line leading-relaxed">
								<ReactMarkdown
									remarkPlugins={[remarkGfm, remarkMath]}
									rehypePlugins={[rehypeKatex]}
								>
									{currentQuestion.correctAnswer}
								</ReactMarkdown>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<span className="text-sm font-medium text-gray-600">
								Como você se saiu?
							</span>
							<button
								type="button"
								onClick={() => submitSelfEvaluation(false)}
								className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition-colors"
							>
								<X className="w-4 h-4" />
								Errei / Revisar
							</button>
							<button
								type="button"
								onClick={() => submitSelfEvaluation(true)}
								className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium transition-colors"
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
					/>
				)}

				{onCaseCompleted && (
					<div className="flex items-center justify-end">
						{isCaseFullyComplete && (
							<Button onClick={onCaseCompleted}>Próximo Caso</Button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
