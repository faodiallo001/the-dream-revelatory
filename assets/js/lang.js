document.addEventListener("DOMContentLoaded", async () => {
  async function loadTranslations() {
    const res = await fetch("/assets/lang/lang.json");
    return res.json();
  }

  function detectLanguage() {
    const lang = navigator.language || navigator.userLanguage;

    if (lang.startsWith("fr")) return "fr";
    if (lang.startsWith("pt")) return "pt"; // Portugais Brésil
    if (lang.startsWith("es")) return "es";
    return "en"; // default English
  }

  const translations = await loadTranslations();
  const userLang = detectLanguage();

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[userLang][key]) {
      el.textContent = translations[userLang][key];
    }
  });
});
