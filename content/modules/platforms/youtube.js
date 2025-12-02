// content/modules/platforms/youtube.js


const ParlaYouTube = {
    videoElement: null,
    lastClickTime: 0,
    observer: null,
    subtitleContainer: null,

    // Selector centralizado para subtítulos
    getSubtitleElements() {
        return document.querySelectorAll(
            '.ytp-caption-segment, .captions-text span, .ytp-caption-window-container span, #eLangSubs'
        );
    },

    // Crear contenedor estático personalizado
    createStaticContainer() {
        if (document.getElementById('parla-static-subtitle-container')) {
            return document.getElementById('parla-static-subtitle-container');
        }

        const container = document.createElement('div');
        container.id = 'parla-static-subtitle-container';
        document.body.appendChild(container);
        return container;
    },

    // Inyectar CSS mejorado estilo eLang
    injectSubtitleCSS() {
        if (document.getElementById('parla-youtube-style')) return;

        const style = document.createElement('style');
        style.id = 'parla-youtube-style';
        style.innerHTML = `
       
            #parla-static-subtitle-container {
                position: fixed !important;
                bottom: 120px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                
                background: rgba(8, 8, 12, 0.95) !important;
                backdrop-filter: blur(16px) saturate(180%) !important;
                
                padding: 20px 32px !important;
                border-radius: 16px !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5) !important;
                
                max-width: 90vw !important;
                min-width: 300px !important;
                width: fit-content !important;
                
                z-index: 9999999 !important;
                pointer-events: auto !important;
                
                display: none !important;
                justify-content: center !important;
                align-items: center !important;
                
                transition: opacity 0.2s ease !important;
            }

            #parla-static-subtitle-container.active {
                display: flex !important;
            }

            #parla-static-subtitle-container .subtitle-text {
                font-size: 24px !important;
                font-weight: 700 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif !important;
                color: #ffffff !important;
                line-height: 1.6 !important;
                text-align: center !important;
                
                user-select: text !important;
                cursor: text !important;
                
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 8px !important;
                justify-content: center !important;
            }

            /* Cada palabra como elemento seleccionable */
            #parla-static-subtitle-container .subtitle-word {
                display: inline-block !important;
                padding: 4px 8px !important;
                border-radius: 6px !important;
                user-select: text !important;
                cursor: text !important;
                transition: background 0.15s ease !important;
            }

            #parla-static-subtitle-container .subtitle-word:hover {
                background: rgba(255, 255, 255, 0.15) !important;
            }

            /* Selección visual mejorada */
            #parla-static-subtitle-container *::selection {
                background: rgba(74, 144, 226, 0.85) !important;
                color: white !important;
            }

            /* Ocultar subtítulos originales de YouTube */
            .ytp-caption-window-container,
            .caption-window,
            .ytp-caption-segment {
                display: none !important;
            }

            #eLangSubsWrapper,
            #eLangSubs {
                display: none !important;
            }

            #parla-static-subtitle-container .subtitle-word {
                display: inline-block !important;
                padding: 4px 8px !important;
                border-radius: 6px !important;
                user-select: text !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                position: relative !important;
            }

            #parla-static-subtitle-container .subtitle-word:hover {
                background: rgba(74, 144, 226, 0.25) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3) !important;
            }

            #parla-static-subtitle-container .subtitle-word:active {
                transform: translateY(0) !important;
                background: rgba(74, 144, 226, 0.35) !important;
            }

            /* Hide subtitles when extension is disabled */
            body.parla-disabled #parla-static-subtitle-container {
                display: none !important;
            }

            /* Show native YouTube subtitles when Parla is disabled */
            body.parla-disabled .ytp-caption-window-container,
            body.parla-disabled .caption-window,
            body.parla-disabled .ytp-caption-segment {
                display: block !important;
            }
        `;

        document.head.appendChild(style);
    },

    // Procesar texto en palabras individuales
    processTextToWords(text) {
        return text
            .trim()
            .split(/\s+/)
            .map(word => `<span class="subtitle-word">${word}</span>`)
            .join(' ');
    },

    // Mostrar subtítulo en contenedor estático
    showStaticSubtitle(text) {
        if (!this.subtitleContainer) {
            this.subtitleContainer = this.createStaticContainer();
        }

        const processedText = this.processTextToWords(text);
        this.subtitleContainer.innerHTML = `<div class="subtitle-text">${processedText}</div>`;
        this.subtitleContainer.classList.add('active');

        // Adjuntar listeners a las palabras
        this.attachWordListeners();
    },

    // Ocultar subtítulo estático
    hideStaticSubtitle() {
        if (this.subtitleContainer) {
            this.subtitleContainer.classList.remove('active');
        }
    },

    // Adjuntar listeners a palabras individuales
    attachWordListeners() {
        const words = this.subtitleContainer?.querySelectorAll('.subtitle-word');
        if (!words) return;

        words.forEach(word => {
            word.addEventListener('mouseup', e => this.handleWordClick(e));
        });

        // Listener para el contenedor completo
        this.subtitleContainer.addEventListener('mouseenter', () => this.pauseVideo());
        this.subtitleContainer.addEventListener('mouseleave', () => this.resumeVideo());
    },

    // Manejar clic en palabra
    handleWordClick(e) {
        if (!ParlaSettings?.isExtensionActive) return;

        const now = Date.now();
        if (now - this.lastClickTime < 250) return;
        this.lastClickTime = now;

        // Detectar selección manual
        const manual = window.getSelection().toString().trim();
        if (manual.length > 1) {
            ParlaPopup?.show(e.clientX, e.clientY, manual, "YouTube");
            return;
        }

        // Modo quick select: palabra individual
        if (ParlaSettings.quickSelectMode) {
            const word = e.target.textContent.trim();
            if (word) {
                ParlaPopup?.show(e.clientX, e.clientY, word, "YouTube");
                return;
            }
        }

        // Fallback: texto completo
        const fullText = this.subtitleContainer?.textContent.trim();
        if (fullText) {
            ParlaPopup?.show(e.clientX, e.clientY, fullText, "YouTube");
        }
    },

    // Pausar video
    pauseVideo() {
        if (this.videoElement && !this.videoElement.paused) {
            this.videoElement.pause();
            this.subtitleContainer?.setAttribute('data-parla-paused', 'true');
        }
    },

    // Reanudar video
    resumeVideo() {
        setTimeout(() => {
            if (this.videoElement && this.subtitleContainer?.hasAttribute('data-parla-paused')) {
                this.videoElement.play();
                this.subtitleContainer.removeAttribute('data-parla-paused');
            }
        }, 300);
    },

    //NEW: Update UI based on extension state
    updateExtensionState(isActive) {
        console.log('🎥 YouTube: Extension state changed to:', isActive);
        
        if (isActive) {
            document.body.classList.remove('parla-disabled');
        } else {
            document.body.classList.add('parla-disabled');
            this.hideStaticSubtitle();
        }
    },

    // Inicialización
    setup() {
        this.injectSubtitleCSS();
        this.subtitleContainer = this.createStaticContainer();

        // Deactivate if extension is not active
        if (!ParlaSettings?.isExtensionActive) {
            document.body.classList.add('parla-disabled');
        }

        document.addEventListener("selectionchange", () => {
            const s = window.getSelection().toString().trim();
            if (s.length > 0) ParlaPopup?.hide();
        });

        this.waitForPlayer();
    },

    waitForPlayer() {
        const interval = setInterval(() => {
            this.videoElement = document.querySelector('video');
            if (this.videoElement) {
                clearInterval(interval);
                this.startSubtitleObserver();
            }
        }, 500);
    },

    // Observar cambios en subtítulos nativos de YouTube
    startSubtitleObserver() {
        this.observer = new MutationObserver(() => {
            // If extension is inactive, hide subtitles
            if (!ParlaSettings?.isExtensionActive) {
                this.hideStaticSubtitle();
                return;
            }

            const nativeSubtitle = document.querySelector('.ytp-caption-segment');
            
            if (nativeSubtitle && nativeSubtitle.textContent.trim()) {
                const text = nativeSubtitle.textContent.trim();
                this.showStaticSubtitle(text);
            } else {
                this.hideStaticSubtitle();
            }
        });

        const target = document.querySelector('#movie_player') || document.body;
        this.observer.observe(target, { 
            childList: true, 
            subtree: true,
            characterData: true 
        });

        // Check inicial
        const initialSubtitle = document.querySelector('.ytp-caption-segment');
        if (initialSubtitle?.textContent.trim()) {
            this.showStaticSubtitle(initialSubtitle.textContent.trim());
        }
    },

    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.subtitleContainer) {
            this.subtitleContainer.remove();
            this.subtitleContainer = null;
        }
    }
};

// Configuración inicial
if (typeof ParlaSettings !== 'undefined') {
    ParlaSettings.quickSelectMode = true;
}

window.ParlaYouTube = ParlaYouTube;

window.toggleQuickSelectMode = function() {
    if (typeof ParlaSettings !== 'undefined') {
        ParlaSettings.quickSelectMode = !ParlaSettings.quickSelectMode;
        return ParlaSettings.quickSelectMode;
    }
    return false;
};

