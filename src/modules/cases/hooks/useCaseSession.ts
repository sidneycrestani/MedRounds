// src/modules/cases/hooks/useCaseSession.ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMemo, useState } from "react";
import { CaseFeedbackSchema, type PublicCaseDataDTO } from "../types";

export interface EnvConfig {
	supabaseUrl: string;
	supabaseAnonKey: string;
}

export type ResultData = {
	isCorrect: boolean;
	feedback: string;
	score: number;
	officialAnswer: string;
	keywords?: string[];
};

type UserProgress = Record<
	number,
	{ isDue: boolean; nextReview: Date | null; isMastered: boolean }
>;

interface UseCaseSessionProps {
	data: PublicCaseDataDTO;
	env: EnvConfig;
	activeQuestionIndices: number[];
	userProgress: UserProgress | null;
}

export function useCaseSession({
	data,
	env,
	activeQuestionIndices,
	userProgress,
}: UseCaseSessionProps) {
	// --- 1. Initialization Logic ---
	const [supabase] = useState<SupabaseClient>(() =>
		createBrowserClient(env.supabaseUrl, env.supabaseAnonKey),
	);

	const activeOrdersSet = useMemo(
		() => new Set(activeQuestionIndices),
		[activeQuestionIndices],
	);

	// Calculate initial index based on active indices
	const initialIndex = useMemo(() => {
		if (activeQuestionIndices.length > 0) {
			const initialOrder = Math.min(...activeQuestionIndices);
			return Math.max(
				data.questions.findIndex((q) => q.order === initialOrder),
				0,
			);
		}
		return data.questions[0]?.order ?? 0;
	}, [activeQuestionIndices, data.questions]);

	// --- 2. State ---
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

	// --- 3. Computed Properties ---
	const currentQuestion = data.questions[activeIndex];
	const currentAnswer = answers[activeIndex];
	const currentResult = results[activeIndex];
	const isRevealed = revealedQuestionIds.has(currentQuestion.id);

	// Calculate Tab Items State
	const tabItems = useMemo(() => {
		return data.questions.map((q, idx) => {
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
		});
	}, [data.questions, activeIndex, userProgress, results, activeOrdersSet]);

	const isCaseFullyComplete =
		activeQuestionIndices.length > 0 &&
		activeQuestionIndices.every((order) => {
			const idx = data.questions.findIndex((q) => q.order === order);
			return idx >= 0 && !!results[idx];
		});

	// --- 4. Side Effects / API Actions ---

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
		if (!currentAnswer.trim()) return;
		setLoading(true);

		const { data: responseData, error } = await supabase.functions.invoke(
			"check-answer",
			{
				body: { questionId: currentQuestion.id, userAnswer: currentAnswer },
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
				persistSrsAttempt(data.id, parsed.score, currentQuestion.order);
			} catch (e) {
				console.error(e);
				alert("Resposta da IA inválida.");
			}
		}
		setLoading(false);
	}

	function handleSelfEvaluate(isCorrect: boolean) {
		const score = isCorrect ? 100 : 0;

		// 1. Persist attempt
		persistSrsAttempt(data.id, score, currentQuestion.order);

		// 2. Mock a result object to lock the UI
		const mockResult: ResultData = {
			isCorrect: isCorrect,
			score: score,
			feedback: "Auto-avaliação realizada.",
			officialAnswer: currentQuestion.correctAnswer,
		};

		setResults((prev) => {
			const next = [...prev];
			next[activeIndex] = mockResult;
			return next;
		});
	}

	function handleReveal() {
		setRevealedQuestionIds((prev) => {
			const next = new Set(prev);
			next.add(currentQuestion.id);
			return next;
		});
	}

	function handleAnswerChange(value: string) {
		setAnswers((prev) => {
			const next = [...prev];
			next[activeIndex] = value;
			return next;
		});
	}

	function retryCurrent() {
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
		setRevealedQuestionIds((prev) => {
			const next = new Set(prev);
			next.delete(currentQuestion.id);
			return next;
		});
	}

	return {
		// State
		activeIndex,
		currentQuestion,
		currentAnswer,
		currentResult,
		isRevealed,
		isLoading: loading,
		tabItems,
		isCaseFullyComplete,

		// Actions
		setActiveIndex,
		setAnswer: handleAnswerChange,
		submitAnswer: submitAI,
		revealAnswer: handleReveal,
		submitSelfEvaluation: handleSelfEvaluate,
		retry: retryCurrent,
	};
}
