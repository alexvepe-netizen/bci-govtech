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

      const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: email,
      line_items: [
        {
          price: "price_xxx",
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/consulta`,
      cancel_url: `${baseUrl}/consulta`,
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