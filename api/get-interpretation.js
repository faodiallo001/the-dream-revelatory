import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: "Missing id" });
  }

  try {
    const kvKey = `dream:${id}`;
    const interpretation = await kv.get(kvKey);

    if (!interpretation) {
      return res
        .status(404)
        .json({ success: false, error: "Interpretation not found" });
    }

    return res.status(200).json({
      success: true,
      interpretation,
    });
  } catch (err) {
    console.error("ERROR in get-interpretation:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
