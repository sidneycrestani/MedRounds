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
}: { data: PublicCaseData; env: EnvConfig }) {
	const [supabase] = useState<SupabaseClient>(() =>
		createClient(env.supabaseUrl, env.supabaseAnonKey),
	);

	const [activeIndex, setActiveIndex] = useState(0);
	const [answers, setAnswers] = useState<string[]>(() =>
		Array.from({ length: data.questions.length }, () => ""),
	);
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<(ResultData | null)[]>(() =>
		Array.from({ length: data.questions.length }, () => null),
	);

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
					disabled: idx > 0 && !results[idx - 1],
				}))}
				activeIndex={activeIndex}
				onChange={(idx) => setActiveIndex(idx)}
			/>

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
