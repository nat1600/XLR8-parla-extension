// modules/core/actions.js

// Main actions module for saving phrases and text-to-speech
const ParlaActions = {

  // Helper to safely build backend URL even if global helper is not injected
  backendUrl(endpoint) {
    const base = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.backend?.url)
      ? window.CONFIG.backend.url
      : 'http://localhost:8000';
    return base + endpoint;
  },
    
  // Save selected phrase with translation and context
  async savePhrase(selectedText, translationText, context, sourceLanguageId = 1, targetLanguageId = 2) {
    console.log('Saving phrase ...');

    // Determine source_type: youtube/netflix if context matches, otherwise 'web'
    let sourceType = 'web';
    const contextLower = context.toLocaleLowerCase();
    if (contextLower === 'youtube' || contextLower === 'netflix') {
      sourceType = contextLower;
    }

    const phrase = {
      original_text: selectedText,
      translated_text: translationText,
      source_language: sourceLanguageId,
      target_language: targetLanguageId,
      source_url: window.location.href,
      source_type: sourceType,
      pronunciation: ""
    };

    try {
      // Envía mensaje al background para guardar la frase
      chrome.runtime.sendMessage({
        action: 'savePhrase',
        phrase: phrase
      }, (response) => {
        if (response && response.success) {
          const savedPhrase = response.savedPhrase;
          ParlaHelpers.showNotification("✓ Frase guardada en Parla");

          // Notify popup if open
          chrome.runtime.sendMessage({ 
            action: 'phraseAdded',
            phrase: savedPhrase
          }).catch(() => console.log('Popup not open'));

          if (window.ParlaPopup) {
            window.ParlaPopup.hide();
          }
        } else {
          console.error(" API error:", response?.error);
          ParlaHelpers.showNotification("❌ Error al guardar en servidor");
        }
      });
    } catch (error) {
      console.error(" Error saving phrase:", error);
      ParlaHelpers.showNotification(" No se pudo conectar al servidor");
    }
  },

  // Reproduce text using Web Speech synthesis
  speakText(text) {
    console.log('🔊 Speaking text:', text);
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
      
      ParlaHelpers.showNotification('🔊 Reproduciendo...');
    } else {
      console.log('❌ Speech synthesis not available');
      ParlaHelpers.showNotification('Text-to-speech no disponible');
    }
  }
};

// Expose ParlaActions globally
window.ParlaActions = ParlaActions;
