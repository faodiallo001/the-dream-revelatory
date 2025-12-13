import mercadopago from "mercadopago";
import crypto from "crypto";
import { kv } from "@vercel/kv";

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { dream, emotion, context, name } = req.body;

  if (!dream || !emotion) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const id = crypto.randomBytes(18).toString("hex");

  // stocker les données du rêve (comme Stripe)
  await kv.set(
    `dream:${id}:data`,
    { dream, emotion, context: context || "", name: name || "" },
    { ex: 259200 }
  );

  const preference = {
    items: [
      {
        title: "Dream Interpretation",
        quantity: 1,
        currency_id: "BRL",
        unit_price: 20,
      },
    ],
    payment_methods: {
      excluded_payment_types: [{ id: "credit_card" }],
      installments: 1,
    },
    back_urls: {
      success: `${process.env.SITE_URL}/result.html?id=${id}`,
      failure: `${process.env.SITE_URL}/interpret.html?error=1`,
    },
    auto_return: "approved",
  };

  const response = await mercadopago.preferences.create(preference);

  return res.status(200).json({
    init_point: response.body.init_point,
  });
}
