// api/create-stripe.js

const { kv } = require("@vercel/kv");
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    // Vercel peut envoyer le body en string
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error("JSON parse error:", e);
      }
    }

    const { dream, emotion, context } = body || {};

    if (!dream || !emotion) {
      return res.status(400).json({
        success: false,
        error: "Please describe your dream and your emotion.",
      });
    }

    // ID très sécurisé pour ce rêve
    const crypto = require("crypto");
    const id = crypto.randomBytes(18).toString("hex");
    const kvKeyData = `dream:${id}:data`;

    // Stocker le rêve dans KV (3 jours)
    await kv.set(
      kvKeyData,
      {
        dream,
        emotion,
        context: context || "",
      },
      { ex: 259200 } // 3 jours
    );

    const origin = req.headers.origin || "https://thedreamrevelator.com";

    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 399, // $3.99 = 399 cents
            product_data: {
              name: "Dream Interpretation",
              description: "One symbolic dream reading based on your submission.",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/result.html?id=${id}`,
      cancel_url: `${origin}/interpret.html?canceled=1`,
    });

    return res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Error in create-stripe:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

