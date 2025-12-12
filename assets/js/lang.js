document.addEventListener("DOMContentLoaded", async () => {
  async function loadTranslations() {
    const res = await fetch("/assets/lang/lang.json");
    return res.json();
  }

  function detectLanguage() {
    const lang = navigator.language.toLowerCase();

    if (lang.startsWith("fr")) return "fr";
    if (lang.startsWith("pt")) return "pt";
    if (lang.startsWith("es")) return "es";
    return "en"; // default
  }

  const translations = await loadTranslations();
  const userLang = detectLanguage();

  // Remplace tout ce qui a data-i18n
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[userLang][key]) {
      el.textContent = translations[userLang][key];
    }
  });

  // Remplace les placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[userLang][key]) {
      el.placeholder = translations[userLang][key];
    }
  });
});
