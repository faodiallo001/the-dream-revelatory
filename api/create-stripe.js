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
    // Body peut arriver en string via Vercel
    let body = req.body;
    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    // ➜ On récupère aussi le nom
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

    // ID ultra sécurisé
    const id = crypto.randomBytes(18).toString("hex");

    // ➜ OPENAI — Interprétation selon la tradition islamique ancienne (sans religion)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You will interpret the user's dream using the symbolic system found in ancient
Middle Eastern and Islamic-era dream interpretation texts — BUT without mentioning
religion, scripture, prophets, or any religious authority.

Do NOT use or mention the words Islam, Muslim, Quran, Bible, Hadith, angels,
or any prophet's name.

LANGUAGE:
Write the entire interpretation in the SAME LANGUAGE the dream was written in
(French, English, Portuguese, Spanish, etc.). Detect the language automatically.

USING THE NAME:
If a name is provided, address the dreamer by name once at the beginning and
once later in the message, in a natural way. If no name is provided, do not
invent or mention any name.

TRADITIONAL SYMBOLIC RULES YOU MUST APPLY:
- Defecation or urination = release of burdens, financial gain, or end of obstacles.
- Snakes = hidden enemies, jealousy, or threats.
- Clear water = blessings, ease, purity.
- Dirty water = confusion, problems.
- Falling = loss or vulnerability.
- Flying = elevation, status rise, breakthrough.
- Children = responsibilities, burdens, worries, or innocence.
- Houses = stability, family matters, internal state.
- Clothes = reputation, public image, self-protection.
- Darkness = confusion, fear, hidden matters.
- Light = clarity, guidance, relief.
- Markets = money, business, opportunities.
Use these symbolic meanings exactly as classical interpretations describe.

TONE:
- Serious, old-world, structured.
- Not poetic, not psychological coaching.
- Clear traditional symbolism.

USER INPUT:
Name: ${name || "None"}
Dream: ${dream}
Emotion: ${emotion}
Context: ${context || "None"}

STRUCTURE REQUIRED (titles in the same language as the dream):
1. Main meaning  
2. Symbolic breakdown  
3. Message for the dreamer  
4. What this dream suggests going forward  

Write 4–6 paragraphs, fully in the same language used by the dreamer.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const interpretation = completion.choices[0].message.content.trim();

    // Stocke l'interprétation dans KV
    await kv.set(`dream:${id}`, interpretation, { ex: 259200 });

    // Stocke aussi les données brutes (utile si on veut regénérer plus tard)
    await kv.set(
      `dream:${id}:data`,
      {
        dream,
        emotion,
        context: context || "",
        name: name || "",
      },
      { ex: 259200 }
    );

    const origin =
      req.headers.origin || "https://the-dream-revelator.vercel.app";

    // ➜ STRIPE Checkout
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


