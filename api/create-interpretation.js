import { kv } from '@vercel/kv';
import { OpenAI } from 'openai';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { dream, emotion, context } = req.body;

  if (!dream || !emotion) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Ultra secure ID
    const id = crypto.randomBytes(18).toString("hex"); 
    const kvKey = `dream:${id}`;

    // Generate interpretation (Traditional Muslim style WITHOUT religion)
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
      temperature: 0.7
    });

    const interpretation = completion.choices[0].message.content.trim();

    // Store in Vercel KV for 3 days (60 sec * 60 min * 72 hours)
    await kv.set(kvKey, interpretation, { ex: 259200 });

    // Return URL
    return res.status(200).json({
      success: true,
      id: id,
      url: `/result.html?id=${id}`
    });

  } catch (err) {
    console.error("ERROR in create-interpretation:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

