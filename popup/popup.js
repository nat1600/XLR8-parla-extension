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

// Tabs
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Search
const searchInput = document.getElementById('search-input');
const phrasesContainer = document.getElementById('phrases-container');

// Settings
const targetLanguageSelect = document.getElementById('target-language');
const autoPauseCheckbox = document.getElementById('auto-pause');
const showPronunciationCheckbox = document.getElementById('show-pronunciation');

// User info
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const savedCount = document.getElementById('saved-count');

// ===========================
// INITIALIZATION
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  loadSettings();
  loadPhrases();
  initializeEventListeners();
  updateUI();
});

// ===========================
// AUTH FUNCTIONS
// ===========================
function loadUserData() {
  // Simulación: Cargar usuario desde storage
  const storedUser = localStorage.getItem('parla_user');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
  }
}

function handleGoogleAuth() {
  // Simulación de autenticación con Google
  const demoUser = {
    name: 'Usuario Demo',
    email: 'demo@parla.com',
    photoURL: null,
    uid: 'demo-uid-' + Date.now()
  };
  
  currentUser = demoUser;
  localStorage.setItem('parla_user', JSON.stringify(demoUser));
  
  updateUI();
  showNotification('¡Bienvenido a Parla!');
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
}

function updateToggleStatus() {
  const status = isExtensionActive ? 'Activa' : 'Inactiva';
  if (toggleStatus) {
    toggleStatus.textContent = status;
    toggleStatus.style.color = isExtensionActive ? '#10b981' : '#ef4444';
  }
}

// ===========================
// TOGGLE EXTENSION
// ===========================
function toggleExtension(active) {
  isExtensionActive = active;
  
  // Sync both toggles
  extensionToggle.checked = active;
  if (extensionToggleMain) {
    extensionToggleMain.checked = active;
  }
  
  updateToggleStatus();
  
  // Save to storage
  localStorage.setItem('parla_extension_active', active);
  
  // Send message to content script (if this were a real extension)
  // chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  //   chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleExtension', active});
  // });
  
  showNotification(active ? 'Extensión activada' : 'Extensión desactivada');
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
function loadSettings() {
  const settings = {
    targetLanguage: localStorage.getItem('parla_target_language') || 'es',
    autoPause: localStorage.getItem('parla_auto_pause') !== 'false',
    showPronunciation: localStorage.getItem('parla_show_pronunciation') !== 'false',
    extensionActive: localStorage.getItem('parla_extension_active') !== 'false'
  };

  targetLanguageSelect.value = settings.targetLanguage;
  autoPauseCheckbox.checked = settings.autoPause;
  showPronunciationCheckbox.checked = settings.showPronunciation;
  extensionToggle.checked = settings.extensionActive;
  if (extensionToggleMain) {
    extensionToggleMain.checked = settings.extensionActive;
  }
  isExtensionActive = settings.extensionActive;
}

function saveSettings() {
  localStorage.setItem('parla_target_language', targetLanguageSelect.value);
  localStorage.setItem('parla_auto_pause', autoPauseCheckbox.checked);
  localStorage.setItem('parla_show_pronunciation', showPronunciationCheckbox.checked);
  
  renderPhrases(searchInput.value);
}

// ===========================
// EVENT LISTENERS
// ===========================
function initializeEventListeners() {
  // Auth buttons
  btnGoogleRegister.addEventListener('click', handleGoogleAuth);
  btnLogout.addEventListener('click', handleLogout);

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

  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
    });
  });

  // Search
  searchInput.addEventListener('input', (e) => {
    renderPhrases(e.target.value);
  });

  // Settings
  targetLanguageSelect.addEventListener('change', saveSettings);
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