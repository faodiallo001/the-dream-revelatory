import { kv } from '@vercel/kv';
import { OpenAI } from 'openai';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { dream, emotion, context, name } = req.body;

  if (!dream || !emotion) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const id = crypto.randomBytes(18).toString("hex");
    const kvKey = `dream:${id}`;

    // ⭐ NOUVEAU PROMPT – TITRES AUTO-TRADUITS ⭐
    const prompt = `
You are an expert in ancient Middle Eastern symbolic dream interpretation.
You NEVER mention religion, prophets, scriptures, Islam, Christianity or any sacred figures.

LANGUAGE RULE:
Write the ENTIRE interpretation in the SAME LANGUAGE the user used.
This includes:
- Section titles
- Subtitles
- Content
- Tone

TITLE TRANSLATION RULE:
Translate these section titles into the user’s language:
1. Main meaning
2. Symbolic breakdown
3. Message for the dreamer
4. What this dream suggests going forward

EXAMPLES:
- French → “Signification principale”, “Analyse symbolique”, “Message pour le rêveur / la rêveuse”
- Portuguese → “Significado principal”, “Análise simbólica”
- Spanish → “Significado principal”, “Análisis simbólico”
- English → Keep the original

NAME RULE:
If a name is provided, gently address the dreamer once or twice.  
If not, do not invent a name.

STYLE:
Use traditional symbolic meanings:
- enemies, protection, obstacles, hidden intentions  
- blessings, money, liberation, danger, family ties  
- classical meaning of animals, water, heights, houses, clothes, darkness, light  
- bodily actions (urination/defecation) = release + often financial relief or gain  

USER INPUT:
Name: ${name || "None"}
Dream: ${dream}
Emotion: ${emotion}
Context: ${context || "None"}

STRUCTURE (translated into user's language):
1. Main meaning
2. Symbolic breakdown
3. Message for the dreamer
4. What this dream suggests going forward

Write 4–6 paragraphs, very clear, serious, traditionally symbolic.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const interpretation = completion.choices[0].message.content.trim();

    await kv.set(kvKey, interpretation, { ex: 259200 });

    return res.status(200).json({
      success: true,
      id,
      url: `/result.html?id=${id}`,
    });

  } catch (err) {
    console.error("ERROR in create-interpretation:", err);
    return res.status(500).json({ error: "Server error" });
  }
}


