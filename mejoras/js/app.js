import { checkAuth, setupAuthEventListeners } from './modules/auth.js';
import modalManager from './ui/modals.js';
import notificationManager from './ui/notifications.js';
import { setupTabNavigation, setupSearch } from './ui/search.js';
import { setupSalesEventListeners } from './modules/ventas.js';
import { setupInventoryEventListeners } from './modules/inventario.js';
import { setupOfflineMonitoring } from './modules/offline.js';
import multipleSalesManager from './modules/ventas-multiples.js';
import salesTableManager from './ui/sales-table.js';

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
            this.setupMultipleSales();
            this.setupEnhancedSalesTable();
        });
    }
    
    setupMultipleSales() {
        const ventaMultipleBtn = document.getElementById('agregar-venta-multiple-btn');
        if (ventaMultipleBtn) {
            ventaMultipleBtn.addEventListener('click', () => {
                multipleSalesManager.openModal();
            });
        }
    }
    
    setupEnhancedSalesTable() {
        const exportBtn = document.getElementById('exportar-excel-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                salesTableManager.exportGroupedToCSV();
            });
        }
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
        const fechaMultipleElement = document.getElementById('ventaMultipleFecha');
        
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
        
        if (fechaMultipleElement && modalManager.isOpen('modalVentaMultiple')) {
            import('./modules/utils.js').then(({ DateTimeUtils }) => {
                fechaMultipleElement.textContent = DateTimeUtils.getCurrentChileDate();
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
