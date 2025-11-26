// content/modules/platforms/youtube.js
// Module to handle YouTube subtitle interactions

const ParlaYouTube = {
    videoElement: null,
    clickTimeout: null,
    lastClickTime: 0,
  
    // Setup function to initialize subtitle detection
    setup() {
      console.log('🎥 YouTube detected - Setting up subtitle detection');
      this.waitForPlayer();
    },
  
    // Waits for the video player to load
    waitForPlayer() {
      let attempts = 0;
      const maxAttempts = 50;
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        this.videoElement = document.querySelector('video');
        const captionWindow = document.querySelector('.caption-window, .ytp-caption-window-container');
        
        console.log(`🔍 Attempt ${attempts}: Video=${!!this.videoElement}, Subtitles=${!!captionWindow}`);
        
        if (this.videoElement) {
          console.log('✅ Video found');
          clearInterval(checkInterval);
          this.startSubtitleObserver();
        } else if (attempts >= maxAttempts) {
          console.log('❌ Timeout: No video found');
          clearInterval(checkInterval);
        }
      }, 500);
    },
  
    // Begins observing for subtitle elements
    startSubtitleObserver() {
      console.log('👀 Initialize MutationObserver to detect subtitles...');
      
      const observer = new MutationObserver(() => {
        const subtitleElements = document.querySelectorAll(
          '.ytp-caption-segment, .captions-text span, .ytp-caption-window-container span'
        );
        
        if (subtitleElements.length > 0) {
          console.log(`✅ Found ${subtitleElements.length} subtitles`);
          this.attachSubtitleListeners();
        }
      });
      
      const targetNode = document.querySelector('#movie_player') || document.body;
      observer.observe(targetNode, { childList: true, subtree: true });
      
      console.log('✅ Observer configured');
      this.attachSubtitleListeners();
    },
  
    // Attach event listeners to subtitle elements
    attachSubtitleListeners() {
      console.log('🔗 Attach event listeners to subtitle elements...');
      
      const selectors = [
        '.ytp-caption-segment',
        '.captions-text span',
        '.ytp-caption-window-container span'
      ];
      
      let listenersAdded = 0;
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(subtitle => {
          if (!subtitle.hasAttribute('data-parla-listener')) {
            subtitle.setAttribute('data-parla-listener', 'true');
            subtitle.style.cursor = 'pointer';
            subtitle.style.userSelect = 'text';
            subtitle.style.webkitUserSelect = 'text';
            subtitle.style.mozUserSelect = 'text';
            
            // Use capture phase to catch event first
            subtitle.addEventListener('mouseenter', (e) => this.handleHover(e), true);
            subtitle.addEventListener('mouseleave', (e) => this.handleLeave(e), true);
            subtitle.addEventListener('click', (e) => this.handleClick(e), true);
            
            listenersAdded++;
          }
        });
      });
      
      if (listenersAdded > 0) {
        console.log(`✅ ${listenersAdded} Listeners added to subtitles`);
      }
      
      if (!window.parlaYTObserverActive) {
        window.parlaYTObserverActive = true;
        this.setupContinuousObserver();
      }
    },
  
    // Configure continuous observation for dynamic subtitle changes
    setupContinuousObserver() {
      const observer = new MutationObserver(() => {
        const subtitleElements = document.querySelectorAll(
          '.ytp-caption-segment, .captions-text span, .ytp-caption-window-container span'
        );
        
        subtitleElements.forEach(subtitle => {
          if (!subtitle.hasAttribute('data-parla-listener')) {
            subtitle.setAttribute('data-parla-listener', 'true');
            subtitle.style.cursor = 'pointer';
            subtitle.style.userSelect = 'text';
            subtitle.style.webkitUserSelect = 'text';
            subtitle.style.mozUserSelect = 'text';
            
            subtitle.addEventListener('mouseenter', (e) => this.handleHover(e), true);
            subtitle.addEventListener('mouseleave', (e) => this.handleLeave(e), true);
            subtitle.addEventListener('click', (e) => this.handleClick(e), true);
            
            console.log('➕ Listener added to new subtitle');
          }
        });
      });
      
      const captionContainers = document.querySelectorAll(
        '.caption-window, .ytp-caption-window-container, .captions-text'
      );
      
      captionContainers.forEach(container => {
        observer.observe(container, {
          childList: true,
          subtree: true,
          characterData: true
        });
      });
      
      if (captionContainers.length === 0) {
        const player = document.querySelector('#movie_player');
        if (player) {
          observer.observe(player, { childList: true, subtree: true });
          console.log('👀 Observing the whole player for subtitle changes');
        }
      }
    },
  
    // Handles when the cursor hovers over a subtitle
    handleHover(e) {
      if (!ParlaSettings.isExtensionActive || !ParlaSettings.autoPauseEnabled) return;
      
      console.log('🖱️ Subtitle hover detected');
      
      if (this.videoElement && !this.videoElement.paused) {
        this.videoElement.pause();
        e.currentTarget.setAttribute('data-parla-paused', 'true');
        console.log('⏸️ Video paused');
      }
    },
  
    // Handles when the cursor leaves a subtitle
    handleLeave(e) {
      if (!ParlaSettings.isExtensionActive || !ParlaSettings.autoPauseEnabled) return;
      
      const element = e.currentTarget;
      if (element && element.hasAttribute('data-parla-paused')) {
        setTimeout(() => {
          if (this.videoElement && element && element.isConnected) {
            this.videoElement.play();
            console.log('▶️ Video resumed');
            element.removeAttribute('data-parla-paused');
          }
        }, 300);
      }
    },
  
    // Handles click events on subtitles
    handleClick(e) {
      if (!ParlaSettings.isExtensionActive) return;
      
      // Debounce: prevent multiple clicks within 500ms
      const now = Date.now();
      if (now - this.lastClickTime < 500) {
        console.log('⏭️ Click debounced (too fast)');
        return;
      }
      this.lastClickTime = now;
      
      // Stop propagation immediately
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Clear any pending timeout
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout);
      }
      
      // Delay execution to ensure selection is ready
      this.clickTimeout = setTimeout(() => {
        const subtitle = e.target;
        
        // Try to get selected text first
        const selection = window.getSelection();
        let text = selection.toString().trim();
        
        // If no text is selected, use the full subtitle text
        if (!text || text.length === 0) {
          // Find the actual subtitle element (might be nested)
          const subtitleElement = subtitle.closest('[data-parla-listener="true"]') || subtitle;
          text = subtitleElement.textContent.trim();
          console.log('📝 Using full subtitle text:', text);
        } else {
          console.log('📝 Using selected text:', text);
        }
        
        console.log('🖱️ Subtitle clicked, final text:', text);
  
        if (text && text.length > 0) {
          // Mark that we're handling this click
          window.youtubeSubtitleClickHandled = true;
          
          ParlaPopup.show(e.clientX, e.clientY, text, 'YouTube');
          
          // Reset flag after delay
          setTimeout(() => {
            window.youtubeSubtitleClickHandled = false;
          }, 500);
        } else {
          console.warn('⚠️ No text found in subtitle');
        }
      }, 100); // Small delay to let selection stabilize
    }
  };
  
  // Expose ParlaYouTube globally
  window.ParlaYouTube = ParlaYouTube;
  
  // Debugging function
  window.debugYouTubeSubtitles = function() {
    console.log('🐛 DEBUG: Searching for subtitles...');
    
    const selectors = {
      'Video': 'video',
      'Caption Window': '.caption-window',
      'YTP Caption Segment': '.ytp-caption-segment',
      'Captions Text': '.captions-text',
      'YTP Caption Container': '.ytp-caption-window-container',
      'Movie Player': '#movie_player'
    };
    
    Object.entries(selectors).forEach(([name, selector]) => {
      const elements = document.querySelectorAll(selector);
      console.log(`${name} (${selector}): ${elements.length} found`);
      
      if (elements.length > 0) {
        console.log('  First element:', elements[0]);
        if (elements[0].textContent) {
          console.log('  Text:', elements[0].textContent.substring(0, 50));
        }
      }
    });
    
    console.log('\n📊 Current State:');
    console.log('  videoElement:', ParlaYouTube.videoElement);
    console.log('  isExtensionActive:', ParlaSettings.isExtensionActive);
    console.log('  parlaYTObserverActive:', window.parlaYTObserverActive);
    console.log('  lastClickTime:', ParlaYouTube.lastClickTime);
  };
  
  console.log('✅ ParlaYouTube module loaded - debugYouTubeSubtitles() available');