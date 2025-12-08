// TODO: ADD FUNCTIONALITY FOR THE EXTENSION POPUP
//THIS CODE IS GENERATING, WE HAVE TO WORK ON IT

// ===========================
// STATE MANAGEMENT
// ===========================
let currentUser = null;
let phrases = [];
let isExtensionActive = true;

// ===========================
// DOM ELEMENTS
// ===========================
const aContainer = document.getElementById('a-container');
const bContainer = document.getElementById('b-container');
const switchContainer = document.getElementById('switch-cnt');
const switchC1 = document.getElementById('switch-c1');
const switchC2 = document.getElementById('switch-c2');

// Toggles
const extensionToggle = document.getElementById('extension-toggle');
const extensionToggleMain = document.getElementById('extension-toggle-main');
const toggleStatus = document.getElementById('toggle-status');

// Buttons
const btnGoogleRegister = document.getElementById('btn-google-register');
const btnLogout = document.getElementById('btn-logout');
const switchBtns = document.querySelectorAll('.switch-btn');

// Mi Espacio Button
const btnMySpace = document.getElementById('btn-my-space');

// Collapsible Tabs
const tabTriggers = document.querySelectorAll('.tab-trigger');
const savedCollapse = document.getElementById('saved-collapse');
const settingsCollapse = document.getElementById('settings-collapse');

// Search
const searchInput = document.getElementById('search-input');
const phrasesContainer = document.getElementById('phrases-container');

// Settings
// This section is getting commented in case we need to revert:
// const targetLanguageSelect = document.getElementById('target-language');
const autoPauseCheckbox = document.getElementById('auto-pause');
const showPronunciationCheckbox = document.getElementById('show-pronunciation');

// User info
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const savedCount = document.getElementById('saved-count');


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

      //Update platform modules with initial state
      this.updatePlatformModules(this.isExtensionActive);
      
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      this.isExtensionActive = true;
      this.autoPauseEnabled = true;
    }
  },

  // Update platform-specific modules
  updatePlatformModules(isActive) {
    if (window.ParlaYouTube?.updateExtensionState) {
      window.ParlaYouTube.updateExtensionState(isActive);
    }
    if (window.ParlaNetflix?.updateExtensionState) {
      window.ParlaNetflix.updateExtensionState(isActive);
    }
    if (window.ParlaPDF?.updateExtensionState) {
      window.ParlaPDF.updateExtensionState(isActive);
    }
  },

  // Configure message listener for settings updates
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('📩 Message received:', request);
      
      if (request.action === 'toggleExtension') {
        this.isExtensionActive = request.active;
        console.log('🔄 Extension toggled:', this.isExtensionActive);
        
        // Update platform modules
        this.updatePlatformModules(this.isExtensionActive);
        
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



// ===========================
// INITIALIZATION
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await verifyBackendAuth();
  loadPhrases();
  initializeEventListeners();
  updateUI();
});

// ===========================
// AUTH FUNCTIONS
// ===========================

/**
 * Verifies if the user has a valid session by checking the backend
 * with credentials: include to validate the cookie
 */
async function verifyBackendAuth() {
  try {
    const profileUrl = getBackendUrl(CONFIG.backend.endpoints.profile);
    
    const response = await fetch(profileUrl, {
      method: 'GET',
      credentials: 'include', // Send cookies with the request
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const userData = await response.json();
      currentUser = {
        name: userData.name || userData.first_name || 'Usuario',
        email: userData.email,
        uid: userData.id,
        photoURL: userData.photo_url || null
      };
      
      // Save to localStorage for quick access
      localStorage.setItem('parla_user', JSON.stringify(currentUser));
      
      if (CONFIG.extension.debugMode) {
        console.log('✅ User authenticated via backend cookie:', currentUser);
      }
      return true;
    } else if (response.status === 401 || response.status === 403) {
      // Cookie is invalid or expired
      if (CONFIG.extension.debugMode) {
        console.log('⚠️ Backend session invalid or expired');
      }
      currentUser = null;
      localStorage.removeItem('parla_user');
      return false;
    }
  } catch (error) {
    if (CONFIG.extension.debugMode) {
      console.error('❌ Error verifying backend auth:', error);
    }
    currentUser = null;
    localStorage.removeItem('parla_user');
    return false;
  }
}

function handleGoogleAuth() {
  // Redirect to frontend login page where Google OAuth is handled
  const loginUrl = getFrontendUrl(CONFIG.frontend.pages.login);
  
  window.open(loginUrl, '_blank');
  
  showNotification('Abriendo página de login...');
  
  // Check for cookie every N seconds for up to N*attempts seconds
  let attempts = 0;
  const checkInterval = setInterval(async () => {
    attempts++;
    
    if (attempts > CONFIG.extension.authCheckAttempts) {
      clearInterval(checkInterval);
      return;
    }
    
    const isAuthenticated = await verifyBackendAuth();
    if (isAuthenticated) {
      clearInterval(checkInterval);
      updateUI();
      showNotification('¡Sesión iniciada correctamente!');
    }
  }, CONFIG.extension.authCheckInterval);
}

function handleLogout() {
  if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
    currentUser = null;
    phrases = [];
    localStorage.removeItem('parla_user');
    localStorage.removeItem('parla_phrases');
    
    updateUI();
    showNotification('Sesión cerrada');
  }
}

// ===========================
// UI UPDATE FUNCTIONS
// ===========================
function updateUI() {
  if (currentUser) {
    // Show main view
    aContainer.classList.add('is-hidden');
    bContainer.classList.remove('is-hidden');
    switchContainer.classList.add('is-hidden');

    bContainer.classList.add('is-txl');  
    bContainer.style.width = '400px';   

    // Update user info
    userName.textContent = currentUser.name;
    userEmail.textContent = currentUser.email;
    
    // Update phrases
    renderPhrases();
  } else {
    // Show register view
    aContainer.classList.remove('is-hidden');
    bContainer.classList.add('is-hidden');
    switchContainer.classList.remove('is-hidden');
  }
  
  updateToggleStatus();
  
  // Apply visual state on load
  const mainContainer = document.querySelector('.main');
  const tutorialImg = document.querySelector('.tutorial-img');
  
  if (!isExtensionActive) {
    mainContainer.classList.add('extension-disabled');

    if (tutorialImg) {
      tutorialImg.src = '/icons/chiguirosleeping.png';
      tutorialImg.alt = 'Chiguiro durmiendo';
    }
  } else {
    mainContainer.classList.remove('extension-disabled');

    if (tutorialImg) {
      tutorialImg.src = '/icons/chiguirohesitating.png';
      tutorialImg.alt = 'Chiguiro pensando';
    }
  }
}
// ===========================
// TOGGLE EXTENSION
// ===========================
async function toggleExtension(active) {
  isExtensionActive = active;
  
  // Sync both toggles
  extensionToggle.checked = active;
  if (extensionToggleMain) {
    extensionToggleMain.checked = active;
  }
  
  const mainContainer = document.querySelector('.main');
  const tutorialImg = document.querySelector('.tutorial-img');
  
  if (active) {
    mainContainer.classList.remove('extension-disabled');
    
    setTimeout(() => {
      if (tutorialImg) {
        tutorialImg.style.opacity = '0';
        tutorialImg.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
          tutorialImg.src = '/icons/chiguirohesitating.png';
          tutorialImg.alt = 'Chiguiro pensando';
          
          setTimeout(() => {
            tutorialImg.style.opacity = '1';
            tutorialImg.style.transform = 'scale(1)';
          }, 50);
        }, 300);
      }
    }, 100);
    
  } else {
    mainContainer.classList.add('extension-disabled');
    
    setTimeout(() => {
      if (tutorialImg) {
        tutorialImg.style.opacity = '0';
        tutorialImg.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
          tutorialImg.src = '/icons/chiguirosleeping.png';
          tutorialImg.alt = 'Chiguiro durmiendo';
          
          setTimeout(() => {
            tutorialImg.style.opacity = '1';
            tutorialImg.style.transform = 'scale(1)';
          }, 50);
        }, 300);
      }
    }, 100);
  }
  
  updateToggleStatus();
  
  //Save to chrome.storage.local (not localStorage)
  try {
    await chrome.storage.local.set({ 
      'parla_extension_active': active 
    });
    console.log('✅ Extension state saved:', active);
  } catch (error) {
    console.error('❌ Error saving extension state:', error);
  }
  
  // Send message to ALL tabs with content scripts
  try {
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggleExtension',
          active: active
        });
        console.log(`✅ Message sent to tab ${tab.id}`);
      } catch (err) {
        // Tab might not have content script, ignore
        console.log(`⚠️ Could not send to tab ${tab.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('❌ Error sending messages to tabs:', error);
  }
  
  // Notification with delay
  setTimeout(() => {
    showNotification(active ? 'Extensión activada' : 'Extensión desactivada');
  }, 500);
}

// También actualiza tu función updateToggleStatus para transiciones suaves
function updateToggleStatus() {
  const status = isExtensionActive ? 'Activa' : 'Inactiva';
  const statusElement = document.getElementById('toggle-status');
  
  if (statusElement) {
    // Fade out
    statusElement.style.opacity = '0';
    statusElement.style.transform = 'translateX(-5px)';
    
    setTimeout(() => {
      statusElement.textContent = status;
      
      // Fade in
      setTimeout(() => {
        statusElement.style.opacity = '1';
        statusElement.style.transform = 'translateX(0)';
      }, 50);
    }, 200);
  }
}
// ===========================
// MI ESPACIO BUTTON
// ===========================
function handleMySpaceClick() {
  // Redirect to external website
  const url = 'http://localhost:8080/dashboard';
  window.open(url, '_blank');
}

// ===========================
// COLLAPSIBLE TABS
// ===========================
function handleTabToggle(tabName) {
  const trigger = document.querySelector(`[data-tab="${tabName}"]`);
  const collapse = document.getElementById(`${tabName}-collapse`);
  
  // Toggle active state
  const isActive = trigger.classList.contains('active');
  
  if (isActive) {
    // Close this tab
    trigger.classList.remove('active');
    collapse.classList.remove('active');
  } else {
    // Close all other tabs
    tabTriggers.forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-collapse').forEach(c => c.classList.remove('active'));
    
    // Open this tab
    trigger.classList.add('active');
    collapse.classList.add('active');
  }
}

// ===========================
// PHRASES MANAGEMENT
// ===========================
function loadPhrases() {
  const storedPhrases = localStorage.getItem('parla_phrases');
  if (storedPhrases) {
    phrases = JSON.parse(storedPhrases);
  } else {
    // Demo data
    phrases = [
      {
        id: '1',
        original: 'Hello, how are you?',
        translation: 'Hola, ¿cómo estás?',
        context: 'greeting',
        timestamp: Date.now() - 86400000,
        sourceUrl: 'example.com',
        pronunciation: 'həˈloʊ, haʊ ɑr ju'
      },
      {
        id: '2',
        original: 'Thank you very much',
        translation: 'Muchas gracias',
        context: 'polite expression',
        timestamp: Date.now() - 172800000,
        sourceUrl: 'example.com',
        pronunciation: 'θæŋk ju ˈvɛri mʌʧ'
      }
    ];
  }
  
  savedCount.textContent = phrases.length;
}

function savePhrases() {
  localStorage.setItem('parla_phrases', JSON.stringify(phrases));
  savedCount.textContent = phrases.length;
}

function deletePhrase(id) {
  phrases = phrases.filter(p => p.id !== id);
  savePhrases();
  renderPhrases();
  showNotification('Frase eliminada');
}

function renderPhrases(filter = '') {
  const filteredPhrases = filter 
    ? phrases.filter(p => 
        p.original.toLowerCase().includes(filter.toLowerCase()) ||
        p.translation.toLowerCase().includes(filter.toLowerCase())
      )
    : phrases;

  if (filteredPhrases.length === 0) {
    phrasesContainer.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-bookmark"></i>
        <h3>${filter ? 'No se encontraron resultados' : 'No hay frases guardadas'}</h3>
        <p>${filter ? 'Intenta con otra búsqueda' : 'Selecciona texto en cualquier página y guárdalo para empezar.'}</p>
      </div>
    `;
    return;
  }

  phrasesContainer.innerHTML = filteredPhrases.map(phrase => `
    <div class="phrase-card" data-id="${phrase.id}">
      <div class="phrase-header">
        <span class="phrase-date">${formatDate(phrase.timestamp)}</span>
        <button class="phrase-delete" data-id="${phrase.id}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
      <div class="phrase-content">
        <p class="phrase-original">${escapeHtml(phrase.original)}</p>
        <p class="phrase-translation">${escapeHtml(phrase.translation)}</p>
        ${phrase.pronunciation && showPronunciationCheckbox.checked ? 
          `<p class="phrase-pronunciation">/${phrase.pronunciation}/</p>` : ''}
      </div>
      <div class="phrase-footer">
        <span class="phrase-source">
          <i class="bi bi-link-45deg"></i>
          ${phrase.sourceUrl}
        </span>
        <button class="phrase-speak" data-text="${escapeHtml(phrase.original)}">
          <i class="bi bi-volume-up"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Add event listeners to delete buttons
  document.querySelectorAll('.phrase-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      deletePhrase(id);
    });
  });

  // Add event listeners to speak buttons
  document.querySelectorAll('.phrase-speak').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const text = e.currentTarget.dataset.text;
      speakText(text);
    });
  });
}

// ===========================
// SETTINGS
// ===========================
async function loadSettings() {
  try {
    // Load from chrome.storage.local
    const result = await chrome.storage.local.get([
      'parla_extension_active',
      'parla_auto_pause',
      'parla_show_pronunciation'
    ]);
    
    const settings = {
      autoPause: result.parla_auto_pause !== false,
      showPronunciation: result.parla_show_pronunciation !== false,
      extensionActive: result.parla_extension_active !== false
    };

    autoPauseCheckbox.checked = settings.autoPause;
    showPronunciationCheckbox.checked = settings.showPronunciation;
    extensionToggle.checked = settings.extensionActive;
    if (extensionToggleMain) {
      extensionToggleMain.checked = settings.extensionActive;
    }
    isExtensionActive = settings.extensionActive;
    
    console.log('✅ Settings loaded:', settings);
  } catch (error) {
    console.error('❌ Error loading settings:', error);
    // Defaults
    isExtensionActive = true;
    autoPauseCheckbox.checked = true;
    showPronunciationCheckbox.checked = true;
  }
}


async function saveSettings() {
  // This section is getting commented in case we need to revert:
  // localStorage.setItem('parla_target_language', targetLanguageSelect.value);
  try {
    await chrome.storage.local.set({
      'parla_auto_pause': autoPauseCheckbox.checked,
      'parla_show_pronunciation': showPronunciationCheckbox.checked
    });
    
    console.log('✅ Settings saved');
    renderPhrases(searchInput.value);
  } catch (error) {
    console.error('❌ Error saving settings:', error);
  }
}


// ===========================
// EVENT LISTENERS
// ===========================
function initializeEventListeners() {
  // Auth buttons
  btnGoogleRegister.addEventListener('click', handleGoogleAuth);
  btnLogout.addEventListener('click', handleLogout);

  // Mi Espacio button
  if (btnMySpace) {
    btnMySpace.addEventListener('click', handleMySpaceClick);
  }

  // Collapsible tab triggers
  tabTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const tabName = trigger.dataset.tab;
      handleTabToggle(tabName);
    });
  });

  // Switch buttons (login/register toggle)
  switchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchC1.classList.toggle('is-hidden');
      switchC2.classList.toggle('is-hidden');
      aContainer.classList.toggle('is-txl');
      bContainer.classList.toggle('is-txl');
      switchContainer.classList.add('is-gx');
      setTimeout(() => {
        switchContainer.classList.remove('is-gx');
      }, 1500);
    });
  });

  // Extension toggles
  extensionToggle.addEventListener('change', (e) => {
    toggleExtension(e.target.checked);
  });

  if (extensionToggleMain) {
    extensionToggleMain.addEventListener('change', (e) => {
      toggleExtension(e.target.checked);
    });
  }

  // Search
  searchInput.addEventListener('input', (e) => {
    renderPhrases(e.target.value);
  });

  // Settings
  // This section is getting commented in case we need to revert:
  // targetLanguageSelect.addEventListener('change', saveSettings);
  autoPauseCheckbox.addEventListener('change', saveSettings);
  showPronunciationCheckbox.addEventListener('change', saveSettings);
}

// ===========================
// UTILITY FUNCTIONS
// ===========================
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  
  return date.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short' 
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  } else {
    showNotification('Text-to-speech no disponible');
  }
}

function showNotification(message) {
  // Simple notification (could be enhanced with a toast component)
  console.log('Notification:', message);
  
  // You could add a toast notification here
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1e293b;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Add CSS for toast animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);