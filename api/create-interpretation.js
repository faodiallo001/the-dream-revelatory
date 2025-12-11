import { kv } from '@vercel/kv';
import { OpenAI } from 'openai';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ➜ On récupère aussi le name
  const { dream, emotion, context, name } = req.body;

  if (!dream || !emotion) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Ultra secure ID
    const id = crypto.randomBytes(18).toString("hex");
    const kvKey = `dream:${id}`;

    // Generate interpretation (Islamic-era traditional style, same language, no explicit religion)
    const prompt = `
You will interpret the user's dream using the traditional symbolic method
found in ancient Middle Eastern and Islamic-era dream interpretation,
BUT without mentioning religion, scriptures, prophets, or any religious authority.

Do NOT use or mention the words Islam, Muslim, Quran, Bible, Hadith,
or any prophet's name. You simply apply the symbolic logic.

LANGUAGE:
Write the interpretation in the SAME LANGUAGE the user used
(French, English, Portuguese, Spanish, etc.).

NAME:
If a name is provided, gently address the dreamer by name 1–2 times
in a natural way. If no name is provided, do not invent or mention a name.

STYLE YOU MUST FOLLOW:
- Use classical meanings known in traditional dream interpretation texts.
- Serious, grounded, old-world tone. Not poetic, not psychological coaching.
- Focus on: protection, enemies, blessings, upcoming events, money, liberation,
  obstacles, status elevation, hidden intentions, relationships, family ties.
- Bodily actions such as urination or defecation symbolize:
  release, removal of burdens, and often financial gain or relief.
- Animals, water, falling, heights, children, houses, clothes, darkness, and light
  MUST follow traditional symbolic meanings (enemies, blessings, worries,
  responsibilities, changes, reputation, guidance, etc.).

USER INPUT:
Name: ${name || "None"}
Dream: ${dream}
Emotion: ${emotion}
Context: ${context || "None"}

STRUCTURE REQUIRED:
1. Main meaning  
2. Symbolic breakdown  
3. Message for the dreamer  
4. What this dream suggests going forward  

Write 4–6 paragraphs, very clear, traditionally symbolic, following these
classical meanings, in the same language as the dream above.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const interpretation = completion.choices[0].message.content.trim();

    // Store in Vercel KV for 3 days (60 sec * 60 min * 72 hours)
    await kv.set(kvKey, interpretation, { ex: 259200 });

    // Return URL
    return res.status(200).json({
      success: true,
      id: id,
      url: `/result.html?id=${id}`,
    });

  } catch (err) {
    console.error("ERROR in create-interpretation:", err);
    return res.status(500).json({ error: "Server error" });
  }
}


