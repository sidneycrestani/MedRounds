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
    const { userAnswer, caseId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Busca dados usando as novas colunas 'questions' e 'answers'
    const { data: caseData, error } = await supabaseClient
      .from("clinical_cases")
      .select("questions, answers")
      .eq("id", caseId)
      .single();

    if (error || !caseData) {
      throw new Error("Caso clínico não encontrado.");
    }

    // Tipagem manual
    const qData = caseData.questions as { vignette: string; question: string };
    const idealAnswer = caseData.answers; // Agora é uma string direta

    const apiKey = Deno.env.get("GEMINI_API_KEY") as string;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Atue como preceptor médico sênior.
      
      CASO CLÍNICO: ${qData.vignette}
      PERGUNTA: ${qData.question}
      GABARITO OFICIAL: ${idealAnswer}
      RESPOSTA DO ALUNO: ${userAnswer}

      Compare a resposta do aluno com o gabarito.
      Retorne JSON:
      {
        "isCorrect": boolean, (considerar correto se acertou o raciocínio clínico principal)
        "score": number, (0-100)
        "feedback": string (Feedback educativo, curto e direto. Não revele o gabarito explicitamente aqui, apenas aponte erros/acertos)
      }
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
        officialAnswer: idealAnswer, // Enviamos o gabarito agora
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
