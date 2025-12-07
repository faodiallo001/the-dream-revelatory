// =============================
// The Dream Revelator – main.js
// =============================

// Update footer year
const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

// -----------------------------
// FORM + STRIPE CHECKOUT
// -----------------------------
const dreamForm = document.getElementById("dream-form");
const errorBox = document.getElementById("form-error");
const payButton = document.getElementById("pay-button");

if (dreamForm) {
  dreamForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!dreamForm.checkValidity()) {
      dreamForm.reportValidity();
      return;
    }

    // Hide previous error
    if (errorBox) errorBox.hidden = true;

    // Disable button to avoid double submissions
    if (payButton) {
      payButton.disabled = true;
      payButton.classList.add("tdr-btn-loading");
    }

    const payload = {
      email: dreamForm.email.value.trim(),
      dream: dreamForm.dream.value.trim(),
      emotion: dreamForm.emotion.value,
      lifeContext: dreamForm.lifeContext.value.trim(),
      intention: dreamForm.intention.value,
    };

    try {
      const response = await fetch("/api/create-stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Stripe API error " + response.status);
      }

      const data = await response.json();

      if (data?.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        throw new Error("No URL returned from Stripe API");
      }

    } catch (err) {
      console.error("Stripe error:", err);

      if (errorBox) {
        errorBox.hidden = false;
        errorBox.textContent =
          "We could not start the payment. Please try again.";
      }

      if (payButton) {
        payButton.disabled = false;
        payButton.classList.remove("tdr-btn-loading");
      }
    }
  });
}

