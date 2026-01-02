import { checkAuth, setupAuthEventListeners } from './modules/auth.js';
import modalManager from './ui/modals.js';
import notificationManager from './ui/notifications.js';
import { setupTabNavigation, setupSearch } from './ui/search.js';
import { setupSalesEventListeners } from './modules/ventas.js';
import { setupInventoryEventListeners } from './modules/inventario.js';
import { setupOfflineMonitoring } from './modules/offline.js';

class InventarioApp {
    constructor() {
        this.init();
    }
    
    async init() {
        this.setupGlobalEventListeners();
        this.setupUIComponents();
        
        await checkAuth();
    }
    
    setupGlobalEventListeners() {
        window.addEventListener('online', this.handleOnlineStatus.bind(this));
        window.addEventListener('offline', this.handleOfflineStatus.bind(this));
        
        document.addEventListener('DOMContentLoaded', () => {
            setupAuthEventListeners();
            modalManager.setupModalCloseEvents();
            setupTabNavigation();
            setupSearch();
            setupSalesEventListeners();
            setupInventoryEventListeners();
            setupOfflineMonitoring();
        });
    }
    
    setupUIComponents() {
        this.setupRealTimeClock();
    }
    
    setupRealTimeClock() {
        setInterval(() => {
            this.updateDateTimeDisplays();
        }, 60000);
        
        this.updateDateTimeDisplays();
    }
    
    updateDateTimeDisplays() {
        const fechaHoyElement = document.getElementById('fecha-hoy');
        const fechaVentaActualElement = document.getElementById('fechaVentaActual');
        
        if (fechaHoyElement) {
            import('./modules/utils.js').then(({ DateTimeUtils }) => {
                fechaHoyElement.textContent = DateTimeUtils.getCurrentChileDate();
            });
        }
        
        if (fechaVentaActualElement && modalManager.isOpen('modalAgregarVenta')) {
            import('./modules/utils.js').then(({ DateTimeUtils }) => {
                fechaVentaActualElement.textContent = DateTimeUtils.getCurrentChileDate();
            });
        }
    }
    
    handleOnlineStatus() {
        notificationManager.success('🌐 Conexión a internet restablecida');
        
        setTimeout(() => {
            import('./modules/offline.js').then(({ syncPendingSales }) => {
                syncPendingSales();
            });
        }, 3000);
    }
    
    handleOfflineStatus() {
        notificationManager.warning('📴 Modo offline activado. Las ventas se guardarán localmente');
    }
}

new InventarioApp();
