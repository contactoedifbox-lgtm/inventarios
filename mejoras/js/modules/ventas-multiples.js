import { supabaseClient, StateManager, Constants } from '../config/supabase-config.js';
import { DateTimeUtils, InventoryUtils, StringUtils } from './utils.js';
import notificationManager from '../ui/notifications.js';
import modalManager from '../ui/modals.js';

class MultipleSalesManager {
    constructor() {
        this.items = [];
        this.currentSaleId = '';
    }
    
    initialize() {
        this.generateSaleId();
        this.updateSaleDate();
        this.setupEventListeners();
        this.clearItems();
        console.log('✅ Venta Múltiple inicializada');
    }
    
    generateSaleId() {
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        
        let nextId = localStorage.getItem(Constants.MULTIPLE_SALE.NEXT_ID_KEY) || '001';
        this.currentSaleId = `${Constants.MULTIPLE_SALE.PREFIX}${year}${month}${day}-${nextId}`;
        
        const idElement = document.getElementById('ventaMultipleId');
        if (idElement) {
            idElement.textContent = this.currentSaleId;
        }
    }
    
    updateSaleDate() {
        const fechaElement = document.getElementById('ventaMultipleFecha');
        if (fechaElement) {
            fechaElement.textContent = DateTimeUtils.getCurrentChileDate();
        }
    }
    
    setupEventListeners() {
        const buscarInput = document.getElementById('buscarProductoMultiple');
        const saveButton = document.getElementById('save-multiple-sale');
        const cancelButton = document.getElementById('cancel-multiple-sale');
        
        if (buscarInput) {
            buscarInput.addEventListener('input', (e) => this.searchProducts(e.target.value));
            buscarInput.addEventListener('focus', () => this.showSearchResults());
        }
        
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveMultipleSale());
        }
        
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                modalManager.close(Constants.MODAL_IDS.MULTIPLE_SALE);
                this.clearItems();
            });
        }
        
        document.addEventListener('click', (e) => {
            const resultadosDiv = document.getElementById('resultadosBusquedaMultiple');
            if (resultadosDiv && !e.target.closest('.search-multiple-container')) {
                resultadosDiv.style.display = 'none';
            }
        });
    }
    
    searchProducts(term) {
        const termLower = term.trim().toLowerCase();
        if (termLower.length < 2) {
            this.hideSearchResults();
            return;
        }
        
        const inventario = StateManager.getInventario();
        const searchResults = inventario.filter(p => 
            p.codigo_barras.toLowerCase().includes(termLower) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(termLower))
        ).slice(0, 10);
        
        this.displaySearchResults(searchResults);
    }
    
    displaySearchResults(results) {
        const resultadosDiv = document.getElementById('resultadosBusquedaMultiple');
        if (!resultadosDiv) return;
        
        if (results.length === 0) {
            resultadosDiv.innerHTML = '<div style="padding: 10px; color: #64748b;">No se encontraron productos</div>';
            resultadosDiv.style.display = 'block';
            return;
        }
        
        let html = '';
        results.forEach(producto => {
            html += `
                <div style="padding: 10px; border-bottom: 1px solid #e2e8f0; cursor: pointer;"
                     data-codigo="${StringUtils.escapeHTML(producto.codigo_barras)}">
                    <div><strong>${StringUtils.escapeHTML(producto.codigo_barras)}</strong></div>
                    <div style="color: #475569; font-size: 14px;">${StringUtils.escapeHTML(producto.descripcion || 'Sin descripción')}</div>
                    <div style="color: #64748b; font-size: 12px;">
                        Stock: ${producto.cantidad} | Precio: $${parseFloat(producto.precio || 0).toFixed(2)}
                    </div>
                </div>
            `;
        });
        
        resultadosDiv.innerHTML = html;
        resultadosDiv.style.display = 'block';
        
        document.querySelectorAll('#resultadosBusquedaMultiple div').forEach(div => {
            div.addEventListener('click', (e) => {
                const codigo = e.currentTarget.getAttribute('data-codigo');
                this.addProductToSale(codigo);
                this.hideSearchResults();
            });
        });
    }
    
    showSearchResults() {
        const resultadosDiv = document.getElementById('resultadosBusquedaMultiple');
        if (resultadosDiv && resultadosDiv.innerHTML.trim() !== '') {
            resultadosDiv.style.display = 'block';
        }
    }
    
    hideSearchResults() {
        const resultadosDiv = document.getElementById('resultadosBusquedaMultiple');
        if (resultadosDiv) {
            resultadosDiv.style.display = 'none';
        }
    }
    
    addProductToSale(codigoBarras) {
        const producto = StateManager.getProducto(codigoBarras);
        if (!producto) {
            notificationManager.error('Producto no encontrado');
            return;
        }
        
        const existingItemIndex = this.items.findIndex(item => item.codigo_barras === codigoBarras);
        
        if (existingItemIndex !== -1) {
            this.items[existingItemIndex].cantidad += 1;
            this.updateItemRow(existingItemIndex);
        } else {
            const newItem = {
                codigo_barras: producto.codigo_barras,
                descripcion: producto.descripcion || '',
                cantidad: Constants.MULTIPLE_SALE.DEFAULT_CANTIDAD,
                precio_unitario: parseFloat(producto.precio || 0),
                descuento: Constants.MULTIPLE_SALE.DEFAULT_DESCUENTO,
                stock_disponible: producto.cantidad,
                subtotal: parseFloat(producto.precio || 0)
            };
            
            this.items.push(newItem);
            this.addItemRow(newItem, this.items.length - 1);
        }
        
        this.updateTotals();
        document.getElementById('buscarProductoMultiple').value = '';
        document.getElementById('buscarProductoMultiple').focus();
    }
    
    addItemRow(item, index) {
        const itemsList = document.getElementById('itemsListContainer');
        
        if (this.items.length === 1) {
            itemsList.innerHTML = '';
        }
        
        const itemElement = document.createElement('div');
        itemElement.className = 'multiple-item-row';
        itemElement.dataset.index = index;
        
        const subtotal = (item.cantidad * item.precio_unitario) - item.descuento;
        const hasStockWarning = item.cantidad > item.stock_disponible;
        
        if (hasStockWarning) {
            itemElement.classList.add('stock-warning');
        }
        
        itemElement.innerHTML = `
            <div class="item-number">${index + 1}</div>
            <div class="item-product-info">
                <div class="item-product-code">${StringUtils.escapeHTML(item.codigo_barras)}</div>
                <div class="item-product-name">${StringUtils.escapeHTML(item.descripcion || 'Sin descripción')}</div>
                <div class="item-product-stock">Stock: ${item.stock_disponible}</div>
            </div>
            <div class="item-quantity">
                <input type="number" 
                       class="item-cantidad-input" 
                       value="${item.cantidad}" 
                       min="1" 
                       data-index="${index}"
                       ${hasStockWarning ? 'style="border-color: #ef4444;"' : ''}>
            </div>
            <div class="item-price">
                <input type="number" 
                       class="item-precio-input" 
                       value="${item.precio_unitario.toFixed(2)}" 
                       step="0.01" 
                       min="0"
                       data-index="${index}">
            </div>
            <div class="item-discount">
                <input type="number" 
                       class="item-descuento-input" 
                       value="${item.descuento.toFixed(2)}" 
                       step="0.01" 
                       min="0"
                       data-index="${index}">
            </div>
            <div class="item-subtotal">$${subtotal.toFixed(2)}</div>
            <div class="item-remove">
                <button class="remove-item-btn" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        itemsList.appendChild(itemElement);
        
        this.setupItemEventListeners(itemElement);
    }
    
    updateItemRow(index) {
        const item = this.items[index];
        const itemElement = document.querySelector(`.multiple-item-row[data-index="${index}"]`);
        
        if (!itemElement) return;
        
        const subtotal = (item.cantidad * item.precio_unitario) - item.descuento;
        const hasStockWarning = item.cantidad > item.stock_disponible;
        
        itemElement.querySelector('.item-cantidad-input').value = item.cantidad;
        itemElement.querySelector('.item-precio-input').value = item.precio_unitario.toFixed(2);
        itemElement.querySelector('.item-descuento-input').value = item.descuento.toFixed(2);
        itemElement.querySelector('.item-subtotal').textContent = `$${subtotal.toFixed(2)}`;
        
        const stockElement = itemElement.querySelector('.item-product-stock');
        if (stockElement) {
            stockElement.textContent = `Stock: ${item.stock_disponible}`;
        }
        
        if (hasStockWarning) {
            itemElement.classList.add('stock-warning');
            itemElement.querySelector('.item-cantidad-input').style.borderColor = '#ef4444';
        } else {
            itemElement.classList.remove('stock-warning');
            itemElement.querySelector('.item-cantidad-input').style.borderColor = '';
        }
    }
    
    setupItemEventListeners(itemElement) {
        const index = parseInt(itemElement.dataset.index);
        
        const cantidadInput = itemElement.querySelector('.item-cantidad-input');
        const precioInput = itemElement.querySelector('.item-precio-input');
        const descuentoInput = itemElement.querySelector('.item-descuento-input');
        const removeButton = itemElement.querySelector('.remove-item-btn');
        
        if (cantidadInput) {
            cantidadInput.addEventListener('input', (e) => {
                this.updateItemQuantity(index, parseFloat(e.target.value) || 1);
            });
        }
        
        if (precioInput) {
            precioInput.addEventListener('input', (e) => {
                this.updateItemPrice(index, parseFloat(e.target.value) || 0);
            });
        }
        
        if (descuentoInput) {
            descuentoInput.addEventListener('input', (e) => {
                this.updateItemDiscount(index, parseFloat(e.target.value) || 0);
            });
        }
        
        if (removeButton) {
            removeButton.addEventListener('click', () => {
                this.removeItem(index);
            });
        }
    }
    
    updateItemQuantity(index, newCantidad) {
        if (newCantidad < 1) newCantidad = 1;
        
        this.items[index].cantidad = newCantidad;
        this.updateItemRow(index);
        this.updateTotals();
    }
    
    updateItemPrice(index, newPrecio) {
        if (newPrecio < 0) newPrecio = 0;
        
        this.items[index].precio_unitario = newPrecio;
        this.updateItemRow(index);
        this.updateTotals();
    }
    
    updateItemDiscount(index, newDescuento) {
        if (newDescuento < 0) newDescuento = 0;
        
        const item = this.items[index];
        const maxDescuento = item.cantidad * item.precio_unitario;
        
        if (newDescuento > maxDescuento) {
            newDescuento = maxDescuento;
            notificationManager.warning('El descuento no puede superar el subtotal');
        }
        
        this.items[index].descuento = newDescuento;
        this.updateItemRow(index);
        this.updateTotals();
    }
    
    removeItem(index) {
        this.items.splice(index, 1);
        this.refreshItemsList();
        this.updateTotals();
    }
    
    refreshItemsList() {
        const itemsList = document.getElementById('itemsListContainer');
        itemsList.innerHTML = '';
        
        if (this.items.length === 0) {
            itemsList.innerHTML = `
                <div class="empty-items-message">
                    <i class="fas fa-cart-plus"></i>
                    <p>Agrega productos usando la búsqueda arriba</p>
                </div>
            `;
            return;
        }
        
        this.items.forEach((item, index) => {
            this.addItemRow(item, index);
        });
    }
    
    updateTotals() {
        let subtotal = 0;
        let descuentoTotal = 0;
        
        this.items.forEach(item => {
            const itemSubtotal = item.cantidad * item.precio_unitario;
            subtotal += itemSubtotal;
            descuentoTotal += item.descuento;
        });
        
        const total = subtotal - descuentoTotal;
        
        document.getElementById('multipleSubtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('multipleDescuentoTotal').textContent = `$${descuentoTotal.toFixed(2)}`;
        document.getElementById('multipleTotalVenta').textContent = `$${total.toFixed(2)}`;
    }
    
    validateItems() {
        const errors = [];
        
        if (this.items.length === 0) {
            errors.push('Debes agregar al menos un producto a la venta');
            return { isValid: false, errors };
        }
        
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            
            if (item.cantidad > item.stock_disponible) {
                const producto = StateManager.getProducto(item.codigo_barras);
                const nombre = producto ? producto.descripcion || item.codigo_barras : item.codigo_barras;
                errors.push(`Stock insuficiente para "${nombre}". Disponible: ${item.stock_disponible}, Solicitado: ${item.cantidad}`);
            }
            
            if (item.cantidad <= 0) {
                errors.push(`La cantidad para ${item.codigo_barras} debe ser mayor a 0`);
            }
            
            if (item.precio_unitario <= 0) {
                errors.push(`El precio para ${item.codigo_barras} debe ser mayor a 0`);
            }
            
            if (item.descuento < 0) {
                errors.push(`El descuento para ${item.codigo_barras} no puede ser negativo`);
            }
            
            const maxDescuento = item.cantidad * item.precio_unitario;
            if (item.descuento > maxDescuento) {
                errors.push(`El descuento para ${item.codigo_barras} no puede superar el subtotal ($${maxDescuento.toFixed(2)})`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    async saveMultipleSale() {
        const validation = this.validateItems();
        if (!validation.isValid) {
            validation.errors.forEach(error => notificationManager.error(error));
            return;
        }
        
        const notas = document.getElementById('ventaMultipleNotas').value.trim();
        
        if (!navigator.onLine) {
            await this.saveMultipleSaleOffline(notas);
            return;
        }
        
        try {
            notificationManager.info('🔄 Guardando venta múltiple...');
            
            const ventaData = this.items.map((item, index) => ({
                barcode: item.codigo_barras,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                descuento: item.descuento,
                descripcion: item.descripcion || '',
                fecha_venta: this.formatDateTimeForSupabase(),
                id_venta_agrupada: this.currentSaleId,
                numero_linea: index + 1,
                notas: notas
            }));
            
            const { error: errorVentas } = await supabaseClient
                .from(Constants.API_ENDPOINTS.SALES_TABLE)
                .insert(ventaData);
                
            if (errorVentas) throw errorVentas;
            
            await this.updateInventoryForMultipleSale();
            
            this.incrementNextSaleId();
            
            notificationManager.success(`✅ Venta múltiple guardada (ID: ${this.currentSaleId})`);
            
            modalManager.close(Constants.MODAL_IDS.MULTIPLE_SALE);
            this.clearItems();
            
            setTimeout(async () => {
                const { loadSalesData } = await import('./inventario.js');
                await loadSalesData();
                const { updateStatistics } = await import('./inventario.js');
                updateStatistics();
            }, 1000);
            
        } catch (error) {
            console.error('Error guardando venta múltiple:', error);
            notificationManager.error('❌ Error al guardar la venta múltiple');
            
            await this.saveMultipleSaleOffline(notas);
        }
    }
    
    formatDateTimeForSupabase() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    }
    
    async updateInventoryForMultipleSale() {
        const updates = [];
        
        for (const item of this.items) {
            const producto = StateManager.getProducto(item.codigo_barras);
            if (producto) {
                const nuevoStock = producto.cantidad - item.cantidad;
                
                updates.push({
                    barcode: item.codigo_barras,
                    cantidad: nuevoStock,
                    fecha_actualizacion: this.formatDateTimeForSupabase()
                });
                
                StateManager.updateInventoryItem(item.codigo_barras, {
                    cantidad: nuevoStock,
                    fecha_actualizacion: new Date().toISOString()
                });
            }
        }
        
        if (updates.length > 0) {
            for (const update of updates) {
                const { error } = await supabaseClient
                    .from(Constants.API_ENDPOINTS.INVENTORY_TABLE)
                    .update({ 
                        cantidad: update.cantidad,
                        fecha_actualizacion: update.fecha_actualizacion
                    })
                    .eq('barcode', update.barcode);
                    
                if (error) {
                    console.error(`Error actualizando inventario para ${update.barcode}:`, error);
                }
            }
            
            const { displayInventory } = await import('./inventario.js');
            displayInventory(StateManager.getInventario());
        }
    }
    
    async saveMultipleSaleOffline(notas) {
        const ventaMultipleOffline = {
            id: this.currentSaleId,
            fecha: this.formatDateTimeForSupabase(),
            items: this.items.map(item => ({
                codigo_barras: item.codigo_barras,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                descuento: item.descuento,
                descripcion: item.descripcion || ''
            })),
            notas: notas,
            estado: 'pendiente'
        };
        
        let ventasPendientes = JSON.parse(
            localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_MULTIPLE_SALES) || '[]'
        );
        
        ventasPendientes.push(ventaMultipleOffline);
        localStorage.setItem(
            Constants.LOCAL_STORAGE_KEYS.OFFLINE_MULTIPLE_SALES,
            JSON.stringify(ventasPendientes)
        );
        
        for (const item of this.items) {
            let inventarioOffline = JSON.parse(
                localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_INVENTORY) || '{}'
            );
            
            if (!inventarioOffline[item.codigo_barras]) {
                const producto = StateManager.getProducto(item.codigo_barras);
                inventarioOffline[item.codigo_barras] = producto ? producto.cantidad : 0;
            }
            
            inventarioOffline[item.codigo_barras] -= item.cantidad;
            
            localStorage.setItem(
                Constants.LOCAL_STORAGE_KEYS.OFFLINE_INVENTORY,
                JSON.stringify(inventarioOffline)
            );
        }
        
        notificationManager.warning('📴 Venta múltiple guardada localmente. Se sincronizará cuando haya internet');
        
        modalManager.close(Constants.MODAL_IDS.MULTIPLE_SALE);
        this.clearItems();
        
        const { updateLocalInventoryView, updateOfflineBadge } = await import('./offline.js');
        updateLocalInventoryView();
        updateOfflineBadge();
    }
    
    incrementNextSaleId() {
        let nextId = parseInt(localStorage.getItem(Constants.MULTIPLE_SALE.NEXT_ID_KEY) || '1');
        nextId++;
        localStorage.setItem(Constants.MULTIPLE_SALE.NEXT_ID_KEY, nextId.toString().padStart(3, '0'));
    }
    
    clearItems() {
        this.items = [];
        this.refreshItemsList();
        this.updateTotals();
        
        const buscarInput = document.getElementById('buscarProductoMultiple');
        const notasInput = document.getElementById('ventaMultipleNotas');
        
        if (buscarInput) buscarInput.value = '';
        if (notasInput) notasInput.value = '';
        
        this.generateSaleId();
    }
    
    openModal() {
        this.initialize();
        modalManager.open(Constants.MODAL_IDS.MULTIPLE_SALE);
    }
}

const multipleSalesManager = new MultipleSalesManager();

export function openMultipleSaleModal() {
    multipleSalesManager.openModal();
}

export default multipleSalesManager;
