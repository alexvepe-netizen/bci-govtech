import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email requerido" }), { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],

      mode: "subscription", // 🔥 importante

      customer_email: email,

      line_items: [
        {
          price_data: {
            currency: "clp",
            product_data: {
              name: "Plan Premium - Biblioteca Compras",
            },
            unit_amount: 9990, // 👉 $9.990 CLP mensual
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],

      success_url: "http://localhost:3000/consulta?pago=ok",
      cancel_url: "http://localhost:3000/consulta?pago=cancelado",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Error creando pago" }), {
      status: 500,
    });
  }
}