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

    // 📊 SUSCRIPCIÓN + TRIAL
    let { data: sub, error: subError } = await supabase
      .schema("core")
      .from("suscripciones")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) {
      console.error("Error suscripción:", subError);
    }

    // 🆕 Si no existe → crear trial automático
    if (!sub) {
      const ahora = new Date();
      const fin = new Date();
      fin.setDate(fin.getDate() + 7);

      const { data: nuevaSub } = await supabase
        .schema("core")
        .from("suscripciones")
        .insert({
          user_id: user.id,
          plan: "free",
          consultas_usadas: 0,
          trial_inicio: ahora.toISOString(),
          trial_fin: fin.toISOString(),
          estado: "trial",
        })
        .select()
        .single();

      sub = nuevaSub;
    }

    // 🧠 VALIDACIÓN
    const ahora = new Date();
    const finTrial = sub.trial_fin ? new Date(sub.trial_fin) : null;

    // 🔴 CASO: FREE
    if (sub.plan === "free") {
      if (!finTrial || ahora > finTrial || (sub.consultas_usadas || 0) >= 5) {
        return new Response(
          JSON.stringify({
            error: "TRIAL_FINALIZADO",
            mensaje: "Tu periodo gratuito ha finalizado. Suscríbete para continuar.",
          }),
          { status: 403 }
        );
      }
    }

    // 🔵 CASO: PREMIUM
    if (sub.plan === "premium" && sub.estado !== "activo") {
      return new Response(
        JSON.stringify({
          error: "SIN_ACCESO",
          mensaje: "Tu suscripción no está activa.",
        }),
        { status: 403 }
      );
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

    // 🔎 RAG
    const { data: docs, error } = await supabase
      .schema("core")
      .rpc("match_documents", {
        query_embedding: vector,
        match_count: 8,
      });

    if (error) {
      console.error(error);
      throw new Error("Error en RAG");
    }

    if (!docs || docs.length === 0) {
      return new Response(
        JSON.stringify({
          respuesta: "No se encontró información suficiente en la base jurídica.",
          fuentes: [],
        }),
        { status: 200 }
      );
    }

    // 🧠 CONTEXTO
    const contexto = docs
      .map(
        (d, i) => `
Documento ${i + 1}:
Norma: ${d.norma}
Fuente: ${d.fuente}
Artículo: ${d.articulo || "No especificado"}
Resumen: ${d.resumen || "No disponible"}

Contenido:
${d.texto}
`
      )
      .join("\n");

    // 🤖 IA
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `Eres un abogado experto en compras públicas en Chile.

Debes responder SIEMPRE en este formato exacto:

RESPUESTA:
Texto claro y directo (máx 5 líneas)

FUNDAMENTO:
Explicación jurídica basada en normativa

RECOMENDACIÓN PRÁCTICA:
Pasos concretos aplicables

REGLAS:
- NO usar emojis
- NO usar ###
- NO cambiar los títulos
- NO agregar secciones adicionales
- NO repetir títulos
- NO incluir "CONTEXTO NORMATIVO"
- SOLO usar RESPUESTA, FUNDAMENTO y RECOMENDACIÓN PRÁCTICA

`,
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

    const respuestaIA = completion.choices?.[0]?.message?.content || "";

    if (!respuestaIA) {
      throw new Error("OpenAI no devolvió respuesta");
    }

    // ✂️ SEPARAR RESPUESTA


    // 📚 FUENTES
    const fuentes = docs.map((d, i) => ({
      numero: i + 1,
      norma: d.norma,
      fuente: d.fuente,
      articulo: d.articulo,
      resumen: d.resumen,
      url: d.url || null,
    }));

    // 🧾 RESPUESTA FINAL
   const respuestaFinal = respuestaIA;

    // 💾 GUARDAR HISTORIAL
    const { error: insertError } = await supabase
      .schema("core")
      .from("historial_consultas")
      .insert({
        user_id: user.id,
        pregunta: query,
        respuesta: respuestaFinal,
      });

    if (insertError) {
      console.error("Error guardando historial:", insertError);
    }

    // ➕ SUMAR USO SOLO SI TODO OK
    let updateError = null;

    if (!insertError) {
      const res = await supabase
        .schema("core")
        .from("suscripciones")
        .update({
          consultas_usadas: ((sub?.consultas_usadas) || 0) + 1,
        })
        .eq("user_id", user.id);

      updateError = res.error;

      if (updateError) {
        console.error("Error actualizando uso:", updateError);
      }
    }

    // 🧠 LOG PRO
    console.log({
      historial: insertError ? "ERROR" : "OK",
      uso: updateError ? "ERROR" : "OK",
    });

    // 📤 RESPUESTA
    return new Response(
      JSON.stringify({
        respuesta: respuestaFinal,
        documentos: docs,
        fuentes,
      }),
      { status: 200 }
    );

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500 }
    );
  }
}