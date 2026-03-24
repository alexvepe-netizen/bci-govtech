"use client";

import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);

  const enviar = async () => {
    setLoading(true);

    try {
      const res = await axios.post("/api/consulta", { pregunta });
      setRespuesta(res.data.respuesta);
    } catch (error) {
      setRespuesta("Error al consultar");
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 40, maxWidth: 800, margin: "auto" }}>
      <h1>🧠 BCI GovTech</h1>

      <textarea
        value={pregunta}
        onChange={(e) => setPregunta(e.target.value)}
        placeholder="Ej: ¿Se puede renovar un contrato?"
        style={{ width: "100%", height: 100 }}
      />

      <button onClick={enviar} style={{ marginTop: 10 }}>
        Consultar
      </button>

      {loading && <p>Consultando...</p>}

      <pre style={{ marginTop: 20, whiteSpace: "pre-wrap" }}>
        {respuesta}
      </pre>
    </div>
  );
}