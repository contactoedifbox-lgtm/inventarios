/* ============================================
   GESTIÓN DE BÚSQUEDA
   ============================================
   Manejo centralizado de búsquedas en tiempo real:
   - Búsqueda principal en inventario/ventas
   - Búsqueda en modal de agregar ventas
   - Gestión de resultados en tiempo real
   ============================================ */

// ============================================
// VARIABLES DEL MANAGER DE BÚSQUEDA
// ============================================

class SearchManager {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchInputVenta = document.getElementById('buscarProducto');
        this.searchResults = document.getElementById('resultadosBusqueda');
        this.currentSearchType = 'main'; // 'main' o 'venta'
        this.lastSearchTerm = '';
        this.searchDebounceDelay = 300;
        
        this.initialize();
    }

    /**
     * Inicializa el manager de búsqueda
     */
    initialize() {
        console.log('🔍 Inicializando SearchManager...');
        
        // Configurar listeners para búsqueda principal
        if (this.searchInput) {
            const debouncedMainSearch = window.utils.debounce(
                (e) => this.handleMainSearch(e),
                this.searchDebounceDelay
            );
            this.searchInput.addEventListener('input', debouncedMainSearch);
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.executeMainSearch();
            });
        }
        
        // Configurar listeners para búsqueda en ventas
        if (this.searchInputVenta) {
            const debouncedVentaSearch = window.utils.debounce(
                (e) => this.handleVentaSearch(e),
                this.searchDebounceDelay
            );
            this.searchInputVenta.addEventListener('input', debouncedVentaSearch);
            this.searchInputVenta.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.executeVentaSearch();
            });
        }
        
        // Configurar listener para cerrar resultados al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box') && !e.target.closest('#resultadosBusqueda')) {
                this.hideSearchResults();
            }
        });
        
        console.log('✅ SearchManager inicializado');
    }

    // ============================================
    // BÚSQUEDA PRINCIPAL (INVENTARIO/VENTAS)
    // ============================================

    /**
     * Maneja la búsqueda principal en tiempo real
     * @param {Event} e - Evento de input
     */
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

    /**
     * Ejecuta la búsqueda principal
     * @param {string} searchTerm - Término de búsqueda
     */
    executeMainSearch(searchTerm = null) {
        if (!searchTerm) {
            searchTerm = this.searchInput.value.trim();
        }
        
        if (searchTerm.length === 0) {
            this.clearMainSearch();
            return;
        }
        
        console.log(`🔍 Búsqueda principal: "${searchTerm}"`);
        
        // Determinar qué tab está activa
        const activeTab = this.getActiveTab();
        
        if (activeTab === 'inventario') {
            this.searchInInventory(searchTerm);
        } else if (activeTab === 'ventas') {
            this.searchInSales(searchTerm);
        }
    }

    /**
     * Busca en el inventario
     * @param {string} term - Término de búsqueda
     */
    searchInInventory(term) {
        if (!window.inventory) {
            console.error('❌ Módulo de inventario no disponible');
            return;
        }
        
        // Usar la función de filtrado del módulo de inventario
        window.inventory.aplicarFiltro({ texto: term });
        
        // Mostrar contador de resultados
        this.showResultCount(window.inventory.productosFiltrados.length);
    }

    /**
     * Busca en las ventas
     * @param {string} term - Término de búsqueda
     */
    searchInSales(term) {
        if (!window.sales) {
            console.error('❌ Módulo de ventas no disponible');
            return;
        }
        
        // Usar la función de filtrado del módulo de ventas
        window.sales.aplicarFiltroVentas({ texto: term });
    }

    /**
     * Limpia la búsqueda principal
     */
    clearMainSearch() {
        this.lastSearchTerm = '';
        
        // Determinar qué tab está activa
        const activeTab = this.getActiveTab();
        
        if (activeTab === 'inventario') {
            if (window.inventory) {
                window.inventory.limpiarFiltros();
            }
        } else if (activeTab === 'ventas') {
            if (window.sales) {
                // Limpiar solo el filtro de texto
                window.sales.aplicarFiltroVentas({ texto: '' });
            }
        }
        
        // Limpiar contador de resultados
        this.clearResultCount();
    }

    // ============================================
    // BÚSQUEDA EN MODAL DE VENTAS
    // ============================================

    /**
     * Maneja la búsqueda en el modal de ventas
     * @param {Event} e - Evento de input
     */
    handleVentaSearch(e) {
        this.currentSearchType = 'venta';
        const searchTerm = e.target.value.trim();
        
        if (searchTerm.length < 2) {
            this.hideSearchResults();
            return;
        }
        
        this.executeVentaSearch(searchTerm);
    }

    /**
     * Ejecuta la búsqueda en modal de ventas
     * @param {string} searchTerm - Término de búsqueda
     */
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

    /**
     * Busca productos para venta
     * @param {string} term - Término de búsqueda
     */
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
        
        // Filtrar productos
        const resultados = window.inventory.filtrarProductos(inventario, term).slice(0, 10);
        
        // Mostrar resultados
        this.displaySearchResults(resultados);
    }

    /**
     * Muestra los resultados de búsqueda
     * @param {Array} productos - Productos encontrados
     */
    displaySearchResults(productos) {
        if (!this.searchResults || productos.length === 0) {
            this.showNoResults('No se encontraron productos');
            return;
        }
        
        let html = '';
        
        productos.forEach(producto => {
            const stockBadge = this.getStockBadgeForProduct(producto);
            const precio = window.utils.formatoMoneda(producto.precio || 0);
            
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

    /**
     * Muestra mensaje de "sin resultados"
     * @param {string} message - Mensaje a mostrar
     */
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

    /**
     * Oculta los resultados de búsqueda
     */
    hideSearchResults() {
        if (this.searchResults) {
            this.searchResults.style.display = 'none';
        }
    }

    /**
     * Selecciona un producto de los resultados
     * @param {string} codigo - Código del producto
     */
    selectProduct(codigo) {
        if (this.currentSearchType === 'venta') {
            // Llamar a la función del módulo de ventas
            if (window.sales && window.sales.seleccionarProductoVenta) {
                window.sales.seleccionarProductoVenta(codigo);
            }
            this.hideSearchResults();
        }
    }

    // ============================================
    // BÚSQUEDA RÁPIDA POR CÓDIGO DE BARRAS
    // ============================================

    /**
     * Realiza una búsqueda rápida por código de barras
     * @param {string} codigo - Código de barras
     * @returns {Object|null} Producto encontrado
     */
    quickSearchByBarcode(codigo) {
        if (!codigo || !window.inventory) return null;
        
        console.log(`📟 Búsqueda rápida por código: ${codigo}`);
        
        const producto = window.inventory.buscarProducto(codigo);
        
        if (producto) {
            console.log(`✅ Producto encontrado: ${producto.descripcion}`);
            
            // Mostrar notificación
            if (window.notifications) {
                window.notifications.showNotification(
                    `Producto encontrado: ${producto.descripcion || codigo}`,
                    'success',
                    2000
                );
            }
        } else {
            console.log(`❌ Producto no encontrado: ${codigo}`);
            
            if (window.notifications) {
                window.notifications.showNotification(
                    `Producto no encontrado: ${codigo}`,
                    'warning',
                    2000
                );
            }
        }
        
        return producto;
    }

    /**
     * Configura escáner de código de barras
     */
    setupBarcodeScanner() {
        // Esta función podría integrarse con un lector de código de barras real
        console.log('📟 Configurando escáner de código de barras...');
        
        // Detectar entrada rápida (simulación de escáner)
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

    /**
     * Procesa entrada de código de barras
     * @param {string} codigo - Código de barras leído
     */
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
            
            // Enfocar cantidad y llenar automáticamente
            const cantidadInput = document.getElementById('ventaCantidad');
            if (cantidadInput) {
                cantidadInput.focus();
                cantidadInput.select();
            }
        } else if (activeTab === 'inventario') {
            // Si estamos en inventario, filtrar por el código
            this.searchInput.value = codigo;
            this.executeMainSearch(codigo);
        } else if (activeTab === 'ventas') {
            // Si estamos en ventas, filtrar por el código
            this.searchInput.value = codigo;
            this.executeMainSearch(codigo);
        }
    }

    // ============================================
    // UTILIDADES
    // ============================================

    /**
     * Obtiene la pestaña activa
     * @returns {string} 'inventario' o 'ventas'
     */
    getActiveTab() {
        const inventarioTab = document.getElementById('tab-inventario');
        if (inventarioTab && inventarioTab.classList.contains('active')) {
            return 'inventario';
        }
        
        const ventasTab = document.getElementById('tab-ventas');
        if (ventasTab && ventasTab.classList.contains('active')) {
            return 'ventas';
        }
        
        return 'inventario'; // Por defecto
    }

    /**
     * Obtiene badge de stock para producto
     * @param {Object} producto - Producto
     * @returns {Object} Badge con clase y texto
     */
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

    /**
     * Muestra contador de resultados
     * @param {number} count - Número de resultados
     */
    showResultCount(count) {
        const searchBox = document.querySelector('.search-box');
        if (!searchBox) return;
        
        let countElement = searchBox.querySelector('.result-count');
        
        if (!countElement) {
            countElement = document.createElement('div');
            countElement.className = 'result-count';
            searchBox.appendChild(countElement);
        }
        
        countElement.textContent = `${count} resultado${count !== 1 ? 's' : ''}`;
        countElement.style.display = 'block';
    }

    /**
     * Limpia el contador de resultados
     */
    clearResultCount() {
        const countElement = document.querySelector('.result-count');
        if (countElement) {
            countElement.style.display = 'none';
        }
    }

    /**
     * Enfoca el campo de búsqueda principal
     */
    focusMainSearch() {
        if (this.searchInput) {
            this.searchInput.focus();
            this.searchInput.select();
        }
    }

    /**
     * Enfoca el campo de búsqueda en ventas
     */
    focusVentaSearch() {
        if (this.searchInputVenta) {
            this.searchInputVenta.focus();
            this.searchInputVenta.select();
        }
    }

    /**
     * Limpia todos los campos de búsqueda
     */
    clearAllSearches() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        if (this.searchInputVenta) {
            this.searchInputVenta.value = '';
        }
        
        this.hideSearchResults();
        this.clearMainSearch();
        this.clearResultCount();
    }
}

// ============================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ============================================

// Crear instancia global
let searchManagerInstance = null;

/**
 * Inicializa el SearchManager
 */
function initializeSearchManager() {
    if (searchManagerInstance) {
        console.warn('⚠️ SearchManager ya está inicializado');
        return searchManagerInstance;
    }
    
    console.log('🚀 Inicializando SearchManager...');
    
    try {
        searchManagerInstance = new SearchManager();
        console.log('✅ SearchManager inicializado correctamente');
        
        // Configurar escáner de código de barras
        setTimeout(() => {
            searchManagerInstance.setupBarcodeScanner();
        }, 1000);
        
        return searchManagerInstance;
        
    } catch (error) {
        console.error('❌ Error inicializando SearchManager:', error);
        return null;
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeSearchManager, 500); // Pequeño delay para otros módulos
    });
} else {
    setTimeout(initializeSearchManager, 500);
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
