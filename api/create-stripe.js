import { kv } from "@vercel/kv";
import Stripe from "stripe";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const { dream, emotion, context } = body || {};

    if (!dream || !emotion) {
      return res.status(400).json({
        success: false,
        error: "Please describe your dream and your emotion.",
      });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    const id = crypto.randomBytes(18).toString("hex");

    // Store dream info
    await kv.set(`dream:${id}:data`, { dream, emotion, context: context || "" }, { ex: 259200 });

    const origin = req.headers.origin || "https://the-dream-revelator.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 399,
            product_data: {
              name: "Dream Interpretation",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/result.html?id=${id}`,
      cancel_url: `${origin}/interpret.html?canceled=1`,
    });

    return res.status(200).json({ success: true, url: session.url });

  } catch (error) {
    console.error("Error in create-stripe:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}


