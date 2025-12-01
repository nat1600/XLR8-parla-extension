// content/content.js
/**
 * PARLA CONTENT SCRIPT - Principal Orchestrator
 * 
 * This script initializes the Parla extension on supported platforms,
 * manages text selection events, and coordinates with platform-specific
 * modules for subtitle handling.
 */

console.log('🎯 Parla: Initializing content script...');

// ===========================
// GLOBAL STATE
// ===========================
let pageType = {
  isYouTube: false,
  isNetflix: false,
  isPDF: false
};

// ===========================
// INITIALIZATION
// ===========================
async function init() {
  console.log('🚀 Starting Parla initialization...');
  
  // 1. Load settings first
  await ParlaSettings.load();
  ParlaSettings.setupMessageListener();
  
  // 2. Inject styles
  injectStyles();
  
  // 3. Detect page type
  detectPageType();
  
  // 4. Setup event listeners
  setupEventListeners();
  
  console.log('✅ Parla extension initialized successfully');
}

// ===========================
// STYLES INJECTION (CRITICAL!)
// ===========================
function injectStyles() {
  if (document.getElementById('parla-styles')) {
    console.log('⚠️ Styles already injected');
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'parla-styles';
  style.textContent = `
    /* Parla Floating Popup */
    .parla-floating-popup {
      position: fixed;
      width: 320px;
      background: #ecf0f3;
      border-radius: 16px;
      box-shadow: 
        8px 8px 16px #d1d9e6,
        -8px -8px 16px #ffffff;
      z-index: 2147483647 !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      opacity: 0;
      transform: scale(0.9) translateY(-10px);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }
    
    .parla-popup-visible {
      opacity: 1 !important;
      transform: scale(1) translateY(0) !important;
      pointer-events: all !important;
    }
    
    .parla-popup-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #200940 0%, #8A76A6 100%);
      border-radius: 16px 16px 0 0;
    }
    
    .parla-popup-logo {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .parla-popup-title {
      flex: 1;
      font-size: 14px;
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .parla-popup-close {
      width: 24px;
      height: 24px;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border-radius: 50%;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .parla-popup-close:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: scale(1.1);
    }
    
    .parla-popup-content {
      padding: 16px;
    }
    
    .parla-selected-text {
      padding: 12px;
      background: #ffffff;
      border-radius: 10px;
      font-size: 13px;
      line-height: 1.5;
      color: #200940;
      font-weight: 500;
      margin-bottom: 12px;
      box-shadow: 
        inset 2px 2px 4px #d1d9e6,
        inset -2px -2px 4px #ffffff;
    }
    
    .parla-translation-container {
      min-height: 60px;
    }
    
    .parla-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 20px;
      color: #8A76A6;
      font-size: 12px;
    }
    
    .parla-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #EDDEFD;
      border-top-color: #BCA2F2;
      border-radius: 50%;
      animation: parla-spin 0.6s linear infinite;
    }
    
    @keyframes parla-spin {
      to { transform: rotate(360deg); }
    }
    
    .parla-translation-result {
      padding: 12px;
      background: linear-gradient(135deg, rgba(188, 162, 242, 0.1) 0%, rgba(138, 118, 166, 0.1) 100%);
      border-radius: 10px;
      border: 1px solid #EDDEFD;
    }
    
    .parla-translation-label {
      font-size: 10px;
      font-weight: 600;
      color: #8A76A6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    
    .parla-translation-text {
      font-size: 13px;
      line-height: 1.5;
      color: #200940;
      font-weight: 500;
    }
    
    .parla-error {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 20px;
      color: #ef4444;
      font-size: 12px;
    }
    
    .parla-popup-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 16px 16px;
    }
    
    .parla-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 12px;
      border: none;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    
    .parla-btn-primary {
      background: linear-gradient(135deg, #BCA2F2 0%, #8A76A6 100%);
      color: white;
      box-shadow: 
        4px 4px 8px #d1d9e6,
        -4px -4px 8px #ffffff;
    }
    
    .parla-btn-primary:hover {
      transform: scale(0.98);
      box-shadow: 
        2px 2px 4px #d1d9e6,
        -2px -2px 4px #ffffff;
    }
    
    .parla-btn-secondary {
      background: #ecf0f3;
      color: #8A76A6;
      box-shadow: 
        4px 4px 8px #d1d9e6,
        -4px -4px 8px #ffffff;
    }
    
    .parla-btn-secondary:hover {
      box-shadow: 
        inset 2px 2px 4px #d1d9e6,
        inset -2px -2px 4px #ffffff;
    }
    
    /* Notification */
    .parla-notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #200940 0%, #8A76A6 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      box-shadow: 
        4px 4px 8px #d1d9e6,
        -4px -4px 8px #ffffff;
      z-index: 2147483647 !important;
      font-size: 13px;
      font-weight: 600;
      opacity: 0;
      transform: translateX(400px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    .parla-notification-visible {
      opacity: 1;
      transform: translateX(0);
    }
    
    /* YouTube subtitle enhancement */
    .ytp-caption-segment[data-parla-listener="true"] {
      transition: all 0.2s;
    }
    
    .ytp-caption-segment[data-parla-listener="true"]:hover {
      background: rgba(188, 162, 242, 0.2) !important;
      padding: 2px 4px;
      border-radius: 4px;
    }
  `;
  
  document.head.appendChild(style);
  console.log('✅ Styles injected');
}

// ===========================
// PAGE TYPE DETECTION
// ===========================
function detectPageType() {
  const detected = ParlaHelpers.detectPageType();
  pageType = detected;
  
  console.log('📄 Page type detected:', pageType);
  
  // Initialize platform-specific modules
  if (pageType.isYouTube) {
    console.log('🎥 Initializing YouTube integration...');
    ParlaYouTube.setup();
  } else if (pageType.isNetflix) {
    console.log('🎬 Initializing Netflix integration...');
    ParlaNetflix.setup();
  } else if (pageType.isPDF) {
    console.log('📄 Initializing PDF integration...');
    ParlaPDF.setup();
  }
}

// ===========================
// EVENT LISTENERS
// ===========================
function setupEventListeners() {
  let popupTimeout;

  // Text selection handler
  document.addEventListener('mouseup', (e) => {
    // Don't proceed if Netflix overlay handled the click
    if (window.netflixClickHandled) {
      console.log('⏭️ Skipping text selection - Netflix overlay active');
      return;
    }
    
    clearTimeout(popupTimeout);
    popupTimeout = setTimeout(() => {
      handleTextSelection(e);
    }, 150);
  });

  // Escape key to close popup
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      console.log('⌨️ Escape pressed - hiding popup');
      ParlaPopup.hide();
    }
  });
  
  console.log('✅ Event listeners attached');
}

// ===========================
// TEXT SELECTION HANDLER
// ===========================
function handleTextSelection(e) {
  if (!ParlaSettings.isExtensionActive) {
    console.log('⏸️ Extension is inactive');
    return;
  }
  
  // Skip if Netflix handled the click
  if (window.netflixClickHandled) {
    console.log('🎬 Click handled by Netflix overlay');
    return;
  }
  
  // Skip if YouTube handled the click
  if (window.youtubeSubtitleClickHandled) {
    console.log('🎥 Click handled by YouTube module');
    return;
  }
  
  // Don't show popup if clicking on the popup itself
  if (ParlaPopup.floatingPopup && ParlaPopup.floatingPopup.contains(e.target)) {
    console.log('🖱️ Clicked on popup itself');
    return;
  }
  
  // Check if clicking on popup by data attribute
  if (e.target.closest('[data-parla-popup="true"]')) {
    console.log('🖱️ Clicked inside Parla popup');
    return;
  }
  
  // Don't interfere with platform-specific subtitle handling
  if ((pageType.isYouTube || pageType.isNetflix) && 
      (e.target.closest('.ytp-caption-segment, .player-timedtext, .player-timedtext-text-container, [class*="timedtext"]') ||
       e.target.id === 'parla-netflix-overlay' ||
       e.target.closest('#parla-netflix-overlay'))) {
    console.log('📺 Subtitle click handled by platform module');
    return;
  }
  
  const selection = window.getSelection();
  //const text = selection.toString().trim();
  let text = selection.toString()
    .replace(/\r/g, "")
    .replace(/\n+/g, "\n")                 // Keep single newlines
    .replace(/([a-zA-Z0-9])\n([A-Z])/g, "$1 \n$2") // Space after newline if needed
    .trim();


  console.log('📝 Text selected:', text);
  
  if (text.length > 0) {
    const context = ParlaHelpers.getContext(
      pageType.isYouTube,
      pageType.isNetflix,
      pageType.isPDF
    );
    ParlaPopup.show(e.clientX, e.clientY, text, context);
  } else {
    ParlaPopup.hide();
  }
}

// ===========================
// POPUP PROTECTION
// ===========================
const popupObserver = new MutationObserver(() => {
  if (ParlaPopup.floatingPopup && !document.contains(ParlaPopup.floatingPopup)) {
    console.warn("⚠️ Popup removed by site, resetting...");
    ParlaPopup.floatingPopup = null;
  }
});

popupObserver.observe(document.body, { 
  childList: true, 
  subtree: true 
});

// ===========================
// SPA NAVIGATION HANDLING
// ===========================
window.addEventListener('popstate', () => {
  console.log('🔄 Page navigation detected, reinitializing...');
  
  // Cleanup old observers
  if (window.netflixOverlayInterval) {
    clearInterval(window.netflixOverlayInterval);
    window.netflixOverlayInterval = null;
  }
  
  const oldOverlay = document.getElementById('parla-netflix-overlay');
  if (oldOverlay) {
    oldOverlay.remove();
  }
  
  window.netflixObserverActive = false;
  window.parlaYTObserverActive = false;
  
  // Re-initialize after delay
  setTimeout(() => {
    detectPageType();
  }, 1000);
});

// ===========================
// CLEANUP ON UNLOAD
// ===========================
window.addEventListener('beforeunload', () => {
  console.log('👋 Cleaning up Parla...');
  
  if (window.netflixOverlayInterval) {
    clearInterval(window.netflixOverlayInterval);
  }
  
  ParlaPopup.hide();
});

// ===========================
// START INITIALIZATION
// ===========================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}