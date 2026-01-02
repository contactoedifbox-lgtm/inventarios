import { checkAuth, setupAuthEventListeners } from './modules/auth.js';
import ModalManager from './ui/modals.js';
import NotificationManager from './ui/notifications.js';
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
            ModalManager.setupModalCloseEvents();
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
            const { DateTimeUtils } = await import('./modules/utils.js');
            fechaHoyElement.textContent = DateTimeUtils.getCurrentChileDate();
        }
        
        if (fechaVentaActualElement && ModalManager.isOpen('modalAgregarVenta')) {
            const { DateTimeUtils } = await import('./modules/utils.js');
            fechaVentaActualElement.textContent = DateTimeUtils.getCurrentChileDate();
        }
    }
    
    handleOnlineStatus() {
        NotificationManager.success('🌐 Conexión a internet restablecida');
        
        setTimeout(() => {
            const { syncPendingSales } = await import('./modules/offline.js');
            syncPendingSales();
        }, 3000);
    }
    
    handleOfflineStatus() {
        NotificationManager.warning('📴 Modo offline activado. Las ventas se guardarán localmente');
    }
}

new InventarioApp();
