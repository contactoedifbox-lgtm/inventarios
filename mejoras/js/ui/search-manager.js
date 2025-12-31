/* ============================================
   GESTIÓN DE BÚSQUEDA - VERSIÓN CORREGIDA
   ============================================ */

// ============================================
// VARIABLES GLOBALES DE BÚSQUEDA
// ============================================

let searchManagerInstance = null;

class SearchManager {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchInputVenta = document.getElementById('buscarProducto');
        this.searchResults = document.getElementById('resultadosBusqueda');
        this.currentSearchType = 'main';
        this.lastSearchTerm = '';
        
        this.initialize();
    }

    initialize() {
        console.log('🔍 Inicializando SearchManager...');
        
        // Configurar búsqueda principal
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.handleMainSearch(e));
        }
        
        // Configurar búsqueda en ventas
        if (this.searchInputVenta) {
            this.searchInputVenta.addEventListener('input', (e) => this.handleVentaSearch(e));
        }
        
        // Cerrar resultados al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box') && !e.target.closest('#resultadosBusqueda')) {
                this.hideSearchResults();
            }
        });
        
        console.log('✅ SearchManager inicializado');
    }

    // BÚSQUEDA PRINCIPAL
    handleMainSearch(e) {
        const searchTerm = e.target.value.trim();
        
        if (searchTerm.length === 0) {
            this.clearMainSearch();
            return;
        }
        
        // Determinar qué tab está activa
        const activeTab = this.getActiveTab();
        
        if (activeTab === 'inventario' && window.inventory) {
            window.inventory.aplicarFiltro({ texto: searchTerm });
        } else if (activeTab === 'ventas' && window.sales) {
            window.sales.aplicarFiltroVentas({ texto: searchTerm });
        }
    }

    clearMainSearch() {
        const activeTab = this.getActiveTab();
        
        if (activeTab === 'inventario' && window.inventory) {
            window.inventory.limpiarFiltros();
        } else if (activeTab === 'ventas' && window.sales) {
            window.sales.aplicarFiltroVentas({ texto: '' });
        }
    }

    // BÚSQUEDA EN VENTAS
    handleVentaSearch(e) {
        const searchTerm = e.target.value.trim();
        
        if (searchTerm.length < 2) {
            this.hideSearchResults();
            return;
        }
        
        this.searchProductsForSale(searchTerm);
    }

    searchProductsForSale(term) {
        if (!window.inventory) return;
        
        const inventario = window.inventory.getInventario();
        if (!inventario || inventario.length === 0) {
            this.showNoResults('No hay productos en el inventario');
            return;
        }
        
        // Filtrar productos
        const resultados = inventario.filter(p => 
            p.codigo_barras.toLowerCase().includes(term.toLowerCase()) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(term.toLowerCase()))
        ).slice(0, 10);
        
        // Mostrar resultados
        this.displaySearchResults(resultados);
    }

    displaySearchResults(productos) {
        if (!this.searchResults) return;
        
        if (productos.length === 0) {
            this.showNoResults('No se encontraron productos');
            return;
        }
        
        let html = '';
        
        productos.forEach(producto => {
            html += `
                <div style="padding: 10px; border-bottom: 1px solid #e2e8f0; cursor: pointer;"
                     onclick="window.searchManager.selectProduct('${producto.codigo_barras}')">
                    <div><strong>${producto.codigo_barras}</strong></div>
                    <div style="color: #475569; font-size: 14px;">${producto.descripcion || 'Sin descripción'}</div>
                    <div style="color: #64748b; font-size: 12px;">
                        Stock: ${producto.cantidad} | Precio: $${parseFloat(producto.precio || 0).toFixed(2)}
                    </div>
                </div>
            `;
        });
        
        this.searchResults.innerHTML = html;
        this.searchResults.style.display = 'block';
    }

    selectProduct(codigo) {
        if (window.sales && window.sales.seleccionarProductoVenta) {
            window.sales.seleccionarProductoVenta(codigo);
        }
        this.hideSearchResults();
    }

    hideSearchResults() {
        if (this.searchResults) {
            this.searchResults.style.display = 'none';
        }
    }

    showNoResults(message) {
        if (!this.searchResults) return;
        
        this.searchResults.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #64748b;">
                <i class="fas fa-search"></i>
                <p>${message}</p>
            </div>
        `;
        this.searchResults.style.display = 'block';
    }

    getActiveTab() {
        const inventarioTab = document.getElementById('tab-inventario');
        if (inventarioTab && inventarioTab.classList.contains('active')) {
            return 'inventario';
        }
        return 'ventas';
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

function initializeSearchManager() {
    if (searchManagerInstance) return searchManagerInstance;
    
    try {
        searchManagerInstance = new SearchManager();
        return searchManagerInstance;
    } catch (error) {
        console.error('Error inicializando SearchManager:', error);
        return null;
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeSearchManager, 100);
    });
} else {
    setTimeout(initializeSearchManager, 100);
}

// Exportar
window.searchManager = {
    initialize: initializeSearchManager,
    getInstance: () => searchManagerInstance
};

console.log('🔍 Módulo SearchManager cargado');
