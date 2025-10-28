// ===========================
// PARLA CONTENT SCRIPT
// Handles text selection and translation on web pages
// ===========================

let isExtensionActive = true;
let floatingPopup = null;
let selectedText = '';
let isYouTube = false;
let isNetflix = false;
let isPDF = false;
let videoElement = null;
let autoPauseEnabled = true;

// ===========================
// INITIALIZATION
// ===========================
function init() {
  console.log('🎯 Parla: Initializing content script...');
  loadSettings();
  detectPageType();
  injectStyles();
  setupEventListeners();
  
  console.log('✅ Parla extension initialized successfully');
}

// ===========================
// SETTINGS
// ===========================
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['parla_extension_active', 'parla_auto_pause']);
    isExtensionActive = result.parla_extension_active !== false;
    autoPauseEnabled = result.parla_auto_pause !== false;
    
    console.log('📋 Settings loaded:', { isExtensionActive, autoPauseEnabled });
  } catch (error) {
    console.error('❌ Error loading settings:', error);
    // Fallback to defaults
    isExtensionActive = true;
    autoPauseEnabled = true;
  }
}

// Listen for settings changes from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request);
  
  if (request.action === 'toggleExtension') {
    isExtensionActive = request.active;
    console.log('🔄 Extension toggled:', isExtensionActive);
    if (!isExtensionActive) {
      hideFloatingPopup();
    }
  } else if (request.action === 'settingsUpdated') {
    loadSettings();
  }
  
  sendResponse({ success: true });
  return true;
});

// ===========================
// PAGE TYPE DETECTION
// ===========================
function detectPageType() {
  const url = window.location.href;
  
  isYouTube = url.includes('youtube.com/watch');
  isNetflix = url.includes('netflix.com/watch');
  isPDF = url.includes('.pdf') || document.contentType === 'application/pdf';
  
  console.log('🌐 Page type detected:', { isYouTube, isNetflix, isPDF });
  
  if (isYouTube) {
    setupYouTubeIntegration();
  } else if (isNetflix) {
    setupNetflixIntegration();
  } else if (isPDF) {
    setupPDFIntegration();
  }
}

// ===========================
// YOUTUBE INTEGRATION
// ===========================
function setupYouTubeIntegration() {
  console.log('🎬 YouTube detected - Setting up subtitle detection');
  
  // Wait for video player to load
  let attempts = 0;
  const maxAttempts = 30;
  
  const checkVideo = setInterval(() => {
    attempts++;
    videoElement = document.querySelector('video');
    const subtitlesContainer = document.querySelector('.ytp-caption-segment');
    
    if (videoElement && subtitlesContainer) {
      console.log('✅ YouTube video and subtitles found');
      clearInterval(checkVideo);
      attachSubtitleListeners();
    } else if (attempts >= maxAttempts) {
      console.log('⏱️ YouTube check timeout - video or subtitles not found');
      clearInterval(checkVideo);
    }
  }, 1000);
}

function attachSubtitleListeners() {
  console.log('👂 Attaching subtitle listeners...');
  
  // Observer for subtitle changes
  const subtitlesObserver = new MutationObserver(() => {
    const subtitleElements = document.querySelectorAll('.ytp-caption-segment');
    
    subtitleElements.forEach(subtitle => {
      if (!subtitle.hasAttribute('data-parla-listener')) {
        subtitle.setAttribute('data-parla-listener', 'true');
        subtitle.style.cursor = 'pointer';
        subtitle.style.userSelect = 'text';
        
        // Hover to pause
        subtitle.addEventListener('mouseenter', handleSubtitleHover);
        subtitle.addEventListener('mouseleave', handleSubtitleLeave);
        
        // Click to select
        subtitle.addEventListener('mouseup', handleSubtitleClick);
        
        console.log('🎯 Subtitle listener attached');
      }
    });
  });
  
  const captionWindow = document.querySelector('.caption-window');
  if (captionWindow) {
    subtitlesObserver.observe(captionWindow, {
      childList: true,
      subtree: true
    });
    console.log('✅ Subtitle observer started');
  }
}

function handleSubtitleHover(e) {
  if (!isExtensionActive || !autoPauseEnabled) return;
  
  console.log('🖱️ Subtitle hover detected');
  
  if (videoElement && !videoElement.paused) {
    videoElement.pause();
    e.currentTarget.setAttribute('data-parla-paused', 'true');
    console.log('⏸️ Video paused');
  }
}

function handleSubtitleLeave(e) {
  if (!isExtensionActive || !autoPauseEnabled) return;
  
  if (e.currentTarget.hasAttribute('data-parla-paused')) {
    setTimeout(() => {
      if (videoElement) {
        videoElement.play();
        console.log('▶️ Video resumed');
      }
      e.currentTarget.removeAttribute('data-parla-paused');
    }, 300);
  }
}

function handleSubtitleClick(e) {
  if (!isExtensionActive) return;
  
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  console.log('🖱️ Subtitle clicked, text:', text);
  
  if (text.length > 0) {
    selectedText = text;
    showFloatingPopup(e.clientX, e.clientY);
  }
}

// ===========================
// NETFLIX INTEGRATION
// ===========================
function setupNetflixIntegration() {
  console.log('🎬 Netflix detected - Setting up subtitle detection');
  
  let attempts = 0;
  const maxAttempts = 30;
  
  const checkVideo = setInterval(() => {
    attempts++;
    videoElement = document.querySelector('video');
    const subtitlesContainer = document.querySelector('.player-timedtext');
    
    if (videoElement && subtitlesContainer) {
      console.log('✅ Netflix video and subtitles found');
      clearInterval(checkVideo);
      attachNetflixSubtitleListeners();
    } else if (attempts >= maxAttempts) {
      console.log('⏱️ Netflix check timeout');
      clearInterval(checkVideo);
    }
  }, 1000);
}

function attachNetflixSubtitleListeners() {
  console.log('👂 Attaching Netflix subtitle listeners...');
  
  const subtitlesObserver = new MutationObserver(() => {
    const subtitleElements = document.querySelectorAll('.player-timedtext-text-container span');
    
    subtitleElements.forEach(subtitle => {
      if (!subtitle.hasAttribute('data-parla-listener')) {
        subtitle.setAttribute('data-parla-listener', 'true');
        subtitle.style.cursor = 'pointer';
        subtitle.style.userSelect = 'text';
        
        subtitle.addEventListener('mouseenter', handleSubtitleHover);
        subtitle.addEventListener('mouseleave', handleSubtitleLeave);
        subtitle.addEventListener('mouseup', handleSubtitleClick);
        
        console.log('🎯 Netflix subtitle listener attached');
      }
    });
  });
  
  const timedText = document.querySelector('.player-timedtext');
  if (timedText) {
    subtitlesObserver.observe(timedText, {
      childList: true,
      subtree: true
    });
    console.log('✅ Netflix subtitle observer started');
  }
}

// ===========================
// PDF INTEGRATION
// ===========================
function setupPDFIntegration() {
  console.log('📄 PDF detected - Enhanced text selection enabled');
}

// ===========================
// GENERAL TEXT SELECTION
// ===========================
function setupEventListeners() {
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keydown', handleKeyDown);
  
  console.log('✅ Event listeners attached');
}

function handleTextSelection(e) {
  if (!isExtensionActive) {
    console.log('⚠️ Extension is inactive');
    return;
  }
  
  // Don't show popup if clicking on the popup itself
  if (floatingPopup && floatingPopup.contains(e.target)) {
    console.log('⚠️ Clicked on popup itself');
    return;
  }
  
  // Don't interfere with YouTube/Netflix subtitles (handled separately)
  if ((isYouTube || isNetflix) && e.target.closest('.ytp-caption-segment, .player-timedtext')) {
    console.log('⚠️ Subtitle click handled separately');
    return;
  }
  
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  console.log('📝 Text selected:', text);
  
  if (text.length > 0) {
    selectedText = text;
    showFloatingPopup(e.clientX, e.clientY);
  } else {
    hideFloatingPopup();
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    console.log('⌨️ Escape pressed - hiding popup');
    hideFloatingPopup();
  }
}

// ===========================
// FLOATING POPUP
// ===========================
function showFloatingPopup(x, y) {
  console.log('🎨 Showing floating popup at', { x, y });
  
  // Remove existing popup
  hideFloatingPopup();
  
  // Create popup
  floatingPopup = document.createElement('div');
  floatingPopup.className = 'parla-floating-popup';
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
      <div class="parla-selected-text">${escapeHtml(selectedText)}</div>
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
  
  // Position popup
  document.body.appendChild(floatingPopup);
  positionPopup(floatingPopup, x, y);
  
  // Animate in
  setTimeout(() => {
    floatingPopup.classList.add('parla-popup-visible');
  }, 10);
  
  // Setup event listeners
  document.getElementById('parla-close').addEventListener('click', hideFloatingPopup);
  document.getElementById('parla-save').addEventListener('click', savePhrase);
  document.getElementById('parla-speak').addEventListener('click', speakText);
  
  // Translate text
  translateText(selectedText);
  
  console.log('✅ Popup displayed');
}

function positionPopup(popup, x, y) {
  const rect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let left = x + 10;
  let top = y + 10;
  
  // Adjust if popup goes off screen
  if (left + rect.width > viewportWidth) {
    left = x - rect.width - 10;
  }
  
  if (top + rect.height > viewportHeight) {
    top = y - rect.height - 10;
  }
  
  // Ensure popup stays within viewport
  left = Math.max(10, Math.min(left, viewportWidth - rect.width - 10));
  top = Math.max(10, Math.min(top, viewportHeight - rect.height - 10));
  
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function hideFloatingPopup() {
  if (floatingPopup) {
    floatingPopup.classList.remove('parla-popup-visible');
    setTimeout(() => {
      if (floatingPopup && floatingPopup.parentNode) {
        floatingPopup.parentNode.removeChild(floatingPopup);
      }
      floatingPopup = null;
    }, 200);
  }
}

// ===========================
// TRANSLATION
// ===========================
async function translateText(text) {
  const translationContainer = document.getElementById('parla-translation');
  
  console.log('🌐 Translating text:', text);
  
  try {
    // Get target language from storage
    const settings = await chrome.storage.local.get(['parla_target_language']);
    const targetLanguage = settings.parla_target_language || 'es';
    
    console.log('🎯 Target language:', targetLanguage);
    
    // Simulate API call - Replace with actual translation API
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock translation
    const translation = await mockTranslate(text, targetLanguage);
    
    translationContainer.innerHTML = `
      <div class="parla-translation-result">
        <div class="parla-translation-label">Traducción:</div>
        <div class="parla-translation-text">${escapeHtml(translation)}</div>
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
}

async function mockTranslate(text, targetLang) {
  // This is a mock function - integrate with real translation API
  const translations = {
    'Hello': 'Hola',
    'Thank you': 'Gracias',
    'How are you?': '¿Cómo estás?',
    'Good morning': 'Buenos días',
    'Good night': 'Buenas noches'
  };
  
  return translations[text] || `[${targetLang}] ${text}`;
}

// ===========================
// ACTIONS
// ===========================
async function savePhrase() {
  const translationText = document.querySelector('.parla-translation-text');
  if (!translationText) return;
  
  console.log('💾 Saving phrase...');
  
  const phrase = {
    id: Date.now().toString(),
    original: selectedText,
    translation: translationText.textContent,
    context: getContext(),
    timestamp: Date.now(),
    sourceUrl: window.location.hostname,
    pronunciation: ''
  };
  
  try {
    // Save to chrome.storage
    const result = await chrome.storage.local.get(['parla_phrases']);
    const phrases = result.parla_phrases || [];
    phrases.unshift(phrase);
    await chrome.storage.local.set({ parla_phrases: phrases });
    
    // Notify popup to update count
    chrome.runtime.sendMessage({ 
      action: 'phraseAdded',
      phrase: phrase 
    }).catch(() => console.log('Popup not open'));
    
    console.log('✅ Phrase saved:', phrase);
    
    // Show success feedback
    showNotification('✓ Frase guardada');
    hideFloatingPopup();
  } catch (error) {
    console.error('❌ Error saving phrase:', error);
    showNotification('❌ Error al guardar');
  }
}

function speakText() {
  console.log('🔊 Speaking text:', selectedText);
  
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(selectedText);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
    
    showNotification('🔊 Reproduciendo...');
  } else {
    console.log('❌ Speech synthesis not available');
    showNotification('Text-to-speech no disponible');
  }
}

function getContext() {
  if (isYouTube) return 'YouTube';
  if (isNetflix) return 'Netflix';
  if (isPDF) return 'PDF';
  return window.location.hostname;
}

// ===========================
// NOTIFICATIONS
// ===========================
function showNotification(message) {
  console.log('📢 Showing notification:', message);
  
  const notification = document.createElement('div');
  notification.className = 'parla-notification';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('parla-notification-visible');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('parla-notification-visible');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 2000);
}

// ===========================
// STYLES INJECTION
// ===========================
function injectStyles() {
  const style = document.createElement('style');
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
    
    /* YouTube/Netflix subtitle enhancement */
    .ytp-caption-segment[data-parla-listener="true"],
    .player-timedtext-text-container span[data-parla-listener="true"] {
      transition: all 0.2s;
    }
    
    .ytp-caption-segment[data-parla-listener="true"]:hover,
    .player-timedtext-text-container span[data-parla-listener="true"]:hover {
      background: rgba(188, 162, 242, 0.2) !important;
      padding: 2px 4px;
      border-radius: 4px;
    }
  `;
  
  document.head.appendChild(style);
  console.log('✅ Styles injected');
}

// ===========================
// UTILITIES
// ===========================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===========================
// START
// ===========================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}