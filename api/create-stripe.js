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

    // ✅ On récupère aussi name
    const { dream, emotion, context, name } = body || {};

    if (!dream || !emotion) {
      return res.status(400).json({
        success: false,
        error: "Please describe your dream and your emotion.",
      });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    // ID pour ce rêve
    const id = crypto.randomBytes(18).toString("hex");

    // ✅ OpenAI – même langue que le rêve + prénom
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You will read the user's dream and respond in the SAME LANGUAGE the dream is written in
(French, English, Portuguese, Spanish, etc.). Detect the language and use it consistently.

If a name is provided, address the dreamer by that name once at the beginning
and once later in the message, in a natural way. If no name is provided,
do not invent any name.

ROLE & STYLE:
- You are an expert in ancient dream symbolism (traditional Middle Eastern interpretation style).
- You DO NOT mention religion, prophets, scripture, Islam, Bible, hadith, angels,
  or any religious figure.
- You interpret dreams using ancestral symbolic logic only.
- Your tone is serious, mystical, structured, and old-world, never psychological and never poetic.
- You explain symbols through ideas like purification, warning, elevation, burden,
  transition, protection, enemies, blessings, healing, destiny, trials.

USER INPUT:
Name: ${name || "None"}
Dream: ${dream}
Emotion: ${emotion}
Context: ${context || "None"}

STRUCTURE REQUIRED (titles translated into the same language as the dream):
1. Main meaning  
2. Symbolic breakdown  
3. Message for the dreamer  
4. What this dream suggests going forward  

Write 4–6 paragraphs, clear and traditionally symbolic, fully in the same language
as the dream above.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const interpretation = completion.choices[0].message.content.trim();

    // ✅ On stocke l'interprétation dans KV
    await kv.set(`dream:${id}`, interpretation, { ex: 259200 });

    // (optionnel) aussi les données brutes
    await kv.set(
      `dream:${id}:data`,
      { dream, emotion, context: context || "", name: name || "" },
      { ex: 259200 }
    );

    const origin =
      req.headers.origin || "https://the-dream-revelator.vercel.app";

    // Stripe checkout
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
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}




