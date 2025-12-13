// assets/js/interpret.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("interpret-form");
  const btnCard = document.getElementById("pay-card");
  const btnPix = document.getElementById("pay-pix");
  const errorEl = document.getElementById("interpret-error");

  if (!form || !btnCard || !btnPix) return;

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
  // 💳 STRIPE (CARTE)
  // =========================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

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
  // 🇧🇷 PIX (MERCADO PAGO)
  // =========================
  btnPix.addEventListener("click", async () => {
    errorEl.textContent = "";

    const data = getFormData();
    if (!data) return;

    btnPix.disabled = true;
    const originalText = btnPix.textContent;
    btnPix.textContent = "Redirecionando para o Pix...";

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
        "Não foi possível iniciar o pagamento Pix. Tente novamente.";
      btnPix.disabled = false;
      btnPix.textContent = originalText;
    }
  });
});

