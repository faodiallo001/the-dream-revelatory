import { kv } from "@vercel/kv";
import { OpenAI } from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: "Missing id" });
  }

  try {
    // 1️⃣ Si l’interprétation existe déjà → on la renvoie
    const existing = await kv.get(`dream:${id}`);
    if (existing) {
      return res.status(200).json({
        success: true,
        interpretation: existing,
      });
    }

    // 2️⃣ Charger les données du rêve (créées dans create-stripe)
    const data = await kv.get(`dream:${id}:data`);
    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Dream data not found",
      });
    }

    const { dream, emotion, context, name } = data;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // ⭐ TON PROMPT EXACT (inchangé) ⭐
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

    // 3️⃣ Sauvegarde sous LE MÊME ID
    await kv.set(`dream:${id}`, interpretation, { ex: 259200 });

    return res.status(200).json({
      success: true,
      interpretation,
    });
  } catch (err) {
    console.error("ERROR in get-interpretation:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
