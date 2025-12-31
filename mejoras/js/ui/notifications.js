/* ============================================
   SISTEMA DE NOTIFICACIONES
   ============================================
   Sistema centralizado de notificaciones toast:
   - Notificaciones temporales
   - Diferentes tipos (success, error, warning, info)
   - Gestión de cola de notificaciones
   - Sonidos opcionales
   ============================================ */

// ============================================
// CONFIGURACIÓN DE NOTIFICACIONES
// ============================================

class NotificationManager {
    constructor() {
        this.container = document.getElementById('notification');
        this.notificationQueue = [];
        this.isShowing = false;
        this.defaultDuration = 3000; // 3 segundos
        this.maxNotifications = 3;
        this.soundsEnabled = true;
        this.sounds = {
            success: null,
            error: null,
            warning: null,
            info: null
        };
        
        this.initialize();
    }

    /**
     * Inicializa el sistema de notificaciones
     */
    initialize() {
        console.log('🔔 Inicializando NotificationManager...');
        
        // Crear contenedor si no existe
        if (!this.container) {
            this.createNotificationContainer();
        }
        
        // Pre-cargar sonidos (opcional)
        this.preloadSounds();
        
        // Configurar estilos dinámicos
        this.setupStyles();
        
        console.log('✅ NotificationManager inicializado');
    }

    /**
     * Crea el contenedor de notificaciones si no existe
     */
    createNotificationContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notification';
        this.container.className = 'notification';
        document.body.appendChild(this.container);
    }

    /**
     * Pre-carga sonidos para notificaciones
     */
    preloadSounds() {
        if (!this.soundsEnabled) return;
        
        try {
            // Sonidos simples usando AudioContext (sin archivos externos)
            // En una implementación real, podrías cargar archivos de audio
            console.log('🎵 Sonidos de notificación habilitados');
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar sonidos:', error);
            this.soundsEnabled = false;
        }
    }

    /**
     * Configura estilos dinámicos
     */
    setupStyles() {
        // Agregar estilos CSS dinámicos si es necesario
        const styleId = 'notification-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    z-index: 1001;
                    display: none;
                    max-width: 400px;
                    min-width: 300px;
                    transform: translateX(100%);
                    transition: transform 0.3s ease, opacity 0.3s ease;
                    opacity: 0;
                    backdrop-filter: blur(10px);
                }
                
                .notification.show {
                    display: block;
                    transform: translateX(0);
                    opacity: 1;
                }
                
                .notification.success {
                    background: linear-gradient(135deg, #10b981, #059669);
                    border-left: 4px solid #047857;
                }
                
                .notification.error {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    border-left: 4px solid #b91c1c;
                }
                
                .notification.warning {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    border-left: 4px solid #b45309;
                }
                
                .notification.info {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    border-left: 4px solid #1d4ed8;
                }
                
                .notification-icon {
                    margin-right: 10px;
                    font-size: 18px;
                }
                
                .notification-content {
                    flex: 1;
                }
                
                .notification-title {
                    font-weight: 600;
                    margin-bottom: 4px;
                    font-size: 14px;
                }
                
                .notification-message {
                    font-size: 13px;
                    opacity: 0.9;
                    line-height: 1.4;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: white;
                    opacity: 0.7;
                    cursor: pointer;
                    font-size: 16px;
                    margin-left: 10px;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: opacity 0.2s, background 0.2s;
                }
                
                .notification-close:hover {
                    opacity: 1;
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .notification-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    background: rgba(255, 255, 255, 0.5);
                    width: 100%;
                    transform-origin: left;
                    transform: scaleX(1);
                    transition: transform linear;
                }
                
                /* Para múltiples notificaciones */
                .notification-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 1001;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 400px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ============================================
    // MÉTODOS PRINCIPALES
    // ============================================

    /**
     * Muestra una notificación
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de notificación (success, error, warning, info)
     * @param {number} duration - Duración en milisegundos
     * @param {Object} options - Opciones adicionales
     */
    showNotification(message, type = 'info', duration = null, options = {}) {
        const notification = {
            id: Date.now() + Math.random(),
            message,
            type,
            duration: duration || this.defaultDuration,
            title: options.title || this.getDefaultTitle(type),
            icon: options.icon || this.getDefaultIcon(type),
            onClose: options.onClose,
            action: options.action,
            sound: options.sound !== undefined ? options.sound : true
        };
        
        // Reproducir sonido si está habilitado
        if (this.soundsEnabled && notification.sound) {
            this.playSound(type);
        }
        
        // Agregar a la cola
        this.notificationQueue.push(notification);
        
        // Mostrar si no hay otra notificación activa
        if (!this.isShowing) {
            this.showNextNotification();
        }
        
        // Limitar cola
        if (this.notificationQueue.length > this.maxNotifications) {
            this.notificationQueue.shift();
        }
        
        return notification.id;
    }

    /**
     * Muestra la siguiente notificación en la cola
     */
    showNextNotification() {
        if (this.notificationQueue.length === 0) {
            this.isShowing = false;
            return;
        }
        
        this.isShowing = true;
        const notification = this.notificationQueue.shift();
        this.renderNotification(notification);
    }

    /**
     * Renderiza una notificación en la pantalla
     * @param {Object} notification - Objeto de notificación
     */
    renderNotification(notification) {
        // Crear elemento de notificación
        const notificationElement = document.createElement('div');
        notificationElement.className = `notification ${notification.type} show`;
        notificationElement.id = `notification-${notification.id}`;
        
        // Icono según tipo
        const icon = notification.icon;
        
        // Contenido
        notificationElement.innerHTML = `
            <div style="display: flex; align-items: flex-start;">
                <div class="notification-icon">${icon}</div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                </div>
                <button class="notification-close" onclick="window.notifications.closeNotification('${notification.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-progress" id="progress-${notification.id}"></div>
        `;
        
        // Agregar al contenedor principal
        this.container.innerHTML = '';
        this.container.appendChild(notificationElement);
        
        // Agregar acción si existe
        if (notification.action) {
            setTimeout(() => {
                const actionElement = document.createElement('button');
                actionElement.className = 'notification-action';
                actionElement.innerHTML = notification.action.text;
                actionElement.style.cssText = `
                    margin-top: 10px;
                    padding: 4px 12px;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    border-radius: 4px;
                    color: white;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: background 0.2s;
                `;
                actionElement.addEventListener('click', () => {
                    notification.action.callback();
                    this.closeNotification(notification.id);
                });
                
                const content = notificationElement.querySelector('.notification-content');
                if (content) {
                    content.appendChild(actionElement);
                }
            }, 100);
        }
        
        // Animar barra de progreso
        setTimeout(() => {
            const progressBar = document.getElementById(`progress-${notification.id}`);
            if (progressBar) {
                progressBar.style.transition = `transform ${notification.duration}ms linear`;
                progressBar.style.transform = 'scaleX(0)';
            }
        }, 50);
        
        // Auto-ocultar después de la duración
        setTimeout(() => {
            this.closeNotification(notification.id);
        }, notification.duration);
    }

    /**
     * Cierra una notificación específica
     * @param {string} notificationId - ID de la notificación
     */
    closeNotification(notificationId) {
        const notificationElement = document.getElementById(`notification-${notificationId}`);
        if (notificationElement) {
            notificationElement.classList.remove('show');
            notificationElement.style.opacity = '0';
            notificationElement.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.parentNode.removeChild(notificationElement);
                }
                
                // Ejecutar callback si existe
                const notification = this.findNotificationById(notificationId);
                if (notification && notification.onClose) {
                    notification.onClose();
                }
                
                // Mostrar siguiente notificación
                setTimeout(() => this.showNextNotification(), 300);
            }, 300);
        } else {
            // Si no encuentra el elemento, intentar mostrar siguiente
            this.showNextNotification();
        }
    }

    /**
     * Cierra todas las notificaciones
     */
    closeAllNotifications() {
        this.notificationQueue = [];
        this.container.innerHTML = '';
        this.isShowing = false;
    }

    // ============================================
    // MÉTODOS DE UTILIDAD
    // ============================================

    /**
     * Obtiene el título por defecto según el tipo
     * @param {string} type - Tipo de notificación
     * @returns {string} Título por defecto
     */
    getDefaultTitle(type) {
        const titles = {
            success: 'Éxito',
            error: 'Error',
            warning: 'Advertencia',
            info: 'Información'
        };
        return titles[type] || 'Notificación';
    }

    /**
     * Obtiene el icono por defecto según el tipo
     * @param {string} type - Tipo de notificación
     * @returns {string} HTML del icono
     */
    getDefaultIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || '<i class="fas fa-bell"></i>';
    }

    /**
     * Reproduce sonido según el tipo
     * @param {string} type - Tipo de notificación
     */
    playSound(type) {
        if (!this.soundsEnabled) return;
        
        // En una implementación real, aquí cargarías archivos de audio
        // Por ahora, solo un console.log
        console.log(`🔊 Reproduciendo sonido: ${type}`);
    }

    /**
     * Encuentra una notificación por ID
     * @param {string} notificationId - ID de la notificación
     * @returns {Object|null} Notificación encontrada
     */
    findNotificationById(notificationId) {
        // Buscar en la cola actual
        for (const notification of this.notificationQueue) {
            if (notification.id.toString() === notificationId.toString()) {
                return notification;
            }
        }
        return null;
    }

    /**
     * Habilita/deshabilita sonidos
     * @param {boolean} enabled - True para habilitar
     */
    setSoundsEnabled(enabled) {
        this.soundsEnabled = enabled;
        console.log(`🔊 Sonidos ${enabled ? 'habilitados' : 'deshabilitados'}`);
    }

    /**
     * Cambia la duración por defecto
     * @param {number} duration - Duración en milisegundos
     */
    setDefaultDuration(duration) {
        if (duration >= 1000 && duration <= 10000) {
            this.defaultDuration = duration;
            console.log(`⏱️ Duración por defecto cambiada a ${duration}ms`);
        }
    }

    // ============================================
    // MÉTODOS DE CONVENIENCIA
    // ============================================

    /**
     * Muestra notificación de éxito
     * @param {string} message - Mensaje
     * @param {number} duration - Duración
     * @param {Object} options - Opciones
     */
    success(message, duration, options) {
        return this.showNotification(message, 'success', duration, options);
    }

    /**
     * Muestra notificación de error
     * @param {string} message - Mensaje
     * @param {number} duration - Duración
     * @param {Object} options - Opciones
     */
    error(message, duration, options) {
        return this.showNotification(message, 'error', duration, options);
    }

    /**
     * Muestra notificación de advertencia
     * @param {string} message - Mensaje
     * @param {number} duration - Duración
     * @param {Object} options - Opciones
     */
    warning(message, duration, options) {
        return this.showNotification(message, 'warning', duration, options);
    }

    /**
     * Muestra notificación de información
     * @param {string} message - Mensaje
     * @param {number} duration - Duración
     * @param {Object} options - Opciones
     */
    info(message, duration, options) {
        return this.showNotification(message, 'info', duration, options);
    }
}

// ============================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ============================================

// Crear instancia global
let notificationManagerInstance = null;

/**
 * Inicializa el NotificationManager
 */
function initializeNotificationManager() {
    if (notificationManagerInstance) {
        console.warn('⚠️ NotificationManager ya está inicializado');
        return notificationManagerInstance;
    }
    
    console.log('🚀 Inicializando NotificationManager...');
    
    try {
        notificationManagerInstance = new NotificationManager();
        console.log('✅ NotificationManager inicializado correctamente');
        return notificationManagerInstance;
        
    } catch (error) {
        console.error('❌ Error inicializando NotificationManager:', error);
        return null;
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNotificationManager);
} else {
    initializeNotificationManager();
}

// Exportar al ámbito global
window.notifications = {
    // Inicialización
    initialize: initializeNotificationManager,
    getInstance: () => notificationManagerInstance,
    
    // Métodos principales
    showNotification: (message, type, duration, options) => {
        if (notificationManagerInstance) {
            return notificationManagerInstance.showNotification(message, type, duration, options);
        }
        // Fallback básico si no está inicializado
        console.log(`[${type.toUpperCase()}] ${message}`);
        return null;
    },
    
    // Métodos de conveniencia
    success: (message, duration, options) => {
        if (notificationManagerInstance) {
            return notificationManagerInstance.success(message, duration, options);
        }
        console.log(`[SUCCESS] ${message}`);
        return null;
    },
    
    error: (message, duration, options) => {
        if (notificationManagerInstance) {
            return notificationManagerInstance.error(message, duration, options);
        }
        console.log(`[ERROR] ${message}`);
        return null;
    },
    
    warning: (message, duration, options) => {
        if (notificationManagerInstance) {
            return notificationManagerInstance.warning(message, duration, options);
        }
        console.log(`[WARNING] ${message}`);
        return null;
    },
    
    info: (message, duration, options) => {
        if (notificationManagerInstance) {
            return notificationManagerInstance.info(message, duration, options);
        }
        console.log(`[INFO] ${message}`);
        return null;
    },
    
    // Control
    closeAll: () => {
        if (notificationManagerInstance) {
            notificationManagerInstance.closeAllNotifications();
        }
    },
    
    setSoundsEnabled: (enabled) => {
        if (notificationManagerInstance) {
            notificationManagerInstance.setSoundsEnabled(enabled);
        }
    },
    
    setDefaultDuration: (duration) => {
        if (notificationManagerInstance) {
            notificationManagerInstance.setDefaultDuration(duration);
        }
    }
};

console.log('🔔 Módulo NotificationManager cargado');

// Función de compatibilidad para código existente
function showNotification(message, type) {
    return window.notifications.showNotification(message, type);
}
