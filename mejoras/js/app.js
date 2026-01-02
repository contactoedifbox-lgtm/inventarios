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
            this.setupMultipleSalesButton();
        });
    }
    
    setupMultipleSalesButton() {
        const ventaMultipleBtn = document.getElementById('agregar-venta-multiple-btn');
        if (ventaMultipleBtn) {
            ventaMultipleBtn.addEventListener('click', () => {
                console.log('Botón Venta Múltiple clickeado - Cargando módulo...');
                
                import('./modules/ventas-multiples.js')
                    .then(module => {
                        console.log('Módulo cargado exitosamente:', module);
                        module.openMultipleSaleModal();
                    })
                    .catch(error => {
                        console.error('Error cargando módulo:', error);
                        
                        const modal = document.getElementById('modalVentaMultiple');
                        if (modal) {
                            modal.style.display = 'flex';
                            console.log('Modal abierto directamente');
                        }
                    });
            });
        } else {
            console.error('Botón agregar-venta-multiple-btn no encontrado');
        }
    }
    
    // ... resto del código igual ...
}

new InventarioApp();
