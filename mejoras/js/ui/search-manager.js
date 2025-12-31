/* ============================================
   GESTIÓN DE BÚSQUEDA - VERSIÓN CSP-SEGURA
   ============================================ */

class SearchManager {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchInputVenta = document.getElementById('buscarProducto');
        this.searchResults = document.getElementById('resultadosBusqueda');
        this.currentSearchType = 'main';
        this.lastSearchTerm = '';
        this.searchDebounceDelay = 300;
        this.debounceTimers = {};
        
        this.initialize();
    }

    initialize() {
        console.log('🔍 Inicializando SearchManager...');
        
        // Configurar búsqueda principal con debounce
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.debounce('main', () => this.handleMainSearch(e), this.searchDebounceDelay);
            });
            
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.executeMainSearch();
            });
        }
        
        // Configurar búsqueda en ventas con debounce
        if (this.searchInputVenta) {
            this.searchInputVenta.addEventListener('input', (e) => {
                this.debounce('venta', () => this.handleVentaSearch(e), this.searchDebounceDelay);
            });
            
            this.searchInputVenta.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.executeVentaSearch();
            });
        }
        
        // Cerrar resultados al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box') && !e.target.closest('#resultadosBusqueda')) {
                this.hideSearchResults();
            }
        });
        
        // Configurar escáner de código de barras
        this.setupBarcodeScanner();
        
        console.log('✅ SearchManager inicializado');
    }

    // ============================================
    // UTILIDADES DE DEBOUNCE
    // ============================================

    debounce(id, func, delay) {
        clearTimeout(this.debounceTimers[id]);
        this.debounceTimers[id] = setTimeout(() => {
            func();
        }, delay);
    }

    // ============================================
    // BÚSQUEDA PRINCIPAL
    // ============================================

    handleMainSearch(e) {
        this.currentSearchType = 'main';
        const searchTerm = e.target.value.trim();
        
        if (searchTerm.length === 0) {
            this.clearMainSearch();
            return;
        }
        
        if (searchTerm === this.lastSearchTerm) return;
        
        this.lastSearchTerm = searchTerm;
        this.executeMainSearch(searchTerm);
    }

    executeMainSearch(searchTerm = null) {
        if (!searchTerm) {
            searchTerm = this.searchInput.value.trim();
        }
        
        if (searchTerm.length === 0) {
            this.clearMainSearch();
            return;
        }
        
        console.log(`🔍 Búsqueda principal: "${searchTerm}"`);
        
        const activeTab = this.getActiveTab();
        
        if (activeTab === 'inventario' && window.inventory) {
            window.inventory.aplicarFiltro({ texto: searchTerm });
        } else if (activeTab === 'ventas' && window.sales) {
            window.sales.aplicarFiltroVentas({ texto: searchTerm });
        }
    }

    clearMainSearch() {
        this.lastSearchTerm = '';
        const activeTab = this.getActiveTab();
        
        if (activeTab === 'inventario' && window.inventory) {
            window.inventory.limpiarFiltros();
        } else if (activeTab === 'ventas' && window.sales) {
            window.sales.aplicarFiltroVentas({ texto: '' });
        }
    }

    // ============================================
    // BÚSQUEDA EN VENTAS
    // ============================================

    handleVentaSearch(e) {
        this.currentSearchType = 'venta';
        const searchTerm = e.target.value.trim();
        
        if (searchTerm.length < 2) {
            this.hideSearchResults();
            return;
        }
        
        this.executeVentaSearch(searchTerm);
    }

    executeVentaSearch(searchTerm = null) {
        if (!searchTerm) {
            searchTerm = this.searchInputVenta.value.trim();
        }
        
        if (searchTerm.length < 2) {
            this.hideSearchResults();
            return;
        }
        
        console.log(`🛒 Búsqueda en ventas: "${searchTerm}"`);
        this.searchProductsForSale(searchTerm);
    }

    searchProductsForSale(term) {
        if (!window.inventory) {
            console.error('❌ Módulo de inventario no disponible');
            return;
        }
        
        const inventario = window.inventory.getInventario();
        if (!inventario || inventario.length === 0) {
            this.showNoResults('No hay productos en el inventario');
            return;
        }
        
        const resultados = window.inventory.filtrarProductos(inventario, term).slice(0, 10);
        this.displaySearchResults(resultados);
    }

    displaySearchResults(productos) {
        if (!this.searchResults || productos.length === 0) {
            this.showNoResults('No se encontraron productos');
            return;
        }
        
        let html = '';
        
        productos.forEach(producto => {
            const stockBadge = this.getStockBadgeForProduct(producto);
            const precio = this.formatoMoneda(producto.precio || 0);
            
            html += `
                <div class="search-result-item" 
                     data-codigo="${producto.codigo_barras}"
                     onclick="window.searchManager.selectProduct('${producto.codigo_barras}')">
                    <div class="search-result-code">${producto.codigo_barras}</div>
                    <div class="search-result-desc">${producto.descripcion || 'Sin descripción'}</div>
                    <div class="search-result-info">
                        <span class="stock-indicator ${stockBadge.class}">${stockBadge.text}</span>
                        <span class="search-result-price">${precio}</span>
                    </div>
                </div>
            `;
        });
        
        this.searchResults.innerHTML = html;
        this.searchResults.style.display = 'block';
    }

    selectProduct(codigo) {
        if (this.currentSearchType === 'venta') {
            if (window.sales && window.sales.seleccionarProductoVenta) {
                window.sales.seleccionarProductoVenta(codigo);
            }
            this.hideSearchResults();
        }
    }

    hideSearchResults() {
        if (this.searchResults) {
            this.searchResults.style.display = 'none';
        }
    }

    showNoResults(message) {
        if (!this.searchResults) return;
        
        this.searchResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>${message}</p>
            </div>
        `;
        this.searchResults.style.display = 'block';
    }

    // ============================================
    // ESCÁNER DE CÓDIGO DE BARRAS
    // ============================================

    setupBarcodeScanner() {
        console.log('📟 Configurando escáner de código de barras...');
        
        let barcodeBuffer = '';
        let lastKeyTime = 0;
        
        document.addEventListener('keydown', (e) => {
            // Ignorar teclas especiales
            if (e.key.length > 1) return;
            
            const currentTime = Date.now();
            
            // Si pasó más de 100ms desde la última tecla, reiniciar buffer
            if (currentTime - lastKeyTime > 100) {
                barcodeBuffer = '';
            }
            
            barcodeBuffer += e.key;
            lastKeyTime = currentTime;
            
            // Si el buffer tiene al menos 8 caracteres (típico de código de barras)
            // y se presiona Enter, procesar como código de barras
            if (e.key === 'Enter' && barcodeBuffer.length >= 8) {
                e.preventDefault();
                
                const codigo = barcodeBuffer.slice(0, -1); // Quitar el Enter
                this.processBarcodeInput(codigo);
                
                barcodeBuffer = '';
            }
        });
        
        console.log('✅ Escáner de código de barras configurado');
    }

    processBarcodeInput(codigo) {
        console.log(`📟 Código de barras leído: ${codigo}`);
        
        // Buscar producto
        const producto = this.quickSearchByBarcode(codigo);
        
        if (!producto) return;
        
        // Dependiendo del contexto, realizar acción
        const activeTab = this.getActiveTab();
        const modalVentaAbierto = document.getElementById('modalAgregarVenta')?.style.display === 'flex';
        
        if (modalVentaAbierto) {
            // Si el modal de agregar venta está abierto, seleccionar el producto
            this.selectProduct(codigo);
            
            // Enfocar cantidad
            const cantidadInput = document.getElementById('ventaCantidad');
            if (cantidadInput) {
                cantidadInput.focus();
                cantidadInput.select();
            }
        } else if (activeTab === 'inventario') {
            // Si estamos en inventario, filtrar por el código
            if (this.searchInput) {
                this.searchInput.value = codigo;
                this.executeMainSearch(codigo);
            }
        } else if (activeTab === 'ventas') {
            // Si estamos en ventas, filtrar por el código
            if (this.searchInput) {
                this.searchInput.value = codigo;
                this.executeMainSearch(codigo);
            }
        }
    }

    quickSearchByBarcode(codigo) {
        if (!codigo || !window.inventory) return null;
        
        console.log(`📟 Búsqueda rápida por código: ${codigo}`);
        
        const producto = window.inventory.buscarProducto(codigo);
        
        if (producto) {
            console.log(`✅ Producto encontrado: ${producto.descripcion}`);
            return producto;
        } else {
            console.log(`❌ Producto no encontrado: ${codigo}`);
            return null;
        }
    }

    // ============================================
    // UTILIDADES
    // ============================================

    getActiveTab() {
        const inventarioTab = document.getElementById('tab-inventario');
        if (inventarioTab && inventarioTab.classList.contains('active')) {
            return 'inventario';
        }
        return 'ventas';
    }

    getStockBadgeForProduct(producto) {
        const cantidad = producto.cantidad || 0;
        
        if (cantidad < 0) {
            return { 
                class: 'stock-low', 
                text: `Encargo: ${Math.abs(cantidad)}` 
            };
        }
        if (cantidad <= 5) {
            return { class: 'stock-low', text: 'Muy Bajo' };
        }
        if (cantidad <= 10) {
            return { class: 'stock-medium', text: 'Bajo' };
        }
        return { class: 'stock-good', text: 'Disponible' };
    }

    formatoMoneda(valor) {
        if (window.utils && window.utils.formatoMoneda) {
            return window.utils.formatoMoneda(valor);
        }
        return `$${parseFloat(valor).toFixed(2)}`;
    }

    focusMainSearch() {
        if (this.searchInput) {
            this.searchInput.focus();
            this.searchInput.select();
        }
    }

    clearAllSearches() {
        if (this.searchInput) this.searchInput.value = '';
        if (this.searchInputVenta) this.searchInputVenta.value = '';
        this.hideSearchResults();
        this.clearMainSearch();
    }
}

// ============================================
// INICIALIZACIÓN GLOBAL
// ============================================

let searchManagerInstance = null;

function initializeSearchManager() {
    if (searchManagerInstance) {
        console.warn('⚠️ SearchManager ya está inicializado');
        return searchManagerInstance;
    }
    
    console.log('🚀 Inicializando SearchManager...');
    
    try {
        searchManagerInstance = new SearchManager();
        console.log('✅ SearchManager inicializado correctamente');
        return searchManagerInstance;
        
    } catch (error) {
        console.error('❌ Error inicializando SearchManager:', error);
        return null;
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Pequeño delay para otros módulos
        setTimeout(initializeSearchManager, 100);
    });
} else {
    setTimeout(initializeSearchManager, 100);
}

// Exportar al ámbito global
window.searchManager = {
    initialize: initializeSearchManager,
    getInstance: () => searchManagerInstance,
    
    // Métodos principales
    quickSearchByBarcode: (codigo) => {
        if (searchManagerInstance) {
            return searchManagerInstance.quickSearchByBarcode(codigo);
        }
        return null;
    },
    
    focusMainSearch: () => {
        if (searchManagerInstance) {
            searchManagerInstance.focusMainSearch();
        }
    },
    
    clearAllSearches: () => {
        if (searchManagerInstance) {
            searchManagerInstance.clearAllSearches();
        }
    },
    
    getActiveTab: () => {
        if (searchManagerInstance) {
            return searchManagerInstance.getActiveTab();
        }
        return 'inventario';
    }
};

console.log('🔍 Módulo SearchManager cargado');
