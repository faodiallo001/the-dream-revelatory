// assets/js/result.js

document.addEventListener("DOMContentLoaded", () => {
  const outputEl = document.getElementById("dream-output");
  const shareBtn = document.getElementById("share-btn");

  if (!outputEl) return;

  // Récupérer l'id dans l'URL : ?id=xxxxx
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    outputEl.textContent = "No interpretation ID was found for this page.";
    if (shareBtn) {
      shareBtn.style.display = "none";
    }
    return;
  }

  // Charger l'interprétation depuis l'API
  async function loadInterpretation() {
    try {
      const response = await fetch("/api/get-interpretation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Server error: " + response.status);
      }

      const data = await response.json();

      if (!data || !data.success || !data.interpretation) {
        throw new Error("No interpretation returned");
      }

      outputEl.textContent = data.interpretation;
    } catch (err) {
      console.error("Error loading interpretation:", err);
      outputEl.textContent =
        "We could not load this interpretation. It may have expired or been removed.";
      if (shareBtn) {
        shareBtn.style.display = "none";
      }
    }
  }

  loadInterpretation();

  // ==============================
  //    Bouton de partage
  // ==============================
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const shareUrl = window.location.href;

      if (navigator.share) {
        try {
          await navigator.share({
            title: "My dream interpretation",
            text: "Here is my dream interpretation from The Dream Revelator.",
            url: shareUrl,
          });
        } catch (e) {
          console.warn("Share cancelled or failed:", e);
        }
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          const originalText = shareBtn.textContent;
          shareBtn.textContent = "Link copied";
          setTimeout(() => {
            shareBtn.textContent = originalText;
          }, 2000);
        } catch (e) {
          alert("Copy failed. You can copy the URL from your browser address bar.");
        }
      } else {
        alert("You can share this page by copying the URL from your browser.");
      }
    });
  }
});


