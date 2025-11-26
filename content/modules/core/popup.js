// content/modules/core/popup.js
// Floating popup module with Singleton pattern

const ParlaPopup = (() => {
  // Private state (Singleton)
  let instance = null;
  let floatingPopup = null;
  let selectedText = '';
  let isShowing = false;

  // Singleton instance
  return {
    get floatingPopup() {
      return floatingPopup;
    },

    // Show floating popup at specified position
    show(x, y, text, context) {
      // Prevent multiple popups
      if (isShowing) {
        console.log('⚠️ Popup already showing, ignoring duplicate call');
        return;
      }

      isShowing = true;
      console.log('💬 Showing floating popup at', { x, y });
      
      selectedText = text;
      this.hide();
      
      floatingPopup = document.createElement('div');
      floatingPopup.className = 'parla-floating-popup';
      floatingPopup.setAttribute('data-parla-popup', 'true'); // Marker for identification
      floatingPopup.innerHTML = `
        <div class="parla-popup-header">
          <div class="parla-popup-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#BCA2F2"/>
              <path d="M8 12h8M12 8v8" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="parla-popup-title">Parla</span>
          <button class="parla-popup-close" id="parla-close">×</button>
        </div>
        
        <div class="parla-popup-content">
          <div class="parla-selected-text">${ParlaHelpers.escapeHtml(text)}</div>
          <div class="parla-translation-container" id="parla-translation">
            <div class="parla-loading">
              <div class="parla-spinner"></div>
              <span>Traduciendo...</span>
            </div>
          </div>
        </div>
        
        <div class="parla-popup-actions">
          <button class="parla-action-btn parla-btn-primary" id="parla-save">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2"/>
              <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" stroke-width="2"/>
            </svg>
            Guardar
          </button>
          <button class="parla-action-btn parla-btn-secondary" id="parla-speak">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Escuchar
          </button>
        </div>
      `;
      
      document.body.appendChild(floatingPopup);
      this.position(x, y);
      
      // Small delay before showing
      requestAnimationFrame(() => {
        if (floatingPopup) {
          floatingPopup.classList.add('parla-popup-visible');
        }
      });
      
      this.setupEventListeners(context);
      
      const translationContainer = document.getElementById('parla-translation');
      if (translationContainer) {
        ParlaTranslation.translate(text, translationContainer);
      }
      
      console.log('✅ Popup displayed');
      
      // Reset showing flag after animation
      setTimeout(() => {
        isShowing = false;
      }, 300);
    },

    // Position popup within viewport
    position(x, y) {
      if (!floatingPopup) return;
      
      const rect = floatingPopup.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = x + 10;
      let top = y + 10;
      
      if (left + rect.width > viewportWidth) {
        left = x - rect.width - 10;
      }
      
      if (top + rect.height > viewportHeight) {
        top = y - rect.height - 10;
      }
      
      left = Math.max(10, Math.min(left, viewportWidth - rect.width - 10));
      top = Math.max(10, Math.min(top, viewportHeight - rect.height - 10));
      
      floatingPopup.style.left = `${left}px`;
      floatingPopup.style.top = `${top}px`;
    },

    // Hide floating popup
    hide() {
      if (floatingPopup) {
        floatingPopup.classList.remove('parla-popup-visible');
        
        const popupToRemove = floatingPopup;
        floatingPopup = null;
        isShowing = false;
        
        setTimeout(() => {
          if (popupToRemove && popupToRemove.parentNode) {
            popupToRemove.parentNode.removeChild(popupToRemove);
          }
        }, 200);
      }
    },

    // Configure event listeners for popup buttons
    setupEventListeners(context) {
      if (!floatingPopup) return;

      // CRITICAL: Stop ALL propagation on popup
      const stopProp = (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      };

      floatingPopup.addEventListener('mousedown', stopProp, true);
      floatingPopup.addEventListener('mouseup', stopProp, true);
      floatingPopup.addEventListener('click', stopProp, true);

      // Close button
      const closeBtn = document.getElementById('parla-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          stopProp(e);
          this.hide();
        });
      }

      // Save button
      const saveButton = document.getElementById('parla-save');
      if (saveButton) {
        saveButton.addEventListener('click', async (e) => {
          stopProp(e);
          
          if (saveButton.disabled) return;
          saveButton.disabled = true;
          saveButton.style.opacity = '0.6';

          const translationText = document.querySelector('.parla-translation-text');
          if (translationText) {
            await ParlaActions.savePhrase(
              selectedText,
              translationText.textContent,
              context
            );
          }

          setTimeout(() => {
            saveButton.disabled = false;
            saveButton.style.opacity = '1';
          }, 1000);
        });
      }

      // Speak button
      const speakButton = document.getElementById('parla-speak');
      if (speakButton) {
        speakButton.addEventListener('click', (e) => {
          stopProp(e);

          if (speakButton.disabled) return;
          speakButton.disabled = true;
          speakButton.style.opacity = '0.6';

          ParlaActions.speakText(selectedText);

          setTimeout(() => {
            speakButton.disabled = false;
            speakButton.style.opacity = '1';
          }, 1500);
        });
      }
    }
  };
})();

// Expose ParlaPopup globally
window.ParlaPopup = ParlaPopup;