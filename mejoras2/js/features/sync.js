// ========== SINCRONIZACIÓN OFFLINE SIMPLIFICADA ==========

import store from '../core/store.js';
import api from '../core/api.js';

class SyncManager {
    constructor() {
        this.setupUI();
        this.checkOnlineStatus();
        
        // Event listeners globales
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }
    
    setupUI() {
        // Badge offline
        const badge = document.getElementById('offlineBadge');
        if (badge) {
            badge.addEventListener('click', () => this.syncPendingSales());
        }
        
        // Cargar ventas offline guardadas
        store.loadFromLocalStorage();
        this.updateOfflineBadge();
    }
    
    checkOnlineStatus() {
        if (!navigator.onLine) {
            this.handleOffline();
        }
    }
    
    handleOnline() {
        this.showNotification('Conexión restablecida', 'success');
        this.updateOfflineBadge();
        
        // Auto-sincronizar después de 5 segundos
        setTimeout(() => {
            if (store.pendingOfflineSales.length > 0) {
                this.syncPendingSales();
            }
        }, 5000);
    }
    
    handleOffline() {
        this.showNotification('Modo offline activado', 'warning');
        this.updateOfflineBadge();
    }
    
    async syncPendingSales() {
        if (store.pendingOfflineSales.length === 0) {
            this.showNotification('No hay ventas pendientes', 'info');
            return;
        }
        
        if (!navigator.onLine) {
            this.showNotification('No hay conexión a internet', 'error');
            return;
        }
        
        this.showNotification(`Sincronizando ${store.pendingOfflineSales.length} ventas...`, 'info');
        
        const exitosas = [];
        const fallidas = [];
        
        for (const offlineSale of store.pendingOfflineSales) {
            try {
                // Procesar cada línea
                for (const line of offlineSale.lines) {
                    const saleData = {
                        barcode: line.product.codigo_barras,
                        cantidad: line.quantity,
                        precio_unitario: line.price,
                        descuento: line.discount || 0,
                        descripcion: line.description || line.product.descripcion || '',
                        fecha_venta: offlineSale.createdAt,
                        id_venta_agrupada: offlineSale.id,
                        numero_linea: line.number
                    };
                    
                    await api.createSale(saleData);
                    
                    // Actualizar stock
                    const producto = store.getProduct(line.product.codigo_barras);
                    if (producto) {
                        const nuevoStock = producto.cantidad - line.quantity;
                        await api.updateStock(producto.codigo_barras, nuevoStock);
                        store.updateProduct(producto.codigo_barras, { cantidad: nuevoStock });
                    }
                }
                
                exitosas.push(offlineSale);
                
            } catch (error) {
                console.error('Error sincronizando venta:', error);
                fallidas.push(offlineSale);
            }
        }
        
        // Actualizar estado
        store.pendingOfflineSales = fallidas;
        store.saveToLocalStorage();
        
        // Resultados
        if (exitosas.length > 0) {
            this.showNotification(`${exitosas.length} ventas sincronizadas`, 'success');
            
            // Recargar datos
            await this.refreshData();
        }
        
        if (fallidas.length > 0) {
            this.showNotification(`${fallidas.length} ventas no se pudieron sincronizar`, 'warning');
        }
        
        this.updateOfflineBadge();
    }
    
    async refreshData() {
        try {
            // Recargar inventario
            const inventory = await api.loadInventory();
            store.setInventory(inventory);
            
            // Recargar ventas
            const sales = await api.loadSales();
            store.setSales(sales);
            
        } catch (error) {
            console.error('Error refrescando datos:', error);
        }
    }
    
    updateOfflineBadge() {
        const badge = document.getElementById('offlineBadge');
        const countSpan = document.getElementById('offlineCount');
        
        if (badge && countSpan) {
            const count = store.pendingOfflineSales.length;
            countSpan.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

export default new SyncManager();
