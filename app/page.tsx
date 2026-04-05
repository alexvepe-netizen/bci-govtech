"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      window.location.href = "/consulta";
    }
  }

  async function login() {
    if (!email.trim()) return;

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "http://localhost:3000",
      },
    });

    if (error) {
      alert("❌ " + error.message);
    } else {
      alert("📩 Revisa tu correo para ingresar");
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          padding: 40,
          borderRadius: 16,
          width: 400,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          color: "white",
        }}
      >
        {/* HEADER */}
        <h1 style={{ marginBottom: 10 }}>
          ⚖️ GovTech Jurídico
        </h1>

        <p style={{ color: "#94a3b8", marginBottom: 30 }}>
          Plataforma inteligente de compras públicas
        </p>

        {/* INPUT */}
        <input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "none",
            marginBottom: 20,
            fontSize: 14,
          }}
        />

        {/* BUTTON */}
        <button
          onClick={login}
          disabled={loading}
          style={{
            width: "100%",
            background: "#22c55e",
            color: "white",
            padding: 12,
            borderRadius: 8,
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading ? "Enviando..." : "Ingresar con Magic Link"}
        </button>

        {/* FOOTER */}
        <p style={{ marginTop: 20, fontSize: 12, color: "#64748b" }}>
          Acceso exclusivo para usuarios autorizados
        </p>
      </div>
    </div>
  );
}