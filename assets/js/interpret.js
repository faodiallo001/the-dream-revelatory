// assets/js/interpret.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("interpret-form");
  const btnCard = document.getElementById("pay-card");
  const btnPix = document.getElementById("pay-pix");
  const errorEl = document.getElementById("interpret-error");

  if (!form || !btnCard || !btnPix || !errorEl) return;

  // 🔎 Détection "Brésil" robuste : timezone + langue
  function isBrazil() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const lang = (navigator.language || "").toLowerCase();

      // Ex : America/Sao_Paulo, America/Bahia, etc.
      if (tz.toLowerCase().includes("sao_paulo") || tz.toLowerCase().includes("brazil")) {
        return true;
      }

      // Si appareil configuré en pt-BR
      if (lang.startsWith("pt-br")) return true;
    } catch (e) {
      console.warn("Geo detection error:", e);
    }
    return false;
  }

  const userIsBrazil = isBrazil();

  // 🧼 UI : un seul bouton visible selon le pays
  if (userIsBrazil) {
    // 🇧🇷 On ne montre que le bouton Pix (qui ouvrira Mercado Pago = Pix + carte)
    btnPix.style.display = "inline-flex";
    btnCard.style.display = "none";
  } else {
    // 🌍 Hors Brésil : on ne montre que le bouton carte (Stripe)
    btnCard.style.display = "inline-flex";
    btnPix.style.display = "none";
  }

  function getFormData() {
    const name = document.getElementById("name")?.value.trim();
    const dream = document.getElementById("dream")?.value.trim();
    const emotion = document.getElementById("emotion")?.value.trim();
    const context = document.getElementById("context")?.value.trim();
    const privacy = document.getElementById("privacy")?.checked;

    if (!dream || !emotion) {
      errorEl.textContent =
        "Please describe your dream and how you felt.";
      return null;
    }

    if (!privacy) {
      errorEl.textContent =
        "Please confirm the confidentiality checkbox.";
      return null;
    }

    return { name, dream, emotion, context };
  }

  // =========================
  // 💳 STRIPE (CARTE) – hors Brésil
  // =========================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    // Si on est au Brésil, on ne passe pas par Stripe
    if (userIsBrazil) {
      return;
    }

    const data = getFormData();
    if (!data) return;

    btnCard.disabled = true;
    const originalText = btnCard.textContent;
    btnCard.textContent = "Redirecting to payment...";

    try {
      const response = await fetch("/api/create-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Stripe server error");
      }

      const result = await response.json();

      if (!result.success || !result.url) {
        throw new Error("Stripe session failed");
      }

      window.location.href = result.url;
    } catch (err) {
      console.error(err);
      errorEl.textContent =
        "We could not start the card payment. Please try again.";
      btnCard.disabled = false;
      btnCard.textContent = originalText;
    }
  });

  // =========================
  // 🇧🇷 PIX (MERCADO PAGO) – Brésil
  // =========================
  btnPix.addEventListener("click", async () => {
    errorEl.textContent = "";

    const data = getFormData();
    if (!data) return;

    btnPix.disabled = true;
    const originalText = btnPix.textContent;
    btnPix.textContent = "Redirecionando para o pagamento...";

    try {
      const response = await fetch("/api/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Pix server error");
      }

      const result = await response.json();

      if (!result.init_point) {
        throw new Error("Pix init point missing");
      }

      window.location.href = result.init_point;
    } catch (err) {
      console.error(err);
      errorEl.textContent =
        "Não foi possível iniciar o pagamento. Tente novamente.";
      btnPix.disabled = false;
      btnPix.textContent = originalText;
    }
  });
});

