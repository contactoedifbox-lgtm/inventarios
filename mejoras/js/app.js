import { checkAuth, setupAuthEventListeners } from './modules/auth.js';
import modalManager from './ui/modals.js';
import notificationManager from './ui/notifications.js';
import { setupTabNavigation, setupSearch } from './ui/search.js';
import { setupSalesEventListeners } from './modules/ventas.js';
import { setupInventoryEventListeners } from './modules/inventario.js';
import { setupOfflineMonitoring } from './modules/offline.js';
import { setupMultipleSalesEventListeners, openMultipleSaleModal } from './modules/ventas-multiples.js';
import { updateSalesTableView } from './ui/sales-table.js';

// Al inicio del app.js, después de los imports
console.log('🔍 INICIANDO DIAGNÓSTICO DEL SISTEMA');

// Función para verificar event listeners
function checkEventListeners() {
    console.group('🔌 VERIFICANDO EVENT LISTENERS');
    
    const criticalButtons = [
        'agregar-venta-btn',
        'agregar-venta-multiple-btn',
        'recarga-inventario-btn',
        'exportar-excel-btn',
        'reporte-encargos-btn',
        'logout-button',
        'tab-ventas-btn',
        'tab-inventario-btn'
    ];
    
    criticalButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) {
            console.error(`❌ Botón #${id}: NO EXISTE en el DOM`);
        } else {
            console.log(`✅ Botón #${id}: Existe (click listeners: ${getEventListeners(btn, 'click')})`);
            // Agregar listener temporal para debug
            btn.addEventListener('click', function(e) {
                console.log(`🎯 Botón ${id} clickeado`, e);
                e.preventDefault();
                e.stopPropagation();
            });
        }
    });
    
    console.groupEnd();
}

// Función para obtener listeners (simplificada)
function getEventListeners(element, eventType) {
    const listeners = element._eventListeners || [];
    return listeners.filter(l => l.type === eventType).length;
}

// Patchear addEventListener para debugging
const originalAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (!this._eventListeners) this._eventListeners = [];
    this._eventListeners.push({ type, listener, options });
    return originalAddEventListener.call(this, type, listener, options);
};

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
                agregarVentaMultipleBtn.addEventListener('click', () => {
                    console.log('Botón venta múltiple clickeado');
                    openMultipleSaleModal();
                });
                console.log('✅ Event listener agregado: agregar-venta-multiple-btn');
            }
            
            // 2. Configurar event listeners del modal de venta múltiple
            setTimeout(() => {
                setupMultipleSalesEventListeners();
            }, 500);
            
            // 3. Cambiar visualización de ventas a modo agrupado por defecto
            setTimeout(() => {
                try {
                    updateSalesTableView(true); // true = modo agrupado
                    console.log('✅ Visualización de ventas configurada en modo agrupado');
                } catch (error) {
                    console.error('Error configurando vista de ventas:', error);
                }
            }, 1000);
            
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
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    new InventarioApp();
});
