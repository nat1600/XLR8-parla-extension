const ParlaTranslation = {

  // Helper to safely build backend URL even if global helper is not injected
  backendUrl(endpoint) {
    const base = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.backend?.url)
      ? window.CONFIG.backend.url
      : 'http://localhost:8000';
    return base + endpoint;
  },

  async translate(text, translationContainer) {
    console.log('Translating text:', text);

    try {
      const settings = await chrome.storage.local.get(['parla_target_language']);
      const targetLanguage = settings.parla_target_language || 'es';

      // Envía mensaje al background para traducir
      chrome.runtime.sendMessage({
        action: 'translate',
        text: text,
        source_lang: "en",
        target_lang: targetLanguage
      }, (response) => {
        if (response && response.success) {
          translationContainer.innerHTML = `
            <div class="parla-translation-result">
              <div class="parla-translation-label">Traducción:</div>
              <div class="parla-translation-text">${ParlaHelpers.escapeHtml(response.translation)}</div>
            </div>
          `;
          console.log('✅ Translation completed:', response.translation);
        } else {
          translationContainer.innerHTML = `<div class="parla-error">Error al traducir</div>`;
          console.error(' Translation error:', response?.error);
        }
      });
    } catch (error) {
      translationContainer.innerHTML = `<div class="parla-error">Error al traducir</div>`;
      console.error(' Translation error:', error);
    }
  },
};
