// /api/create-stripe.js

import { kv } from "@vercel/kv";
import Stripe from "stripe";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // Body peut arriver en string via Vercel
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    const { dream, emotion, context, name } = body || {};

    if (!dream || !emotion) {
      return res.status(400).json({
        success: false,
        error: "Please describe your dream and your emotion.",
      });
    }

    // ✅ Stripe (LIVE secret key dans Vercel env)
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: "Missing STRIPE_SECRET_KEY",
      });
    }

    // ✅ Le PRICE ID LIVE que tu m’as montré
    // Tu peux aussi le mettre dans Vercel env: STRIPE_PRICE_ID
    const PRICE_ID =
      process.env.STRIPE_PRICE_ID || "price_1Sde3f5ltdGf3FPMh1jeAudb";

    // ✅ URL du site (recommandé en env)
    const SITE_URL = process.env.SITE_URL || "https://thedreamrevelator.com";

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    // ID sécurisé
    const id = crypto.randomBytes(18).toString("hex");

    // ✅ Stocke seulement les données (PAS l’interprétation ici)
    await kv.set(
      `dream:${id}:data`,
      {
        dream,
        emotion,
        context: context || "",
        name: name || "",
      },
      { ex: 259200 } // 3 jours
    );

    // ✅ Stripe Checkout (paiement unique)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      // ✅ IMPORTANT : permet d’entrer un code (UGCFREE, etc.)
      allow_promotion_codes: true,

      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],

      // utile pour suivi
      metadata: {
        dream_id: id,
      },

      success_url: `${SITE_URL}/result.html?id=${id}`,
      cancel_url: `${SITE_URL}/interpret.html?canceled=1`,
    });

    return res.status(200).json({
      success: true,
      url: session.url,
      id,
    });
  } catch (error) {
    console.error("Error in create-stripe:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
}


