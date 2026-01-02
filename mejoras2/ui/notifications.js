import { Constants } from '../config/supabase-config.js';

class NotificationManager {
    constructor() {
        this.notificationElement = document.getElementById('notification');
        this.setupStyles();
    }
    
    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
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
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    show(message, type = Constants.NOTIFICATION_TYPES.INFO, duration = 3000) {
        if (!this.notificationElement) return;
        
        this.notificationElement.textContent = message;
        this.notificationElement.className = `notification ${type}`;
        this.notificationElement.style.display = 'block';
        this.notificationElement.style.animation = 'slideIn 0.3s ease';
        
        setTimeout(() => {
            this.hide();
        }, duration);
    }
    
    hide() {
        if (!this.notificationElement) return;
        
        this.notificationElement.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            this.notificationElement.style.display = 'none';
            this.notificationElement.style.animation = '';
        }, 300);
    }
    
    success(message, duration = 3000) {
        this.show(message, Constants.NOTIFICATION_TYPES.SUCCESS, duration);
    }
    
    error(message, duration = 3000) {
        this.show(message, Constants.NOTIFICATION_TYPES.ERROR, duration);
    }
    
    warning(message, duration = 3000) {
        this.show(message, Constants.NOTIFICATION_TYPES.WARNING, duration);
    }
    
    info(message, duration = 3000) {
        this.show(message, Constants.NOTIFICATION_TYPES.INFO, duration);
    }
}

export default new NotificationManager();
