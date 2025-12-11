import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", {
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers":
					"authorization, x-client-info, apikey, content-type",
			},
		});
	}

    try {
        const { userAnswer, questionId } = await req.json();

		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
		);

        // 1. Busca dados normalizados: pergunta específica + caso pai
        const { data: questionRow, error: qErr } = await supabaseClient
            .from("case_questions")
            .select(
                "id, case_id, question_text, correct_answer_text, must_include_keywords, context_image_url",
            )
            .eq("id", questionId)
            .single();

        if (qErr || !questionRow) {
            throw new Error("Pergunta não encontrada.");
        }

        const { data: caseRow, error: cErr } = await supabaseClient
            .from("clinical_cases")
            .select("id, vignette, main_image_url")
            .eq("id", questionRow.case_id)
            .single();

        if (cErr || !caseRow) {
            throw new Error("Caso clínico não encontrado.");
        }

		const apiKey = Deno.env.get("GEMINI_API_KEY") as string;
		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const keywords = (questionRow.must_include_keywords ?? []) as string[];
        const idealAnswer = questionRow.correct_answer_text as string;

        const prompt = `
      ATUE COMO: Preceptor Médico Sênior.

      CONTEXTO DO CASO: ${caseRow.vignette}
      PERGUNTA ESPECÍFICA: ${questionRow.question_text}

      RESPOSTA DO ALUNO: ${userAnswer}

      GABARITO OFICIAL: ${idealAnswer}

      CRITÉRIOS DE AVALIAÇÃO OBRIGATÓRIOS (KEYWORDS): O aluno PRECISA ter mencionado conceitos similares a: ${keywords.join(", ")}.
      Se a imagem (${questionRow.context_image_url || caseRow.main_image_url || ""}) for crucial, verifique se houve análise do achado visual.

      INSTRUÇÃO:
      1. Se o aluno acertou a ideia geral mas esqueceu as keywords acima, dê nota parcial e alerte sobre a terminologia.
      2. Caso o raciocínio esteja incorreto, explique brevemente o ponto-chave que faltou.
      3. Produza JSON com os campos: isCorrect (boolean), score (0-100), feedback (string). Não revele o gabarito completo no feedback.
    `;

		const result = await model.generateContent(prompt);
		const textResp = result.response
			.text()
			.replace(/```json|```/g, "")
			.trim();
		const aiPayload = JSON.parse(textResp);

		// 2. Retorna o feedback da IA + O Gabarito Oficial para o frontend exibir
        return new Response(
            JSON.stringify({
                ...aiPayload,
                officialAnswer: idealAnswer,
            }),
            {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            },
        );
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), {
			status: 500,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	}
});
