// modules/core/settings.js
// Manages extension settings and state

const ParlaSettings = {
    isExtensionActive: true,
    autoPauseEnabled: true,
  
    // Load settings from chrome.storage
    async load() {
      try {
        const result = await chrome.storage.local.get([
          'parla_extension_active', 
          'parla_auto_pause'
        ]);
        
        this.isExtensionActive = result.parla_extension_active !== false;
        this.autoPauseEnabled = result.parla_auto_pause !== false;
        
        console.log('⚙️ Settings loaded:', {
          isExtensionActive: this.isExtensionActive,
          autoPauseEnabled: this.autoPauseEnabled
        });
      } catch (error) {
        console.error('❌ Error loading settings:', error);
        this.isExtensionActive = true;
        this.autoPauseEnabled = true;
      }
    },
  
    // Configure message listener for settings updates
    setupMessageListener() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('📩 Message received:', request);
        
        if (request.action === 'toggleExtension') {
          this.isExtensionActive = request.active;
          console.log('🔄 Extension toggled:', this.isExtensionActive);
          
          if (!this.isExtensionActive && window.ParlaPopup) {
            window.ParlaPopup.hide();
          }
        } else if (request.action === 'settingsUpdated') {
          this.load();
        }
        
        sendResponse({ success: true });
        return true;
      });
    }
  };
  
  // Expose ParlaSettings globally
  window.ParlaSettings = ParlaSettings;