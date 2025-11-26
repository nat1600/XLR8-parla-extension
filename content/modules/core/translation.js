// modules/core/translation.js


// Translation module to handle text translations

const ParlaTranslation = {
   
// Translate given text and display in container
  async translate(text, translationContainer) {
    console.log('🌍 Translating text:', text);
    
    try {
      const settings = await chrome.storage.local.get(['parla_target_language']);
      const targetLanguage = settings.parla_target_language || 'es';
      
      console.log('🎯 Target language:', targetLanguage);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const translation = await this.mockTranslate(text, targetLanguage);
      
      translationContainer.innerHTML = `
        <div class="parla-translation-result">
          <div class="parla-translation-label">Traducción:</div>
          <div class="parla-translation-text">${ParlaHelpers.escapeHtml(translation)}</div>
        </div>
      `;
      
      console.log('✅ Translation completed:', translation);
    } catch (error) {
      console.error('❌ Translation error:', error);
      translationContainer.innerHTML = `
        <div class="parla-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Error al traducir
        </div>
      `;
    }
  },

  // Simulated translation function
  async mockTranslate(text, targetLang) {
    const translations = {
      'Hello': 'Hola',
      'Thank you': 'Gracias',
      'How are you?': '¿Cómo estás?',
      'Good morning': 'Buenos días',
      'Good night': 'Buenas noches'
    };
    
    return translations[text] || `[${targetLang}] ${text}`;
  }
};

// Expose ParlaTranslation globally
window.ParlaTranslation = ParlaTranslation;