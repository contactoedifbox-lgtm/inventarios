// ========== INVENTARIO SIMPLIFICADO ==========

import store from '../core/store.js';
import api from '../core/api.js';
import { 
    formatChileTime, 
    formatShortTime, 
    getStockStatus,
    escapeHTML 
} from '../core/utils.js';

class InventoryManager {
    constructor() {
        this.setupUI();
    }
    
    // ========== UI SETUP ==========
    setupUI() {
        // Botón recargar inventario
        const recargaBtn = document.getElementById('recarga-inventario-btn');
        if (recargaBtn) {
            recargaBtn.addEventListener('click', () => this.reloadInventory());
        }
        
        // Tabs
        const inventarioTab = document.getElementById('tab-inventario-btn');
        const ventasTab = document.getElementById('tab-ventas-btn');
        
        if (inventarioTab) {
            inventarioTab.addEventListener('click', () => this.showInventoryTab());
        }
        
        if (ventasTab) {
            ventasTab.addEventListener('click', () => this.showSalesTab());
        }
        
        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterTable(e.target.value));
        }
    }
    
    // ========== CARGA DE DATOS ==========
    async loadInventory() {
        try {
            this.showNotification('Cargando inventario...', 'info');
            
            const inventory = await api.loadInventory();
            store.setInventory(inventory);
            
            this.renderInventoryTable();
            this.updateStatistics();
            this.showNotification(`Inventario cargado (${inventory.length} productos)`, 'success');
            
        } catch (error) {
            console.error('Error cargando inventario:', error);
            this.showNotification('Error al cargar inventario', 'error');
        }
    }
    
    async reloadInventory() {
        await this.loadInventory();
    }
    
    // ========== RENDER TABLA ==========
    renderInventoryTable() {
        const tbody = document.getElementById('inventarioBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        store.inventory.forEach(item => {
            const stockBadge = getStockStatus(item.cantidad);
            const fecha = formatChileTime(item.fecha_actualizacion);
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHTML(item.codigo_barras)}</strong></td>
                    <td>${item.descripcion ? escapeHTML(item.descripcion) : '<span style="color: #94a3b8;">Sin descripción</span>'}</td>
                    <td><span class="stock-badge ${stockBadge.class}">${item.cantidad} unidades</span></td>
                    <td>$${parseFloat(item.costo || 0).toFixed(2)}</td>
                    <td><strong>$${parseFloat(item.precio || 0).toFixed(2)}</strong></td>
                    <td>${fecha}</td>
                    <td>
                        <button class="action-btn btn-edit" data-codigo="${escapeHTML(item.codigo_barras)}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </td>
                </tr>
            `;
        });
        
        this.bindInventoryTableEvents();
    }
    
    bindInventoryTableEvents() {
        // Botones editar
        document.querySelectorAll('#inventarioBody .btn-edit').forEach(button => {
            button.addEventListener('click', (e) => {
                const codigo = e.target.closest('[data-codigo]').dataset.codigo;
                this.openEditModal(codigo);
            });
        });
    }
    
    // ========== EDICIÓN ==========
    async openEditModal(barcode) {
        const producto = store.getProduct(barcode);
        if (!producto) {
            this.showNotification('Producto no encontrado', 'error');
            return;
        }
        
        // Mostrar modal simple de edición
        const modalHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Editar Producto</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="edit-inventory-form">
                        <div class="form-group">
                            <label>Código de Barras</label>
                            <input type="text" id="edit-codigo" value="${escapeHTML(producto.codigo_barras)}" readonly class="readonly-input">
                        </div>
                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea id="edit-descripcion" rows="3">${escapeHTML(producto.descripcion || '')}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Cantidad</label>
                                <input type="number" id="edit-cantidad" value="${producto.cantidad}" min="0" required>
                            </div>
                            <div class="form-group">
                                <label>Costo</label>
                                <input type="number" id="edit-costo" value="${producto.costo || 0}" min="0" step="0.01" required>
                            </div>
                            <div class="form-group">
                                <label>Precio Venta</label>
                                <input type="number" id="edit-precio" value="${producto.precio || 0}" min="0" step="0.01" required>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="action-btn btn-cancel">Cancelar</button>
                    <button class="action-btn btn-save" id="save-inventory">Guardar</button>
                </div>
            </div>
        `;
        
        this.showCustomModal(modalHTML);
        
        // Event listeners
        document.getElementById('save-inventory').addEventListener('click', () => 
            this.saveInventoryEdit(producto.codigo_barras)
        );
        
        document.querySelector('.btn-cancel').addEventListener('click', () => 
            this.closeCustomModal()
        );
        
        document.querySelector('.modal-close').addEventListener('click', () => 
            this.closeCustomModal()
        );
    }
    
    async saveInventoryEdit(barcode) {
        const producto = store.getProduct(barcode);
        if (!producto) return;
        
        const updates = {
            descripcion: document.getElementById('edit-descripcion').value.trim(),
            cantidad: parseInt(document.getElementById('edit-cantidad').value),
            costo: parseFloat(document.getElementById('edit-costo').value),
            precio: parseFloat(document.getElementById('edit-precio').value)
        };
        
        try {
            this.showNotification('Actualizando producto...', 'info');
            
            const result = await api.updateInventory(barcode, updates);
            
            if (result && result.success) {
                // Actualizar store local
                store.updateProduct(barcode, {
                    ...updates,
                    fecha_actualizacion: new Date().toISOString()
                });
                
                // Actualizar UI
                this.renderInventoryTable();
                this.updateStatistics();
                
                this.closeCustomModal();
                this.showNotification('Producto actualizado', 'success');
            } else {
                this.showNotification('Error al actualizar: ' + (result?.message || 'Desconocido'), 'error');
            }
            
        } catch (error) {
            console.error('Error actualizando inventario:', error);
            this.showNotification('Error al actualizar producto', 'error');
        }
    }
    
    // ========== UI HELPERS ==========
    showCustomModal(contentHTML) {
        const modal = document.getElementById('custom-modal');
        if (!modal) {
            // Crear modal si no existe
            const modalDiv = document.createElement('div');
            modalDiv.id = 'custom-modal';
            modalDiv.className = 'modal';
            modalDiv.innerHTML = contentHTML;
            document.body.appendChild(modalDiv);
        } else {
            modal.innerHTML = contentHTML;
            modal.style.display = 'flex';
        }
        
        document.body.style.overflow = 'hidden';
    }
    
    closeCustomModal() {
        const modal = document.getElementById('custom-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        document.body.style.overflow = '';
    }
    
    showInventoryTab() {
        this.hideAllTabs();
        document.getElementById('tab-inventario').classList.add('active');
        document.getElementById('tab-inventario-btn').classList.add('active');
    }
    
    showSalesTab() {
        this.hideAllTabs();
        document.getElementById('tab-ventas').classList.add('active');
        document.getElementById('tab-ventas-btn').classList.add('active');
    }
    
    hideAllTabs() {
        document.querySelectorAll('.tab-content').forEach(tab => 
            tab.classList.remove('active')
        );
        document.querySelectorAll('.tab-btn').forEach(btn => 
            btn.classList.remove('active')
        );
    }
    
    filterTable(query) {
        const activeTab = document.querySelector('.tab-btn.active').textContent.toLowerCase();
        const searchTerm = query.toLowerCase().trim();
        
        if (activeTab.includes('inventario')) {
            const filtered = store.inventory.filter(item =>
                item.codigo_barras.toLowerCase().includes(searchTerm) ||
                (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm))
            );
            this.renderFilteredInventory(filtered);
        } else {
            // Filtrar ventas (implementación simple)
            console.log('Filtrar ventas:', searchTerm);
        }
    }
    
    renderFilteredInventory(items) {
        const tbody = document.getElementById('inventarioBody');
        if (!tbody) return;
        
        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
                        <i class="fas fa-search"></i> No se encontraron productos
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        items.forEach(item => {
            const stockBadge = getStockStatus(item.cantidad);
            const fecha = formatChileTime(item.fecha_actualizacion);
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHTML(item.codigo_barras)}</strong></td>
                    <td>${item.descripcion ? escapeHTML(item.descripcion) : '<span style="color: #94a3b8;">Sin descripción</span>'}</td>
                    <td><span class="stock-badge ${stockBadge.class}">${item.cantidad} unidades</span></td>
                    <td>$${parseFloat(item.costo || 0).toFixed(2)}</td>
                    <td><strong>$${parseFloat(item.precio || 0).toFixed(2)}</strong></td>
                    <td>${fecha}</td>
                    <td>
                        <button class="action-btn btn-edit" data-codigo="${escapeHTML(item.codigo_barras)}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </td>
                </tr>
            `;
        });
        
        this.bindInventoryTableEvents();
    }
    
    updateStatistics() {
        const inventory = store.inventory;
        const lowStock = inventory.filter(p => p.cantidad < 10).length;
        
        // Actualizar UI
        const totalProductos = document.getElementById('total-productos');
        const stockBajo = document.getElementById('stock-bajo');
        const ultimaActualizacion = document.getElementById('ultima-actualizacion');
        
        if (totalProductos) totalProductos.textContent = inventory.length;
        if (stockBajo) stockBajo.textContent = lowStock;
        
        if (ultimaActualizacion && inventory.length > 0) {
            const ultima = inventory[0].fecha_actualizacion;
            if (ultima) {
                ultimaActualizacion.textContent = formatShortTime(ultima);
            }
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

export default new InventoryManager();
