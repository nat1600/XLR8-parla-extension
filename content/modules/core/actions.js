// modules/core/actions.js

// Main actions module for saving phrases and text-to-speech
const ParlaActions = {
    
  // Save selected phrase with translation and context
  async savePhrase(selectedText, translationText, context) {
    console.log('Saving phrase ...');

    const phrase = {
      original: selectedText,
      translation: translationText,
      context: context || "",
      source_url: window.location.href,
      pronunciation: ""
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/api/phrases/translate/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(phrase)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(" API error:", errorData);
        ParlaHelpers.showNotification("❌ Error al guardar en servidor");
        return;
      }

      const savedPhrase = await response.json();
      console.log("✅ Phrase saved on server:", savedPhrase);

      ParlaHelpers.showNotification("✓ Frase guardada en Parla");

      // Notify popup if open
      chrome.runtime.sendMessage({ 
        action: 'phraseAdded',
        phrase: savedPhrase
      }).catch(() => console.log('Popup not open'));

      if (window.ParlaPopup) {
        window.ParlaPopup.hide();
      }

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
