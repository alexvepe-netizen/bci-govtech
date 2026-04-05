"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ConsultaPage() {
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [fuentes, setFuentes] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);

  // 🔄 HISTORIAL
  useEffect(() => {
    cargarHistorial();
  }, []);

  async function cargarHistorial() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch("/api/historial", {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });

    const data = await res.json();
    setHistorial(data.historial || []);
  }

  // 🔎 CONSULTA
  async function consultar() {
    if (!pregunta.trim()) return;

    setLoading(true);

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

    if (!res.ok) {
      if (data.error === "TRIAL_FINALIZADO") {
        alert("🚫 Tu trial terminó. Suscríbete para continuar.");
        setBloqueado(true);
        return;
      }

      if (data.error === "SIN_ACCESO") {
        alert("🚫 Tu suscripción no está activa.");
        return;
      }
    }

    setRespuesta(data.respuesta);
    setFuentes(data.fuentes || []);

    setLoading(false);
    cargarHistorial();
  }

  // SUSCRIBIRSE
  async function suscribirse() {
    const res = await fetch("/api/pagos/checkout", {
      method: "POST",
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    }
  }


  // 🔐 LOGOUT
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // 📄 EXPORTAR WORD
  async function exportarWord() {
    const res = await fetch("/api/exportar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pregunta,
        respuesta,
        fuentes,
      }),
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "informe.docx";
    a.click();
  }

  // 🧠 SEPARAR RESPUESTA IA
  const texto = respuesta || "";

  // Detecta con o sin emoji
  const parteRespuesta =
    texto.split("FUNDAMENTO:")[0]
         .replace("1️⃣ RESPUESTA:", "")
             .replace("RESPUESTA:", "")
             .trim();

  const parteFundamento =
     texto.split("FUNDAMENTO:")[1]
           ?.split("RECOMENDACIÓN PRÁCTICA:")[0]
        ?.trim() || "";

  const parteRecomendacion =
    texto.split("RECOMENDACIÓN PRÁCTICA:")[1]
        ?.trim() || "";

  return (
    <div style={{ display: "flex" }}>
      
      {/* 🧠 SIDEBAR */}
      <div style={{
        width: 280,
        background: "#0f172a",
        color: "white",
        padding: 20,
        height: "100vh",
        overflowY: "auto"
      }}>
        <h3>📜 Historial</h3>

        {historial.map((h, i) => (
          <div
            key={i}
            onClick={() => {
              setRespuesta(h.respuesta);
              setPregunta(h.pregunta);
            }}
            style={{
              background: "#1e293b",
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
              cursor: "pointer"
            }}
          >
            {h.pregunta.slice(0, 50)}...
          </div>
        ))}
      </div>

      {/* 🧠 MAIN */}
      <div style={{ flex: 1, padding: 30, maxWidth: 1000, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20
        }}>
          <div>
            <h1>🔎 Consulta Jurídica</h1>
            <p style={{ color: "#64748b" }}>
              Plataforma inteligente de compras públicas
            </p>
          </div>

          <button
            onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession();

              const res = await fetch("/api/pagos/checkout", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                  email: session?.user?.email,
                }),
              });

              const data = await res.json();

              if (data.url) {
                window.location.href = data.url;
              }
            }}
            style={{
              marginTop: 10,
              background: "#22c55e",
              color: "white",
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            💎 Suscribirse a Premium
          </button>

          <button
            onClick={logout}
            style={{
              background: "#ef4444",
              color: "white",
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              marginLeft: 10,
            }}
          >
            Cerrar sesión
          </button>
        </div>

        {/* INPUT */}
        <textarea
          value={pregunta}
          disabled={bloqueado}
          onChange={(e) => setPregunta(e.target.value)}
          style={{
            width: "100%",
            height: 120,
            padding: 15,
            borderRadius: 10,
            border: "1px solid #ccc",
          }}
        />

        <br /><br />

        <button
          onClick={consultar}
          disabled={bloqueado}
          style={{
            background: "#0f172a",
            color: "white",
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            cursor: bloqueado ? "not-allowed" : "pointer",
            opacity: bloqueado ? 0.5 : 1
          }}
        >
          {loading ? "Consultando..." : "Consultar"}
        </button>

        {/* RESULTADO */}
        {respuesta && (
          <div style={{ marginTop: 30 }}>

            {/* 🧠 INFORME */}
            <div style={{
              background: "#0f172a",
              color: "white",
              padding: 20,
              borderRadius: 12,
              marginBottom: 20,
              lineHeight: 1.6,
              fontSize: 14,
              maxHeight: 320,
              overflowY: "auto"
            }}>

              <h3>📌 Respuesta</h3>
              <p>{parteRespuesta}</p>

              <h3 style={{ marginTop: 15 }}>📚 Fundamento</h3>
              <p>{parteFundamento}</p>

              <h3 style={{ marginTop: 15 }}>🛠 Recomendación práctica</h3>
              <p>{parteRecomendacion}</p>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `RESPUESTA:\n${parteRespuesta}\n\nFUNDAMENTO:\n${parteFundamento}\n\nRECOMENDACIÓN:\n${parteRecomendacion}`
                  );
                  alert("Informe copiado");
                }}
                style={{
                  marginTop: 10,
                  background: "#22c55e",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Copiar informe
              </button>

              <button
                onClick={exportarWord}
                style={{
                  marginLeft: 10,
                  background: "#2563eb",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Exportar Word
              </button>

            </div>

            {/* 🔗 FUENTES */}
            <div>
              <h2>🔗 Fuentes</h2>

              {fuentes.map((f, i) => (
                <div key={i} style={{
                  border: "1px solid #ccc",
                  padding: 15,
                  borderRadius: 10,
                  marginBottom: 10
                }}>
                  <strong>{f.norma}</strong>
                  <div>{f.fuente}</div>
                  {f.articulo && <div>Artículo: {f.articulo}</div>}
                  {f.resumen && <div>{f.resumen}</div>}

                  {f.url && (
                    <a href={f.url} target="_blank">
                      Ver fuente →
                    </a>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}