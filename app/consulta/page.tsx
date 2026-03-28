"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ConsultaPage() {
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);

  async function consultar() {
    setLoading(true);
    setRespuesta("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch("/api/consulta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ query: pregunta }),
    });

    const data = await res.json();

    if (data.error) {
      setRespuesta("❌ " + data.error);
    } else {
      setRespuesta(data.respuesta);
    }

    setLoading(false);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>🔎 Consulta jurídica</h1>

      <textarea
        placeholder="Escribe tu consulta..."
        value={pregunta}
        onChange={(e) => setPregunta(e.target.value)}
        style={{ width: "100%", height: 120 }}
      />

      <br /><br />

      <button onClick={consultar} disabled={loading}>
        {loading ? "Consultando..." : "Consultar"}
      </button>

      <br /><br />

      {respuesta && (
        <div>
          <h3>Respuesta:</h3>
          <p>{respuesta}</p>
        </div>
      )}
    </div>
  );
}