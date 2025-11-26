// modules/platforms/netflix.js

// Module to handle Netflix subtitle interactions with an overlay

const ParlaNetflix = {
    videoElement: null,
    overlayInterval: null,
  
    // Setup function to initialize subtitle detection
    setup() {
      console.log('🎬 Netflix detected - Setting up subtitle detection with overlay');
      this.waitForPlayer();
    },
  
    // Waits for the video player to load
    waitForPlayer() {
      let attempts = 0;
      const maxAttempts = 50;
      
      const checkInterval = setInterval(() => {
        attempts++;
        this.videoElement = document.querySelector('video');
        const subtitlesContainer = document.querySelector(
          '.player-timedtext, .player-timedtext-container, [class*="timedtext"]'
        );
        
        console.log(`🔍 Netflix attempt ${attempts}: Video=${!!this.videoElement}, Subtitles=${!!subtitlesContainer}`);
        
        if (this.videoElement) {
          console.log('✅ Netflix video found');
          clearInterval(checkInterval);
          setTimeout(() => {
            this.startSubtitleObserver();
            this.createOverlay();
          }, 1000);
        } else if (attempts >= maxAttempts) {
          console.log('⏱️ Netflix timeout');
          clearInterval(checkInterval);
        }
      }, 500);
    },
  
    // Creates an overlay to capture subtitle interactions
    createOverlay() {
      if (document.getElementById('parla-netflix-overlay')) {
        console.log('⚠️ Overlay already exists');
        return;
      }
      
      console.log('🎯 Creating Netflix subtitle overlay...');
      
      const overlay = document.createElement('div');
      overlay.id = 'parla-netflix-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483645;
      `;
      
      document.body.appendChild(overlay);
      
      // Update every 100ms
      this.overlayInterval = setInterval(() => {
        if (!ParlaSettings.isExtensionActive) return;
        this.updateOverlay(overlay);
      }, 100);
      
      //Use DOM as a backup for changes
      const subtitleObserver = new MutationObserver(() => {
        this.updateOverlay(overlay);
      });
      
      const timedTextContainer = document.querySelector('.player-timedtext');
      if (timedTextContainer) {
        subtitleObserver.observe(timedTextContainer, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true
        });
      }
      
      this.updateOverlay(overlay);
      
      console.log('✅ Netflix overlay created with interval updater');
    },
  
    //Updates the overlay position and content
    updateOverlay(overlay) {
      if (!overlay || !overlay.parentNode) return;
      
      const subtitleContainer = document.querySelector('.player-timedtext-text-container');
      
      // Clear overlay if no subtitles
      if (!subtitleContainer || 
          !subtitleContainer.textContent.trim() || 
          subtitleContainer.style.display === 'none') {
        if (overlay.children.length > 0) {
          overlay.innerHTML = '';
        }
        return;
      }
      
      const text = subtitleContainer.textContent.trim();
      const rect = subtitleContainer.getBoundingClientRect();
      
      // Verify if subtitle is visible
      const existingArea = overlay.querySelector('[data-subtitle-text]');
      if (existingArea && existingArea.getAttribute('data-subtitle-text') === text) {
        // Update position if changed
        const currentLeft = parseInt(existingArea.style.left);
        const currentTop = parseInt(existingArea.style.top);
        
        if (Math.abs(currentLeft - rect.left) > 5 || Math.abs(currentTop - rect.top) > 5) {
          existingArea.style.left = `${rect.left}px`;
          existingArea.style.top = `${rect.top}px`;
          existingArea.style.width = `${rect.width}px`;
          existingArea.style.height = `${rect.height}px`;
        }
        return;
      }
      
      // Clean existing areas
      overlay.innerHTML = '';
      
      // Create clickable area
      const clickableArea = document.createElement('div');
      clickableArea.style.cssText = `
        position: absolute;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        pointer-events: auto;
        cursor: text;
        background: transparent;
        transition: background 0.2s;
        border-radius: 6px;
        padding: 6px 10px;
        box-sizing: border-box;
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
      `;
      
      clickableArea.setAttribute('data-subtitle-text', text);
      
      // Add invisible text for selection
      clickableArea.textContent = text;
      clickableArea.style.color = 'transparent';
  
      // Obtain subtitle styles
      const subtitleStyles = window.getComputedStyle(subtitleContainer);
      const baseFontSize = parseFloat(subtitleStyles.fontSize);
  
      clickableArea.style.fontSize = `${baseFontSize * 3.5}px`;
      clickableArea.style.fontFamily = subtitleStyles.fontFamily;
      clickableArea.style.fontWeight = subtitleStyles.fontWeight;
      clickableArea.style.textAlign = subtitleStyles.textAlign;
      
      const baseLineHeight = parseFloat(subtitleStyles.lineHeight);
      clickableArea.style.lineHeight = baseLineHeight ? `${baseLineHeight * 5.5}px` : '5.5';
  
      clickableArea.style.display = 'flex';
      clickableArea.style.alignItems = 'center';
      clickableArea.style.justifyContent = 'center';
      
      // Hover effects and auto-pause
      clickableArea.addEventListener('mouseenter', () => {
        clickableArea.style.background = 'rgba(188, 162, 242, 0.2)';
        clickableArea.style.boxShadow = '0 2px 8px rgba(188, 162, 242, 0.3)';
        
        if (ParlaSettings.autoPauseEnabled && this.videoElement && !this.videoElement.paused) {
          this.videoElement.pause();
          clickableArea.setAttribute('data-paused', 'true');
          console.log('⏸️ Netflix video paused');
        }
      });
      
      clickableArea.addEventListener('mouseleave', () => {
        clickableArea.style.background = 'transparent';
        clickableArea.style.boxShadow = 'none';
        
        if (clickableArea.hasAttribute('data-paused')) {
          setTimeout(() => {
            if (this.videoElement) {
              this.videoElement.play();
              console.log('▶️ Netflix video resumed');
            }
          }, 300);
          clickableArea.removeAttribute('data-paused');
        }
      });
      
      // Manage click events
      clickableArea.addEventListener('mouseup', (e) => {
        if (!ParlaSettings.isExtensionActive) return;
        
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const selection = window.getSelection();
        const selectedTextContent = selection.toString().trim();
        
        console.log('🖱️ Netflix subtitle interaction:', {
          selectedText: selectedTextContent,
          fullText: text
        });
        
        const textToUse = selectedTextContent.length > 0 ? selectedTextContent : text;
        
        if (textToUse && textToUse.length > 0) {
          window.netflixClickHandled = true;
          
          ParlaPopup.show(e.clientX, e.clientY, textToUse, 'Netflix');
          
          setTimeout(() => {
            window.netflixClickHandled = false;
          }, 500);
        }
      });
      
      clickableArea.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      });
      
      overlay.appendChild(clickableArea);
    },
  
    // Starts observing subtitle changes
    startSubtitleObserver() {
      if (window.netflixObserverActive) {
        console.log('⚠️ Netflix observer already active');
        return;
      }
      
      window.netflixObserverActive = true;
      console.log('👀 Starting Netflix subtitle observer...');
    },
  
    // Cleans up on unload or navigation
    cleanup() {
      if (this.overlayInterval) {
        clearInterval(this.overlayInterval);
        this.overlayInterval = null;
      }
      
      const overlay = document.getElementById('parla-netflix-overlay');
      if (overlay) {
        overlay.remove();
      }
      
      window.netflixObserverActive = false;
    }
  };
  
  // Expose ParlaNetflix globally
  window.ParlaNetflix = ParlaNetflix;
  
  // Debugging function:
  window.debugNetflixSubtitles = function() {
    console.log('DEBUG: Netflix subtitle detection\n');
    
    const video = document.querySelector('video');
    console.log('🔹 Video element:', video);
    console.log('  Paused:', video?.paused);
    
    const containers = [
      '.player-timedtext',
      '.player-timedtext-container',
      '.player-timedtext-text-container',
      '[class*="timedtext"]'
    ];
    
    console.log('\n📦 Subtitle Containers:');
    containers.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`  ${selector}: ${elements.length} found`);
      
      elements.forEach((el, i) => {
        const text = el.textContent.trim();
        if (text) {
          console.log(`    [${i}] Text: "${text.substring(0, 50)}"`);
          console.log(`    [${i}] Display:`, el.style.display);
          console.log(`    [${i}] Position:`, el.getBoundingClientRect());
        }
      });
    });
    
    const overlay = document.getElementById('parla-netflix-overlay');
    console.log('\n🎯 Overlay status:');
    console.log('  Overlay exists:', !!overlay);
    if (overlay) {
      console.log('  Overlay children:', overlay.children.length);
      if (overlay.children.length > 0) {
        const clickable = overlay.children[0];
        console.log('  Clickable area:', {
          text: clickable.getAttribute('data-subtitle-text'),
          position: clickable.style.left + ', ' + clickable.style.top,
          size: clickable.style.width + ' x ' + clickable.style.height
        });
      }
    }
    
    console.log('\n📊 Current State:');
    console.log('  videoElement:', ParlaNetflix.videoElement);
    console.log('  isExtensionActive:', ParlaSettings.isExtensionActive);
    console.log('  netflixObserverActive:', window.netflixObserverActive);
    console.log('  overlayInterval:', ParlaNetflix.overlayInterval);
  };
  
  //  Cleanup on unload
  window.addEventListener('beforeunload', () => {
    ParlaNetflix.cleanup();
  });
  
  // Reinitialize on navigation
  window.addEventListener('popstate', () => {
    if (window.location.href.includes('netflix.com/watch') && ParlaNetflix.videoElement) {
      console.log('🔄 Netflix page changed, reinitializing...');
      ParlaNetflix.cleanup();
      setTimeout(() => {
        ParlaNetflix.setup();
      }, 2000);
    }
  });