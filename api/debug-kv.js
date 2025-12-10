// api/debug-kv.js

import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  try {
    // On essaie d'écrire une valeur
    await kv.set("test:key", "hello-from-kv", { ex: 60 });

    // On essaie de la relire
    const value = await kv.get("test:key");

    return res.status(200).json({
      ok: true,
      message: "KV fonctionne ✅",
      value,
    });
  } catch (err) {
    console.error("DEBUG KV ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: "KV ne fonctionne pas ❌",
      error: String(err),
    });
  }
}
