import { createClient } from "@supabase/supabase-js";

export async function GET(req) {
  try {
    // 🔐 Cliente con token
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

    // 🔎 Usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Error user:", userError);
    }

    if (!user) {
      console.log("❌ No hay usuario autenticado");
      return new Response(JSON.stringify({ historial: [] }), {
        status: 200,
      });
    }

    // 📊 Consulta historial
    const { data, error } = await supabase
      .schema("core")
      .from("historial_consultas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error historial:", error);
      return new Response(JSON.stringify({ historial: [] }), {
        status: 200,
      });
    }

    console.log("✅ Historial encontrado:", data?.length || 0);

    return new Response(
      JSON.stringify({
        historial: data || [],
      }),
      { status: 200 }
    );

  } catch (err) {
    console.error("🔥 ERROR GENERAL HISTORIAL:", err);

    return new Response(
      JSON.stringify({
        historial: [],
        error: "Error interno historial",
      }),
      { status: 500 }
    );
  }
}