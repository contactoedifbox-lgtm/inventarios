import { checkAuth, setupAuthEventListeners } from './modules/auth.js';
import modalManager from './ui/modals.js';
import notificationManager from '../ui/notifications.js';
import { setupTabNavigation, setupSearch } from './ui/search.js';
import { setupSalesEventListeners } from './modules/ventas.js';
import { setupInventoryEventListeners } from './modules/inventario.js';
import { setupOfflineMonitoring } from './modules/offline.js';

class InventarioApp {
    constructor() {
        console.log('🚀 Iniciando aplicación...');
        this.init();
    }
    
    async init() {
        // Configurar primero los event listeners básicos
        this.setupBasicEventListeners();
        
        // Verificar autenticación
        await checkAuth();
        
        // Configurar UI
        this.setupUIComponents();
    }
    
    setupBasicEventListeners() {
        console.log('🔧 Configurando event listeners básicos...');
        
        // Auth
        setupAuthEventListeners();
        
        // Modal close events
        modalManager.setupModalCloseEvents();
        
        // Navegación
        setupTabNavigation();
        
        // Búsqueda
        setupSearch();
        
        // Inventario
        setupInventoryEventListeners();
        
        // Ventas
        setupSalesEventListeners();
        
        // Offline
        setupOfflineMonitoring();
        
        // ========== CONFIGURAR VENTA MÚLTIPLE ==========
        this.setupMultipleSalesButton();
        
        console.log('✅ Event listeners configurados');
    }
    
    setupMultipleSalesButton() {
        const btn = document.getElementById('agregar-venta-multiple-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                console.log('🛒 Abriendo venta múltiple...');
                import('./modules/ventas-multiples.js').then(module => {
                    module.openMultipleSaleModal();
                });
            });
            console.log('✅ Botón venta múltiple configurado');
        }
    }
    
    setupUIComponents() {
        this.setupRealTimeClock();
    }
    
    setupRealTimeClock() {
        // Actualizar cada minuto
        setInterval(() => {
            this.updateDateTimeDisplays();
        }, 60000);
        
        // Actualizar ahora
        this.updateDateTimeDisplays();
    }
    
    updateDateTimeDisplays() {
        const fechaHoy = document.getElementById('fecha-hoy');
        if (fechaHoy) {
            import('./modules/utils.js').then(({ DateTimeUtils }) => {
                fechaHoy.textContent = DateTimeUtils.getCurrentChileDate();
            });
        }
    }
    
    handleOnlineStatus() {
        notificationManager.success('🌐 Conexión a internet restablecida');
    }
    
    handleOfflineStatus() {
        notificationManager.warning('📴 Modo offline activado');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new InventarioApp();
    
    // Configurar eventos online/offline
    window.addEventListener('online', () => window.app.handleOnlineStatus());
    window.addEventListener('offline', () => window.app.handleOfflineStatus());
});
