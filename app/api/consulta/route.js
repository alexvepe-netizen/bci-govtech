import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { pregunta } = await req.json();

    // 🔹 1. embedding
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: pregunta,
    });

    const vector = emb.data[0].embedding;

    // 🔹 2. búsqueda
    const { data } = await supabase
      .schema("core")
      .rpc("match_documents", {
        query_embedding: vector,
        match_count: 5,
      });

    // 🔹 3. contexto
    const contexto = data.map(d => `
Fuente: ${d.fuente}
Norma: ${d.norma}
Capítulo: ${d.capitulo}
Artículo: ${d.articulo}
Texto: ${d.texto}
`).join("\n---\n");

    // 🔹 4. prompt
    const prompt = `
Actúa como experto en compras públicas en Chile.

Responde en 3 partes:

1. Resumen claro
2. Fundamento legal con citas específicas
3. Fuentes separadas

Reglas:
- No inventar normativa
- Si hay duda, indicarlo
- Usa SOLO el contexto

Contexto:
${contexto}

Pregunta:
${pregunta}
`;

    // 🔹 5. IA
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "Eres experto en compras públicas en Chile." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
    });

    return Response.json({
      respuesta: completion.choices[0].message.content,
    });

  } catch (err) {
    console.error(err);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}