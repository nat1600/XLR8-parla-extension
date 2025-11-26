// modules/core/actions.js

// Main actions module for saving phrases and text-to-speech
const ParlaActions = {
    
    // Save selected phrase with translation and context
    async savePhrase(selectedText, translationText, context) {
      console.log('💾 Saving phrase...');
      
      const phrase = {
        id: Date.now().toString(),
        original: selectedText,
        translation: translationText,
        context: context,
        timestamp: Date.now(),
        sourceUrl: window.location.hostname,
        pronunciation: ''
      };
      
      try {
        const result = await chrome.storage.local.get(['parla_phrases']);
        const phrases = result.parla_phrases || [];
        phrases.unshift(phrase);
        await chrome.storage.local.set({ parla_phrases: phrases });
        
        // Notify popup if open
        chrome.runtime.sendMessage({ 
          action: 'phraseAdded',
          phrase: phrase 
        }).catch(() => console.log('Popup not open'));
        
        console.log('✅ Phrase saved:', phrase);
        
        ParlaHelpers.showNotification('✓ Frase guardada');
        
        if (window.ParlaPopup) {
          window.ParlaPopup.hide();
        }
      } catch (error) {
        console.error('❌ Error saving phrase:', error);
        ParlaHelpers.showNotification('❌ Error al guardar');
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