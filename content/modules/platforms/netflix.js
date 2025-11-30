// modules/platforms/netflix.js

const ParlaNetflix = {
    videoElement: null,
    observer: null,
    lastText: "",
    staticContainer: null,

    // ---------------------------
    // 1. Inject CSS
    // ---------------------------
    injectCSS() {
        if (document.getElementById("parla-netflix-style")) return;

        const style = document.createElement("style");
        style.id = "parla-netflix-style";
        style.innerHTML = `

            /* ===========================================
               GLOBAL FIX — ALLOW TEXT SELECTION
               =========================================== */

            body, html, div, span, p, section, article, * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }

            /* Netflix overlays — disable blocking layers */
            .player-overlay,
            .ltr-1st24vp,
            .player-timedtext,
            .player-timedtext-container,
            .player-timedtext-text-container,
            .nf-player-theme,
            .nf-player-container {
                -webkit-user-select: text !important;
                user-select: text !important;
                pointer-events: none !important; /* 🔥 FIX CLAVE */
            }

            /* ===========================================
               STATIC SUBTITLE CONTAINER
               =========================================== */

            #parla-netflix-static-container {
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

                z-index: 2147483645 !important;

                pointer-events: auto !important;  /* 🔥 VERY IMPORTANT */

                display: none !important;
                justify-content: center !important;
                align-items: center !important;

                transition: opacity 0.2s ease !important;

                user-select: text !important;
            }

            #parla-netflix-static-container.active {
                display: flex !important;
            }

            #parla-netflix-static-container .subtitle-text {
                font-size: 24px !important;
                font-weight: 700 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
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

            .subtitle-word {
                display: inline-block !important;
                padding: 4px 8px !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                user-select: text !important;
                transition: all 0.18s ease !important;
            }

            .subtitle-word:hover {
                background: rgba(74, 144, 226, 0.25) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3) !important;
            }

            .subtitle-word:active {
                transform: translateY(0) !important;
                background: rgba(74, 144, 226, 0.35) !important;
            }

            /* Selection highlight */
            #parla-netflix-static-container *::selection {
                background: rgba(74, 144, 226, 0.85) !important;
                color: white !important;
            }
        `;

        document.head.appendChild(style);

        /* Re-apply selection in case Netflix overwrites styles */
        setInterval(() => {
            document
                .querySelectorAll("#parla-netflix-static-container, #parla-netflix-static-container *")
                .forEach(el => {
                    el.style.userSelect = "text";
                    el.style.webkitUserSelect = "text";
                });
        }, 500);
    },

    // ---------------------------
    // 2. Create static container
    // ---------------------------
    createStaticContainer() {
        let c = document.getElementById("parla-netflix-static-container");
        if (c) return c;

        c = document.createElement("div");
        c.id = "parla-netflix-static-container";
        document.body.appendChild(c);
        return c;
    },

    // ---------------------------
    // 3. Format subtitle text into selectable words
    // ---------------------------
    formatWords(text) {
        return text
            .trim()
            .split(/\s+/)
            .map(w => `<span class="subtitle-word">${w}</span>`)
            .join(" ");
    },

    // ---------------------------
    // 4. Show subtitle
    // ---------------------------
    showSubtitle(text) {
        if (!this.staticContainer) this.staticContainer = this.createStaticContainer();
        this.staticContainer.innerHTML = `<div class="subtitle-text">${this.formatWords(text)}</div>`;
        this.staticContainer.classList.add("active");
        this.attachWordEvents();
    },

    hideSubtitle() {
        this.staticContainer?.classList.remove("active");
    },

    // ---------------------------
    // 5. Word events
    // ---------------------------
    attachWordEvents() {
        if (!this.staticContainer) return;

        const words = this.staticContainer.querySelectorAll(".subtitle-word");

        words.forEach(word => {
            word.addEventListener("mouseup", e => this.onWordClick(e));
        });

        this.staticContainer.addEventListener("mouseenter", () => this.pauseVideo());
        this.staticContainer.addEventListener("mouseleave", () => this.resumeVideo());
    },

    onWordClick(e) {
        if (!ParlaSettings?.isExtensionActive) return;

        const selected = window.getSelection().toString().trim();
        if (selected.length > 1) {
            ParlaPopup?.show(e.clientX, e.clientY, selected, "Netflix");
            return;
        }

        const word = e.target.textContent.trim();
        if (word) {
            ParlaPopup?.show(e.clientX, e.clientY, word, "Netflix");
            return;
        }
    },

    // ---------------------------
    // 6. Auto pause
    // ---------------------------
    pauseVideo() {
        if (this.videoElement && !this.videoElement.paused) {
            this.videoElement.pause();
            this.staticContainer?.setAttribute("data-paused", "true");
        }
    },

    resumeVideo() {
        setTimeout(() => {
            if (this.videoElement && this.staticContainer?.hasAttribute("data-paused")) {
                this.videoElement.play();
                this.staticContainer.removeAttribute("data-paused");
            }
        }, 250);
    },

    // ---------------------------
    // 7. Observe subtitle changes
    // ---------------------------
    observeNetflixSubtitles() {
        const target = document.body;

        this.observer = new MutationObserver(() => {
            const el = document.querySelector(".player-timedtext-text-container");

            if (!el) return this.hideSubtitle();

            const text = el.textContent.trim();
            if (!text || text === this.lastText) return;

            this.lastText = text;
            this.showSubtitle(text);
        });

        this.observer.observe(target, {
            childList: true,
            subtree: true,
            characterData: true
        });
    },

    // ---------------------------
    // 8. Setup
    // ---------------------------
    setup() {

        this.injectCSS();

        const interval = setInterval(() => {
            this.videoElement = document.querySelector("video");
            if (this.videoElement) {
                clearInterval(interval);
                this.observeNetflixSubtitles();
            }
        }, 400);
    },

    cleanup() {
        if (this.observer) this.observer.disconnect();
        if (this.staticContainer) this.staticContainer.remove();
    }
};

window.ParlaNetflix = ParlaNetflix;
