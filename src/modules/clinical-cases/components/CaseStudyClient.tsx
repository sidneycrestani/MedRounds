import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { BookOpen, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

interface ResultData {
	isCorrect: boolean;
	feedback: string;
	score: number;
	officialAnswer: string;
}

interface EnvConfig {
	supabaseUrl: string;
	supabaseAnonKey: string;
}

export default function CaseStudyClient({
	data,
	env,
}: {
	data: PublicCaseData;
	env: EnvConfig;
}) {
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
			setResults((prev) => {
				const next = [...prev];
				next[activeIndex] = responseData as ResultData;
				return next;
			});
		}
		setLoading(false);
	}

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			<div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
				<h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
					<BookOpen className="w-5 h-5" />
					Vignette
				</h3>
				<p className="text-blue-800 text-lg font-medium leading-relaxed">
					{data.vignette}
				</p>
				{data.media && (
					<img
						src={data.media}
						alt="Imagem principal do caso"
						className="mt-4 rounded-lg border"
					/>
				)}
			</div>

			<div className="flex gap-2 overflow-x-auto">
				{data.questions.map((q, idx) => {
					const disabled = idx > 0 && !results[idx - 1];
					const isActive = activeIndex === idx;
					return (
						<button
							key={q.id}
							type="button"
							onClick={() => !disabled && setActiveIndex(idx)}
							className={`px-3 py-2 rounded-lg text-sm font-medium border ${
								isActive
									? "bg-black text-white border-black"
									: "bg-white text-gray-700 border-gray-300"
							} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
						>
							{`Questão ${idx + 1}`}
						</button>
					);
				})}
			</div>

			<div className="space-y-4">
				<div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
					<h4 className="font-bold text-gray-900 mb-2">Enunciado específico</h4>
					<p className="text-gray-800 leading-relaxed">
						{data.questions[activeIndex].text}
					</p>
					{data.questions[activeIndex].media && (
						<img
							src={data.questions[activeIndex].media}
							alt="Imagem da questão"
							className="mt-4 rounded-lg border"
						/>
					)}
				</div>

				<div className="relative">
					<textarea
						className="w-full min-h-[200px] border border-gray-300 rounded-xl p-5 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm resize-y transition-all"
						value={answers[activeIndex]}
						onChange={(e) =>
							setAnswers((prev) => {
								const next = [...prev];
								next[activeIndex] = e.target.value;
								return next;
							})
						}
						placeholder="Resposta..."
						disabled={loading || !!results[activeIndex]}
					/>
					<div className="absolute bottom-4 right-4 text-xs text-gray-400 pointer-events-none">
						{answers[activeIndex].length} caracteres
					</div>
				</div>

				{!results[activeIndex] && (
					<div className="flex items-center gap-4">
						<button
							type="button"
							className="px-8 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md"
							onClick={submit}
							disabled={loading || !answers[activeIndex]}
						>
							{loading ? "Consultando IA..." : "Enviar Resposta"}
						</button>
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
					<div className="space-y-6">
						<div
							className={`border rounded-xl p-6 shadow-sm ${results[activeIndex]?.isCorrect ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}
						>
							<div className="flex justify-between items-start mb-4">
								<div className="flex items-center gap-3">
									{results[activeIndex]?.isCorrect ? (
										<CheckCircle2 className="w-8 h-8 text-green-600" />
									) : (
										<XCircle className="w-8 h-8 text-orange-600" />
									)}
									<div>
										<h4
											className={`text-lg font-bold ${results[activeIndex]?.isCorrect ? "text-green-800" : "text-orange-800"}`}
										>
											{results[activeIndex]?.isCorrect
												? "Conduta Adequada"
												: "Pontos de Atenção"}
										</h4>
										<span className="text-sm text-gray-500">
											Nota: {results[activeIndex]?.score}/100
										</span>
									</div>
								</div>
							</div>
							<div className="text-gray-800 leading-relaxed whitespace-pre-line pl-11">
								{results[activeIndex]?.feedback}
							</div>
						</div>

						<div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
							<h4 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">
								Gabarito / Resposta Ideal
							</h4>
							<div className="prose prose-sm max-w-none text-gray-800 bg-white p-4 rounded border border-gray-200">
								<ReactMarkdown remarkPlugins={[remarkGfm]}>
									{results[activeIndex]?.officialAnswer ?? ""}
								</ReactMarkdown>
							</div>

							<button
								type="button"
								onClick={() => {
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
								className="mt-4 text-sm text-gray-500 hover:text-black underline"
							>
								Refazer esta questão
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
