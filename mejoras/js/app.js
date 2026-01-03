import { checkAuth, setupAuthEventListeners } from './modules/auth.js';
import modalManager from './ui/modals.js';
import notificationManager from './ui/notifications.js';
import { setupTabNavigation, setupSearch } from './ui/search.js';
import { setupSalesEventListeners } from './modules/ventas.js';
import { setupInventoryEventListeners } from './modules/inventario.js';
import { setupOfflineMonitoring } from './modules/offline.js';

// Importar módulos nuevos
import { setupMultipleSalesEventListeners, openMultipleSaleModal } from './modules/ventas-multiples.js';
import { cambiarModoVisualizacionVentas } from './modules/inventario.js';

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
            // Configurar event listeners existentes
            setupAuthEventListeners();
            modalManager.setupModalCloseEvents();
            setupTabNavigation();
            setupSearch();
            setupSalesEventListeners();
            setupInventoryEventListeners();
            setupOfflineMonitoring();
            
            // ========== CONFIGURAR NUEVOS EVENT LISTENERS ==========
            
            // 1. Botón para abrir modal de venta múltiple
            const agregarVentaMultipleBtn = document.getElementById('agregar-venta-multiple-btn');
            if (agregarVentaMultipleBtn) {
                agregarVentaMultipleBtn.addEventListener('click', openMultipleSaleModal);
                console.log('✅ Event listener agregado: agregar-venta-multiple-btn');
            }
            
            // 2. Configurar event listeners del modal de venta múltiple
            setupMultipleSalesEventListeners();
            
            // 3. Selector de modo de visualización (opcional - agregar en HTML si quieres)
            // this.setupViewModeSelector();
            
            // 4. Por defecto, usar modo agrupado
            setTimeout(() => {
                cambiarModoVisualizacionVentas('agrupado');
            }, 1500);
            
            console.log('✅ Todos los event listeners configurados');
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
        const fechaVentaMultipleElement = document.getElementById('fecha-venta-multiple');
        
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
        
        if (fechaVentaMultipleElement && modalManager.isOpen('modalVentaMultiple')) {
            import('./modules/utils.js').then(({ DateTimeUtils }) => {
                fechaVentaMultipleElement.textContent = DateTimeUtils.getCurrentChileDate();
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
    
    // Opcional: Selector de modo de visualización
    setupViewModeSelector() {
        const selectorHTML = `
            <div style="margin-left: auto; display: flex; gap: 10px; align-items: center;">
                <span style="font-size: 12px; color: #64748b;">Vista:</span>
                <select id="viewModeSelector" style="padding: 5px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <option value="agrupado">Agrupada</option>
                    <option value="detallado">Detallada</option>
                </select>
            </div>
        `;
        
        const tabsContainer = document.querySelector('.tabs');
        if (tabsContainer) {
            tabsContainer.insertAdjacentHTML('beforeend', selectorHTML);
            
            const selector = document.getElementById('viewModeSelector');
            if (selector) {
                selector.addEventListener('change', (e) => {
                    cambiarModoVisualizacionVentas(e.target.value);
                });
            }
        }
    }
}

new InventarioApp();
