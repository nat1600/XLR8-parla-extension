// utils/helpers.js

const ParlaHelpers = {
    // Escape HTML entities to prevent XSS

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
  
    // Show notification on screen
    showNotification(message) {
      console.log('🔔 Showing notification:', message);
      
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
    },
  
    // Obtain context string based on page type
    getContext(isYouTube, isNetflix, isPDF) {
      if (isYouTube) return 'YouTube';
      if (isNetflix) return 'Netflix';
      if (isPDF) return 'PDF';
      return window.location.hostname;
    },
  
   // Detect page type
    detectPageType() {
      const url = window.location.href;
      return {
        isYouTube: url.includes('youtube.com/watch'),
        isNetflix: url.includes('netflix.com/watch'),
        isPDF: url.includes('.pdf') || document.contentType === 'application/pdf'
      };
    }
  };
  
// Expose ParlaHelpers globally
  window.ParlaHelpers = ParlaHelpers;