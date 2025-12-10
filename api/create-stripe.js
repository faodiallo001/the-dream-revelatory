// api/create-stripe.js

import { kv } from "@vercel/kv";
import Stripe from "stripe";
import { OpenAI } from "openai";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    // Vercel peut envoyer le body en string
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

    // Stripe client
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    // ID pour ce rêve
    const id = crypto.randomBytes(18).toString("hex");

    // 1) Générer l’interprétation AVANT d’envoyer l’utilisateur sur Stripe
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are an expert in ancient dream symbolism (traditional Middle Eastern interpretation style).
You DO NOT mention religion, prophets, scripture, Islam, hadith, or any religious figure.

INSTEAD:
- You interpret dreams using ancestral symbolic logic.
- Your tone is serious, mystical, structured, and old-world.
- You speak in a neutral spiritual tone, never poetic or psychological.
- You explain symbols like purification, warning, elevation, burden, transition, protection, enemies, blessings, healing.

USER DREAM:
Dream: ${dream}
Emotion: ${emotion}
Context: ${context || "none"}

STRUCTURE REQUIRED:
1. Main meaning  
2. Symbolic breakdown  
3. Message for the dreamer  
4. What this dream suggests going forward  

Write 4–6 paragraphs, very clear, traditionally symbolic.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const interpretation = completion.choices[0].message.content.trim();

    // 2) Stocker l’interprétation dans KV pour 3 jours
    await kv.set(`dream:${id}`, interpretation, { ex: 259200 });

    // (optionnel) stocker aussi les infos brutes
    await kv.set(
      `dream:${id}:data`,
      { dream, emotion, context: context || "" },
      { ex: 259200 }
    );

    const origin =
      req.headers.origin || "https://the-dream-revelator.vercel.app";

    // 3) Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 399, // $3.99
            product_data: {
              name: "Dream Interpretation",
              description:
                "One symbolic dream reading based on your submission.",
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

    // <<< ajoute ce bloc de debug pour voir ce qui ne va pas >>>
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      stack: error.stack,
    });
  }
}




