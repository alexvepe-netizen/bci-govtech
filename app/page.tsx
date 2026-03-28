"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [acceso, setAcceso] = useState(false);

  useEffect(() => {
    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      () => checkUser()
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUser(null);
      setAcceso(false);
      setLoading(false);
      return;
    }

    setUser(user);

    const { data } = await supabase
      .schema("core")
      .from("suscripciones")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data?.estado === "activo") {
      setAcceso(true);
    } else {
      setAcceso(false);
    }

    setLoading(false);
  }

  async function login() {
    await supabase.auth.signInWithOtp({ email });
    alert("Revisa tu correo para iniciar sesión");
  }

  async function logout() {
    await supabase.auth.signOut();
    location.reload();
  }

  if (loading) return <p>Cargando...</p>;

  // 🔐 LOGIN
  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Iniciar sesión</h2>

        <input
          type="email"
          placeholder="tu correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button onClick={login}>Ingresar</button>
      </div>
    );
  }

  // 🚫 SIN ACCESO
  if (!acceso) {
    return (
      <div style={{ padding: 20 }}>
        <p>🚫 No tienes acceso. Suscripción inactiva.</p>
        <button onClick={logout}>Cerrar sesión</button>
      </div>
    );
  }

  // ✅ ACCESO OK
  return (
    <div style={{ padding: 20 }}>
      <h1>✅ Bienvenido</h1>
      <p>{user.email}</p>

      <button onClick={() => (window.location.href = "/consulta")}>
        Ir a Consultar
      </button>

      <br /><br />

      <button onClick={logout}>Cerrar sesión</button>
    </div>
  );
}