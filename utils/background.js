// ===========================
// BACKEND CONNECTION MANAGER
// ===========================

/**
 * Helper function to build backend URLs with fallback defaults
 */
function getBackendApiUrl(endpoint) {
	const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.backend?.url)
		? CONFIG.backend.url
		: 'http://localhost:8000';
	return baseUrl + endpoint;
}

/**
 * Make authenticated API calls to the backend
 */
async function callBackendApi(endpoint, method = 'GET', body = null) {
	const url = getBackendApiUrl(endpoint);
	const options = {
		method,
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include' // Send cookies for authentication
	};

	if (body && method !== 'GET') {
		options.body = JSON.stringify(body);
	}

	const response = await fetch(url, options);
	
	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));
		throw error;
	}

	return await response.json();
}

// ===========================
// MESSAGE HANDLERS
// ===========================

// Maneja solicitudes de guardar frase desde content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'savePhrase') {
		const phrasesEndpoint = (typeof CONFIG !== 'undefined' && CONFIG.backend?.endpoints?.phrases)
			? CONFIG.backend.endpoints.phrases
			: '/api/phrases/phrases/';

		callBackendApi(phrasesEndpoint, 'POST', request.phrase)
			.then(data => {
				sendResponse({ success: true, savedPhrase: data });
			})
			.catch(error => {
				sendResponse({ success: false, error: error.message || error });
			});

		return true;
	}
});

// Maneja solicitudes de traducción desde content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'translate') {
		const translateEndpoint = (typeof CONFIG !== 'undefined' && CONFIG.backend?.endpoints?.translate)
			? CONFIG.backend.endpoints.translate
			: '/api/phrases/translate/';

		callBackendApi(translateEndpoint, 'POST', {
			text: request.text,
			source_lang: request.source_lang,
			target_lang: request.target_lang
		})
			.then(data => {
				sendResponse({ success: true, translation: data.translation });
			})
			.catch(error => {
				sendResponse({ success: false, error: error.message });
			});

		// Indica que la respuesta será asíncrona
		return true;
	}
});
