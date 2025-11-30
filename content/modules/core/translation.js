const ParlaTranslation = {

  async translate(text, translationContainer) {
    console.log('Translating text:', text);

    try {
      const settings = await chrome.storage.local.get(['parla_target_language']);
      const targetLanguage = settings.parla_target_language || 'es';

      const response = await fetch('http://127.0.0.1:8000/api/phrases/translate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          source_lang: "en",
          target_lang: targetLanguage
        })
      });

      const data = await response.json();
      console.log("🌐 Translation API reply:", data);

      translationContainer.innerHTML = `
        <div class="parla-translation-result">
          <div class="parla-translation-label">Traducción:</div>
          <div class="parla-translation-text">${ParlaHelpers.escapeHtml(data.translation)}</div>
        </div>
      `;

      console.log('✅ Translation completed:', data.translation);

    } catch (error) {
      console.error(' Translation error:', error);
      translationContainer.innerHTML = `
        <div class="parla-error">Error al traducir</div>
      `;
    }
  },
};
