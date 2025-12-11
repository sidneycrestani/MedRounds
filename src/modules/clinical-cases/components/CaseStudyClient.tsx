import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { BookOpen, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PublicCaseData {
	id: string;
	questionText: string;
	prevId: string | null;
	nextId: string | null;
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

	const [answer, setAnswer] = useState("");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<ResultData | null>(null);

	async function submit() {
		if (!answer.trim()) return;
		setLoading(true);
		setResult(null);

		const { data: responseData, error } = await supabase.functions.invoke(
			"check-answer",
			{
				body: { caseId: data.id, userAnswer: answer },
			},
		);

		if (error) {
			console.error(error);
			alert("Erro ao corrigir. Tente novamente.");
		} else {
			setResult(responseData);
		}
		setLoading(false);
	}

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			<div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
				<h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
					<BookOpen className="w-5 h-5" />
					Enunciado:
				</h3>
				<p className="text-blue-800 text-lg font-medium leading-relaxed">
					{data.questionText}
				</p>
			</div>

			<div className="relative">
				<textarea
					className="w-full min-h-[200px] border border-gray-300 rounded-xl p-5 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm resize-y transition-all"
					value={answer}
					onChange={(e) => setAnswer(e.target.value)}
					placeholder="Resposta..."
					disabled={loading || !!result}
				/>
				<div className="absolute bottom-4 right-4 text-xs text-gray-400 pointer-events-none">
					{answer.length} caracteres
				</div>
			</div>

			{!result && (
				<div className="flex items-center gap-4">
					<button
						className="px-8 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md"
						onClick={submit}
						disabled={loading || !answer}
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

			{result && (
				<div className="space-y-6">
					<div
						className={`border rounded-xl p-6 shadow-sm ${result.isCorrect ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}
					>
						<div className="flex justify-between items-start mb-4">
							<div className="flex items-center gap-3">
								{result.isCorrect ? (
									<CheckCircle2 className="w-8 h-8 text-green-600" />
								) : (
									<XCircle className="w-8 h-8 text-orange-600" />
								)}
								<div>
									<h4
										className={`text-lg font-bold ${result.isCorrect ? "text-green-800" : "text-orange-800"}`}
									>
										{result.isCorrect
											? "Conduta Adequada"
											: "Pontos de Atenção"}
									</h4>
									<span className="text-sm text-gray-500">
										Nota: {result.score}/100
									</span>
								</div>
							</div>
						</div>
						<div className="text-gray-800 leading-relaxed whitespace-pre-line pl-11">
							{result.feedback}
						</div>
					</div>

					<div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
						<h4 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">
							Gabarito / Resposta Ideal
						</h4>
						<div className="prose prose-sm max-w-none text-gray-800 bg-white p-4 rounded border border-gray-200">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>
								{result.officialAnswer}
							</ReactMarkdown>
						</div>

						<button
							onClick={() => {
								setResult(null);
								setAnswer("");
							}}
							className="mt-4 text-sm text-gray-500 hover:text-black underline"
						>
							Tentar outro caso ou refazer
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
