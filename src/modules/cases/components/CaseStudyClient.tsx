import { Button } from "@/components/ui/button";
import { NavigationTabs } from "@/components/ui/navigation-tabs";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";
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
}: { data: PublicCaseData; env: EnvConfig; activeQuestionIndices: number[] }) {
	const [supabase] = useState<SupabaseClient>(() =>
		createClient(env.supabaseUrl, env.supabaseAnonKey),
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

	async function submit() {
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
				const sorted = [...activeQuestionIndices].sort((a, b) => a - b);
				const nextOrder = sorted.find((o) => o > question.order);
				if (nextOrder !== undefined) {
					const nextIdx = data.questions.findIndex(
						(q) => q.order === nextOrder,
					);
					if (nextIdx >= 0) setActiveIndex(nextIdx);
				}
			} catch (e) {
				console.error(e);
				alert("Resposta da IA inválida.");
			}
		}
		setLoading(false);
	}

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			<CaseVignette
				title="Vignette"
				vignette={data.vignette}
				media={data.media}
			/>

			<NavigationTabs
				items={data.questions.map((q, idx) => ({
					id: q.id,
					label: `Questão ${idx + 1}`,
					disabled: !activeOrdersSet.has(q.order),
				}))}
				activeIndex={activeIndex}
				onChange={(idx) => setActiveIndex(idx)}
			/>

			<div className="flex items-center gap-2">
				{activeQuestionIndices.length > 0 && (
					<span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
						Modo de Revisão: Respondendo {(() => {
							const sorted = [...activeQuestionIndices].sort((a, b) => a - b);
							const currentOrder = data.questions[activeIndex]?.order ?? 0;
							const pos = sorted.indexOf(currentOrder);
							return `${pos >= 0 ? pos + 1 : 0} de ${sorted.length} perguntas pendentes.`;
						})()}
					</span>
				)}
			</div>

			<div className="space-y-4">
				<QuestionDisplay
					text={data.questions[activeIndex].text}
					media={data.questions[activeIndex].media}
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
					placeholder="Resposta..."
					disabled={loading || !!results[activeIndex]}
				/>

				{!results[activeIndex] && (
					<div className="flex items-center gap-4">
						<Button
							onClick={submit}
							loading={loading}
							disabled={!answers[activeIndex]}
						>
							{loading ? "Consultando IA..." : "Enviar Resposta"}
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

				{results[activeIndex] && (
					<FeedbackSection
						isCorrect={!!results[activeIndex]?.isCorrect}
						score={results[activeIndex]?.score ?? 0}
						feedback={results[activeIndex]?.feedback ?? ""}
						officialAnswer={results[activeIndex]?.officialAnswer ?? ""}
						onRetry={() => {
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
						}}
					/>
				)}
			</div>
		</div>
	);
}
