import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export async function POST(req) {
  try {
    const body = await req.json();
    const { query } = body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization") || "",
          },
        },
      }
    );

    // 🔐 Usuario
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
      });
    }

    // 📊 Suscripción
    const { data: sub } = await supabase
      .schema("core")
      .from("suscripciones")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!sub || sub.estado !== "activo") {
      return new Response(JSON.stringify({ error: "Sin acceso" }), {
        status: 403,
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 🔎 EMBEDDING
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const vector = embeddingResponse.data[0].embedding;

    // 🔎 RAG - Supabase
    const { data: docs, error } = await supabase.rpc("match_documents", {
      query_embedding: vector,
      match_count: 5,
    });

    if (error) {
      console.error(error);
    }

    if (!docs || docs.length === 0) {
      return new Response(
        JSON.stringify({
          respuesta:
            "No se encontró información suficiente en la base de datos.",
        }),
        { status: 200 }
      );
    }

    // 🧠 CONTEXTO
    const contexto = docs
      .map(
        (d, i) => `
Documento ${i + 1}:
${d.texto}
`
      )
      .join("\n");

    // 🤖 IA (solo niveles 1 y 2)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un abogado experto en compras públicas en Chile.

Debes responder SOLO en este formato:

RESPUESTA CLARA:
...

CONTEXTO:
...

No agregues fuentes.
No inventes información.
Usa solo el contexto.`,
        },
        {
          role: "user",
          content: `Pregunta:
${query}

Contexto:
${contexto}`,
        },
      ],
    });

    const respuestaIA = completion.choices[0].message.content;

    // ✂️ Separar niveles IA
    const parte1 = respuestaIA
      .split("CONTEXTO:")[0]
      .replace("RESPUESTA CLARA:", "")
      .trim();

    const parte2 = respuestaIA.split("CONTEXTO:")[1]?.trim() || "";

    // 📚 NIVEL 3 (Supabase real)
    const fuentes = docs
      .map(
        (d, i) => `
Fuente ${i + 1}:
Norma: ${d.norma}
Fuente: ${d.fuente}
Resumen: ${d.resumen || "Sin resumen disponible"}
`
      )
      .join("\n");

    // 🧾 RESPUESTA FINAL (FORMATO PRO)
    const respuestaFinal = `
1️⃣ RESPUESTA CLARA:
${parte1}

2️⃣ CONTEXTO:
${parte2}

3️⃣ FUENTES:
${fuentes}
`;

    return new Response(
      JSON.stringify({
        respuesta: respuestaFinal,
        documentos: docs,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
    });
  }
}