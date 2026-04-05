import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Error webhook:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 🔌 Conectar Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // 🔥 IMPORTANTE (no usar anon)
  );

  // 🎯 EVENTO CLAVE: pago exitoso
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // 👉 email del usuario que pagó
    const email = session.customer_details?.email;

    if (!email) {
      console.error("No hay email en sesión");
      return new Response("No email", { status: 400 });
    }

    // 🔍 Buscar usuario en Supabase
    const { data: users, error: userError } =
      await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("Error buscando usuario:", userError);
      return new Response("Error usuario", { status: 500 });
    }

    const user = users.users.find((u) => u.email === email);

    if (!user) {
      console.error("Usuario no encontrado:", email);
      return new Response("Usuario no encontrado", { status: 404 });
    }

    // 🔥 ACTIVAR PREMIUM
    const { error: updateError } = await supabase
      .schema("core")
      .from("suscripciones")
      .update({
        plan: "premium",
        estado: "activo",
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error actualizando suscripción:", updateError);
      return new Response("Error actualización", { status: 500 });
    }

    console.log("✅ Usuario actualizado a PREMIUM:", email);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}