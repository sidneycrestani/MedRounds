import { Button } from "@/components/ui/button";
import { NavigationTabs } from "@/components/ui/navigation-tabs";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Check, Eye, X } from "lucide-react";
import { useState } from "react";
import { CaseFeedbackSchema } from "../types";
import AnswerInput from "./AnswerInput";
import CaseVignette from "./CaseVignette";
import FeedbackSection from "./FeedbackSection";
import QuestionDisplay from "./QuestionDisplay";

interface PublicCaseQuestion {
	id: number;
	text: string;
	media?: string;
	order: number;
	correctAnswer: string; // Updated interface
}

interface PublicCaseData {
	id: number;
	title: string;
	vignette: string;
	media?: string;
	questions: PublicCaseQuestion[];
	prevId: number | null;
	nextId: number | null;
	searchParams: string;
}

type ResultData = {
	isCorrect: boolean;
	feedback: string;
	score: number;
	officialAnswer: string;
	keywords?: string[];
};

interface EnvConfig {
	supabaseUrl: string;
	supabaseAnonKey: string;
}

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
	const [supabase] = useState<SupabaseClient>(() =>
		createBrowserClient(env.supabaseUrl, env.supabaseAnonKey),
	);

	const activeOrdersSet = new Set(activeQuestionIndices);
	const initialOrder =
		activeQuestionIndices.length > 0
			? Math.min(...activeQuestionIndices)
			: (data.questions[0]?.order ?? 0);
	const initialIndex = Math.max(
		data.questions.findIndex((q) => q.order === initialOrder),
		0,
	);
	const [activeIndex, setActiveIndex] = useState(initialIndex);
	const [answers, setAnswers] = useState<string[]>(() =>
		Array.from({ length: data.questions.length }, () => ""),
	);
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<(ResultData | null)[]>(() =>
		Array.from({ length: data.questions.length }, () => null),
	);
	const [revealedQuestionIds, setRevealedQuestionIds] = useState<Set<number>>(
		new Set(),
	);

	async function persistSrsAttempt(
		caseId: number,
		score: number,
		questionIndex: number,
	) {
		try {
			await fetch("/api/srs/process-attempt", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ caseId, score, questionIndex }),
			});
		} catch (err) {
			console.error("Failed to persist SRS data:", err);
		}
	}

	async function submitAI() {
		const current = answers[activeIndex];
		if (!current.trim()) return;
		setLoading(true);
		const question = data.questions[activeIndex];

		const { data: responseData, error } = await supabase.functions.invoke(
			"check-answer",
			{
				body: { questionId: question.id, userAnswer: current },
			},
		);

		if (error) {
			console.error(error);
			alert("Erro ao corrigir. Tente novamente.");
		} else {
			try {
				const parsed = CaseFeedbackSchema.parse(responseData);
				setResults((prev) => {
					const next = [...prev];
					next[activeIndex] = parsed;
					return next;
				});
				persistSrsAttempt(data.id, parsed.score, question.order);
			} catch (e) {
				console.error(e);
				alert("Resposta da IA inválida.");
			}
		}
		setLoading(false);
	}

	function handleReveal() {
		const questionId = data.questions[activeIndex].id;
		setRevealedQuestionIds((prev) => {
			const next = new Set(prev);
			next.add(questionId);
			return next;
		});
	}

	function handleSelfEvaluate(isCorrect: boolean) {
		const question = data.questions[activeIndex];
		const score = isCorrect ? 100 : 0;

		// 1. Persist attempt
		persistSrsAttempt(data.id, score, question.order);

		// 2. Mock a result object to lock the UI and show feedback state
		const mockResult: ResultData = {
			isCorrect: isCorrect,
			score: score,
			feedback: "Auto-avaliação realizada.",
			officialAnswer: question.correctAnswer,
		};

		setResults((prev) => {
			const next = [...prev];
			next[activeIndex] = mockResult;
			return next;
		});
	}

	const currentQuestion = data.questions[activeIndex];
	const isRevealed = revealedQuestionIds.has(currentQuestion.id);
	const hasResult = !!results[activeIndex];

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			<CaseVignette
				title="Vignette"
				vignette={data.vignette}
				media={data.media}
			/>

			<NavigationTabs
				items={data.questions.map((q, idx) => {
					const prog = userProgress?.[q.order];
					const hasLocalResult = !!results[idx];
					let status: "locked" | "mastered" | "current" | "pending";
					if (idx === activeIndex) {
						status = "current";
					} else if (prog?.isMastered || hasLocalResult) {
						status = "mastered";
					} else if (activeOrdersSet.has(q.order)) {
						status = "pending";
					} else {
						status = "locked";
					}
					return {
						id: q.id,
						label: `Questão ${idx + 1}`,
						status,
						disabled: status === "locked" || status === "mastered",
					};
				})}
				activeIndex={activeIndex}
				onChange={(idx) => setActiveIndex(idx)}
			/>

			<div className="space-y-4">
				<QuestionDisplay
					text={currentQuestion.text}
					media={currentQuestion.media}
				/>

				<AnswerInput
					value={answers[activeIndex]}
					onChange={(v) =>
						setAnswers((prev) => {
							const next = [...prev];
							next[activeIndex] = v;
							return next;
						})
					}
					placeholder="Sua resposta..."
					disabled={loading || hasResult || isRevealed}
				/>

				{/* ZONE OF ACTION */}

				{/* 1. Initial State: Inputting */}
				{!hasResult && !isRevealed && (
					<div className="flex items-center gap-4">
						<Button
							onClick={submitAI}
							loading={loading}
							disabled={!answers[activeIndex]}
						>
							{loading ? "Consultando IA..." : "Enviar para IA"}
						</Button>

						<Button
							variant="ghost"
							onClick={handleReveal}
							disabled={loading}
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
								{currentQuestion.correctAnswer}
							</div>
						</div>

						<div className="flex items-center gap-3">
							<span className="text-sm font-medium text-gray-600">
								Como você se saiu?
							</span>
							<button
								type="button"
								onClick={() => handleSelfEvaluate(false)}
								className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition-colors"
							>
								<X className="w-4 h-4" />
								Errei / Revisar
							</button>
							<button
								type="button"
								onClick={() => handleSelfEvaluate(true)}
								className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium transition-colors"
							>
								<Check className="w-4 h-4" />
								Acertei
							</button>
						</div>
					</div>
				)}

				{/* 3. Completed State: Feedback */}
				{hasResult && results[activeIndex] && (
					<FeedbackSection
						isCorrect={!!results[activeIndex]?.isCorrect}
						score={results[activeIndex]?.score ?? 0}
						feedback={results[activeIndex]?.feedback ?? ""}
						officialAnswer={results[activeIndex]?.officialAnswer ?? ""}
						onRetry={() => {
							// Reset logic
							setResults((prev) => {
								const next = [...prev];
								next[activeIndex] = null;
								return next;
							});
							setAnswers((prev) => {
								const next = [...prev];
								next[activeIndex] = "";
								return next;
							});
							// Also clear reveal state if retrying
							setRevealedQuestionIds((prev) => {
								const next = new Set(prev);
								next.delete(currentQuestion.id);
								return next;
							});
						}}
					/>
				)}

				{onCaseCompleted && (
					<div className="flex items-center justify-end">
						{activeQuestionIndices.length > 0 &&
							activeQuestionIndices.every((order) => {
								const idx = data.questions.findIndex((q) => q.order === order);
								return idx >= 0 && !!results[idx];
							}) && <Button onClick={onCaseCompleted}>Próximo Caso</Button>}
					</div>
				)}
			</div>
		</div>
	);
}
