// ========== ESTADO GLOBAL ÚNICO ==========

class AppStore {
    // Singleton
    static instance = null;
    
    static getInstance() {
        if (!AppStore.instance) {
            AppStore.instance = new AppStore();
        }
        return AppStore.instance;
    }
    
    constructor() {
        this.reset();
    }
    
    reset() {
        this.user = null;
        this.inventory = [];
        this.sales = [];
        this.groupedSales = [];
        this.pendingOfflineSales = [];
        this.viewMode = 'grouped'; // 'grouped' | 'detailed'
    }
    
    // ========== INVENTARIO ==========
    setInventory(items) {
        this.inventory = [...items];
    }
    
    getProduct(barcode) {
        return this.inventory.find(p => p.codigo_barras === barcode) || null;
    }
    
    updateProduct(barcode, updates) {
        const index = this.inventory.findIndex(p => p.codigo_barras === barcode);
        if (index !== -1) {
            this.inventory[index] = { ...this.inventory[index], ...updates };
            return true;
        }
        return false;
    }
    
    // ========== VENTAS ==========
    setSales(ventas) {
        this.sales = [...ventas];
        this.updateGroupedSales();
    }
    
    updateGroupedSales() {
        const groups = {};
        
        this.sales.forEach(venta => {
            const id = venta.id_venta_agrupada || `IND-${venta.id}`;
            
            if (!groups[id]) {
                groups[id] = {
                    id_venta: id,
                    fecha: venta.fecha_venta,
                    total: 0,
                    items: [],
                    expanded: false
                };
            }
            
            const subtotal = (venta.cantidad * venta.precio_unitario) - (venta.descuento || 0);
            groups[id].total += subtotal;
            groups[id].items.push(venta);
        });
        
        this.groupedSales = Object.values(groups).sort((a, b) => 
            new Date(b.fecha) - new Date(a.fecha)
        );
    }
    
    toggleSaleGroup(idVenta) {
        const grupo = this.groupedSales.find(g => g.id_venta === idVenta);
        if (grupo) grupo.expanded = !grupo.expanded;
    }
    
    // ========== OFFLINE ==========
    addOfflineSale(saleData) {
        this.pendingOfflineSales.push({
            ...saleData,
            offline_id: Date.now(),
            estado: 'pendiente'
        });
        this.saveToLocalStorage();
    }
    
    saveToLocalStorage() {
        if (this.pendingOfflineSales.length > 0) {
            localStorage.setItem('vet_offline_sales', 
                JSON.stringify(this.pendingOfflineSales));
        }
    }
    
    loadFromLocalStorage() {
        const saved = localStorage.getItem('vet_offline_sales');
        if (saved) {
            this.pendingOfflineSales = JSON.parse(saved);
        }
    }
    
    clearOfflineSales() {
        this.pendingOfflineSales = [];
        localStorage.removeItem('vet_offline_sales');
    }
}

export default AppStore.getInstance();
