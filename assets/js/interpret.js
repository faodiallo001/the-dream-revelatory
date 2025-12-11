// assets/js/interpret.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("interpret-form");
  const btn = document.getElementById("interpret-btn");
  const errorEl = document.getElementById("interpret-error");
  const name = document.getElementById("name")?.value.trim();


  if (!form || !btn) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const dream = document.getElementById("dream")?.value.trim();
    const emotion = document.getElementById("emotion")?.value.trim();
    const context = document.getElementById("context")?.value.trim();
    const privacy = document.getElementById("privacy")?.checked;

    if (!dream || !emotion) {
      errorEl.textContent = "Please describe your dream and your emotion.";
      return;
    }

    if (!privacy) {
      errorEl.textContent = "Please confirm the confidentiality checkbox.";
      return;
    }

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = "Redirecting to payment...";

    try {
      const response = await fetch("/api/create-stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dream, emotion, context }),
      });

      if (!response.ok) {
        throw new Error("Server error: " + response.status);
      }

      const data = await response.json();
      if (!data.success || !data.url) {
        throw new Error(data.error || "Stripe session error.");
      }

      // Redirection vers Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      errorEl.textContent =
        "We could not start the payment. Please try again in a moment.";
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
});

