// Parla - Background Service Worker
// COMUNICATION con API Django Backend

// API
const API_CONFIG = {
  baseURL: 'http://localhost:8000/api', // Cambiar en producción
  endpoints: {
    translate: '/translate/',
    savePhrase: '/phrases/',
    getPhrases: '/phrases/',
    deletePhrase: '/phrases/',
    auth: {
      google: '/auth/google/',
      verify: '/auth/verify/'
    }
  }
};

// Instalación
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('🗣️ Parla instalado correctamente');
    
    // Configuración inicial local
    chrome.storage.local.set({
      settings: {
        targetLanguage: 'es',
        autoPause: true,
        showPronunciation: true,
        apiUrl: API_CONFIG.baseURL
      },
      extensionEnabled: true
    });
  }
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    handleTranslation(request.text, request.targetLang)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'savePhrase') {
    handleSavePhrase(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'getPhrases') {
    handleGetPhrases()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'googleAuth') {
    handleGoogleAuth()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

// Autenticación con Google OAuth
async function handleGoogleAuth() {

}

// Llamada a API Django - Traducir
async function handleTranslation(text, targetLang = 'es') {
  try {
    const settings = await chrome.storage.local.get(['settings', 'authToken']);
    const apiUrl = settings.settings?.apiUrl || API_CONFIG.baseURL;
    
    const response = await fetch(`${apiUrl}${API_CONFIG.endpoints.translate}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': settings.authToken ? `Bearer ${settings.authToken}` : ''
      },
      body: JSON.stringify({
        text: text,
        target_language: targetLang,
        source_language: 'auto'
      })
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      original: text,
      translated: data.translated_text,
      targetLang: targetLang,
      detectedLang: data.detected_language,
      pronunciation: data.pronunciation || null,
      definitions: data.definitions || [],
      wordType: data.word_type || null
    };
  } catch (error) {
    console.error('Error en traducción:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// api django, save phrase
async function handleSavePhrase(phraseData) {
  try {
    const settings = await chrome.storage.local.get(['settings', 'authToken']);
    const apiUrl = settings.settings?.apiUrl || API_CONFIG.baseURL;

    const response = await fetch(`${apiUrl}${API_CONFIG.endpoints.savePhrase}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': settings.authToken ? `Bearer ${settings.authToken}` : ''
      },
      body: JSON.stringify({
        text: phraseData.text,
        translation: phraseData.translation,
        source_url: phraseData.url,
        source_platform: phraseData.source,
        context: phraseData.context || ''
      })
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
     
    await updateBadge();

    return { 
      success: true, 
      phraseId: data.id,
      message: 'Frase guardada correctamente'
    };
  } catch (error) {
    console.error('Error guardando frase:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

//API Django - Handle 
async function handleGetPhrases() {
  try {
    const settings = await chrome.storage.local.get(['settings', 'authToken']);
    const apiUrl = settings.settings?.apiUrl || API_CONFIG.baseURL;

    const response = await fetch(`${apiUrl}${API_CONFIG.endpoints.getPhrases}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': settings.authToken ? `Bearer ${settings.authToken}` : ''
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      phrases: data.results || data
    };
  } catch (error) {
    console.error('Error obteniendo frases:', error);
    return {
      success: false,
      error: error.message,
      phrases: []
    };
  }
}


async function updateBadge() {
  try {
    const result = await handleGetPhrases();
    if (result.success && result.phrases) {
      const count = result.phrases.length;
      if (count > 0) {
        await chrome.action.setBadgeText({ text: count.toString() });
        await chrome.action.setBadgeBackgroundColor({ color: '#BCA2F2' });
      } else {
        await chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (error) {
    console.error('Error actualizando badge:', error);
  }
}


chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'parla-translator',
    title: 'Traducir con Parla: "%s"',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'parla-translator' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'showTranslation',
      text: info.selectionText
    });
  }
});

// Actualizar badge cada vez que se abre el popup
chrome.runtime.onConnect.addListener(() => {
  updateBadge();
});// Parla - Background Service Worker
// comunitaction con API Django Backend

// api


// Instalación
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('🗣️ Parla instalado correctamente');
    
    // Configuración inicial local
    chrome.storage.local.set({
      settings: {
        targetLanguage: 'es',
        autoPause: true,
        autoTranslate: true,
        apiUrl: API_CONFIG.baseURL
      }
    });
  }
});

// Escuchar mensajes desde content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    handleTranslation(request.text, request.targetLang)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'savePhrase') {
    handleSavePhrase(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'getPhrases') {
    handleGetPhrases()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

// Llamada a API Django - Traducir
async function handleTranslation(text, targetLang = 'es') {
  try {
    const settings = await chrome.storage.local.get(['settings', 'authToken']);
    const apiUrl = settings.settings?.apiUrl || API_CONFIG.baseURL;
    
    const response = await fetch(`${apiUrl}${API_CONFIG.endpoints.translate}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': settings.authToken ? `Bearer ${settings.authToken}` : ''
      },
      body: JSON.stringify({
        text: text,
        target_language: targetLang,
        source_language: 'auto'
      })
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      original: text,
      translated: data.translated_text,
      targetLang: targetLang,
      detectedLang: data.detected_language
    };
  } catch (error) {
    console.error('Error en traducción:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Llamada a API Django - Guardar frase
async function handleSavePhrase(phraseData) {
  try {
    const settings = await chrome.storage.local.get(['settings', 'authToken']);
    const apiUrl = settings.settings?.apiUrl || API_CONFIG.baseURL;

    const response = await fetch(`${apiUrl}${API_CONFIG.endpoints.savePhrase}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': settings.authToken ? `Bearer ${settings.authToken}` : ''
      },
      body: JSON.stringify({
        text: phraseData.text,
        translation: phraseData.translation,
        source_url: phraseData.url,
        source_platform: phraseData.source,
        context: phraseData.context || ''
      })
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Actualizar badge
    await updateBadge();

    return { 
      success: true, 
      phraseId: data.id,
      message: 'Frase guardada correctamente'
    };
  } catch (error) {
    console.error('Error guardando frase:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Llamada a API Django - Obtener frases
async function handleGetPhrases() {
  try {
    const settings = await chrome.storage.local.get(['settings', 'authToken']);
    const apiUrl = settings.settings?.apiUrl || API_CONFIG.baseURL;

    const response = await fetch(`${apiUrl}${API_CONFIG.endpoints.getPhrases}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': settings.authToken ? `Bearer ${settings.authToken}` : ''
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      phrases: data.results || data // Ajusta según tu estructura de respuesta
    };
  } catch (error) {
    console.error('Error obteniendo frases:', error);
    return {
      success: false,
      error: error.message,
      phrases: []
    };
  }
}

// Actualizar badge del icono
async function updateBadge() {
  try {
    const result = await handleGetPhrases();
    if (result.success && result.phrases) {
      const count = result.phrases.length;
      if (count > 0) {
        await chrome.action.setBadgeText({ text: count.toString() });
        await chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
      } else {
        await chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (error) {
    console.error('Error actualizando badge:', error);
  }
}

// Context Menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'parla-translator',
    title: 'Traducir con Parla: "%s"',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'parla-translator' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'showTranslation',
      text: info.selectionText
    });
  }
});

// Actualizar badge cada vez que se abre el popup
chrome.runtime.onConnect.addListener(() => {
  updateBadge();
});