import { supabaseClient, StateManager, Constants } from '../config/supabase-config.js';
import { DateTimeUtils, InventoryUtils, StringUtils } from './utils.js';
import notificationManager from '../ui/notifications.js';
import modalManager from '../ui/modals.js';

export async function loadDashboardData() {
    await loadInventoryData();
    await loadSalesData();
    updateStatistics();
    
    document.getElementById('fecha-hoy').textContent = DateTimeUtils.getCurrentChileDate();
    showTab('ventas');
    
    StateManager.inventarioSincronizado = true;
    updateSyncIndicator();
}

export async function loadInventoryData(forceComplete = false) {
    try {
        if (forceComplete || StateManager.getInventario().length === 0) {
            notificationManager.info('🔄 Cargando inventario COMPLETO MEJORAS...');
            
            const { data, error } = await supabaseClient
                .from(Constants.API_ENDPOINTS.INVENTORY_VIEW)
                .select('*')
                .order('fecha_actualizacion', { ascending: false });
                
            if (error) throw error;
            
            StateManager.setInventario(data);
            displayInventory(StateManager.getInventario());
            notificationManager.success(`✅ Inventario MEJORAS cargado (${data.length} productos)`);
            StateManager.inventarioSincronizado = true;
            
        } else {
            notificationManager.info('🔄 Actualizando inventario MEJORAS...');
            
            const ultimaActualizacion = Math.max(...StateManager.getInventario().map(p => 
                new Date(p.fecha_actualizacion || 0).getTime()
            ));
            
            const fechaLimite = new Date(ultimaActualizacion - 5 * 60 * 1000).toISOString();
            
            const { data, error } = await supabaseClient
                .from(Constants.API_ENDPOINTS.INVENTORY_VIEW)
                .select('*')
                .gte('fecha_actualizacion', fechaLimite)
                .order('fecha_actualizacion', { ascending: false });
                
            if (error) throw error;
            
            if (data.length > 0) {
                updateInventoryIncremental(data);
                notificationManager.success(`✅ Inventario MEJORAS actualizado (${data.length} productos modificados)`);
                markInventoryAsNotSynced();
            } else {
                notificationManager.success('✅ Inventario MEJORAS ya está actualizado');
            }
        }
        
    } catch (error) {
        console.error('Error cargando inventario MEJORAS:', error);
        notificationManager.error('Error al cargar inventario MEJORAS');
    }
}

export function displayInventory(data) {
    const tbody = document.getElementById('inventarioBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const stockBadge = InventoryUtils.getStockStatus(item.cantidad);
        const fecha = DateTimeUtils.formatToChileTime(item.fecha_actualizacion);
        
        const rowHTML = `
            <tr>
                <td><strong>${StringUtils.escapeHTML(item.codigo_barras)}</strong></td>
                <td>${item.descripcion ? StringUtils.escapeHTML(item.descripcion) : '<span style="color: #94a3b8;">Sin descripción</span>'}</td>
                <td><span class="stock-badge ${stockBadge.class}">${item.cantidad} unidades</span></td>
                <td>$${parseFloat(item.costo || 0).toFixed(2)}</td>
                <td><strong>$${parseFloat(item.precio || 0).toFixed(2)}</strong></td>
                <td>${fecha}</td>
                <td>
                    <button class="action-btn btn-edit" data-codigo="${StringUtils.escapeHTML(item.codigo_barras)}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </td>
            </tr>
        `;
        
        tbody.innerHTML += rowHTML;
    });
    
    document.querySelectorAll('#inventarioBody .btn-edit').forEach(button => {
        button.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            editInventory(codigo);
        });
    });
    
    document.getElementById('total-productos').textContent = StateManager.getInventario().length;
}

function updateInventoryIncremental(nuevosDatos) {
    if (!nuevosDatos || nuevosDatos.length === 0) return;
    
    const inventario = StateManager.getInventario();
    
    nuevosDatos.forEach(nuevoItem => {
        const index = inventario.findIndex(p => p.codigo_barras === nuevoItem.codigo_barras);
        if (index !== -1) {
            inventario[index] = nuevoItem;
        } else {
            inventario.push(nuevoItem);
        }
    });
    
    StateManager.setInventario(inventario);
    displayInventory(inventario);
    updateStatistics();
}

export async function editInventory(codigoBarras) {
    const producto = StateManager.getProducto(codigoBarras);
    if (!producto) {
        notificationManager.error('Producto no encontrado');
        return;
    }
    
    StateManager.productoEditando = producto;
    
    document.getElementById('editCodigo').value = producto.codigo_barras;
    document.getElementById('editDescripcion').value = producto.descripcion || '';
    document.getElementById('editCantidad').value = producto.cantidad;
    document.getElementById('editCosto').value = producto.costo || 0;
    document.getElementById('editPrecio').value = producto.precio || 0;
    
    modalManager.open(Constants.MODAL_IDS.INVENTORY);
}

export async function saveInventory() {
    if (!StateManager.productoEditando) {
        notificationManager.error('No hay producto seleccionado para editar');
        return;
    }
    
    const descripcion = document.getElementById('editDescripcion').value;
    const cantidad = parseInt(document.getElementById('editCantidad').value);
    const costo = parseFloat(document.getElementById('editCosto').value);
    const precio = parseFloat(document.getElementById('editPrecio').value);
    
    try {
        const { data, error } = await supabaseClient.rpc(Constants.RPC_FUNCTIONS.EDIT_INVENTORY, {
            p_barcode: StateManager.productoEditando.codigo_barras,
            p_descripcion: descripcion,
            p_cantidad: cantidad,
            p_costo: costo,
            p_precio: precio
        });
        
        if (error) throw error;
        
        if (data && data.success) {
            notificationManager.success('✅ Producto actualizado');
            modalManager.close(Constants.MODAL_IDS.INVENTORY);
            
            StateManager.updateInventoryItem(StateManager.productoEditando.codigo_barras, {
                descripcion: descripcion,
                cantidad: cantidad,
                costo: costo,
                precio: precio,
                fecha_actualizacion: new Date().toISOString()
            });
            
            await loadInventoryData(false);
            
        } else {
            notificationManager.error('❌ Error: ' + (data?.message || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error actualizando inventario MEJORAS:', error);
        notificationManager.error('❌ Error al actualizar');
    }
}

export function updateStatistics() {
    const inventario = StateManager.getInventario();
    const stockBajo = inventario.filter(p => p.cantidad < Constants.STOCK_LEVELS.LOW).length;
    
    document.getElementById('stock-bajo').textContent = stockBajo;
    
    if (inventario.length > 0 && inventario[0].fecha_actualizacion) {
        const hora = DateTimeUtils.formatShortChileTime(inventario[0].fecha_actualizacion);
        document.getElementById('ultima-actualizacion').textContent = hora;
    }
}

export function updateSyncIndicator() {
    const indicador = document.getElementById('sincronizacion-indicador');
    if (!indicador) return;
    
    if (!StateManager.inventarioSincronizado) {
        indicador.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Inventario parcial';
        indicador.className = 'sync-indicator sync-warning';
    } else {
        indicador.innerHTML = '<i class="fas fa-check-circle"></i> Inventario completo';
        indicador.className = 'sync-indicator sync-success';
    }
}

export function markInventoryAsNotSynced() {
    StateManager.inventarioSincronizado = false;
    updateSyncIndicator();
}

export async function loadSalesData() {
    try {
        const { data, error } = await supabaseClient
            .from(Constants.API_ENDPOINTS.SALES_VIEW)
            .select('*')
            .order('fecha_venta', { ascending: false })
            .limit(200);
            
        if (error) throw error;
        
        StateManager.setVentas(data);
        displaySales(StateManager.ventas);
    } catch (error) {
        console.error('Error cargando ventas MEJORAS:', error);
        notificationManager.error('Error al cargar ventas MEJORAS');
    }
}

export function displaySales(data) {
    const tbody = document.getElementById('ventasBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const hoyChile = DateTimeUtils.getTodayChileDate();
    const ventasHoy = data.filter(v => {
        if (!v.fecha_venta) return false;
        const fechaVenta = v.fecha_venta.split('T')[0];
        return fechaVenta === hoyChile;
    });
    
    const totalHoy = ventasHoy.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    document.getElementById('ventas-hoy').textContent = `$${totalHoy.toFixed(2)}`;
    
    data.forEach(item => {
        const fecha = DateTimeUtils.formatToChileTime(item.fecha_venta);
        const descuento = parseFloat(item.descuento || 0);
        
        const rowHTML = `
            <tr>
                <td>${StringUtils.escapeHTML(item.codigo_barras)}</td>
                <td>${item.cantidad}</td>
                <td>$${parseFloat(item.precio_unitario || 0).toFixed(2)}</td>
                <td>${descuento > 0 ? `-$${descuento.toFixed(2)}` : '$0.00'}</td>
                <td><strong>$${parseFloat(item.total || 0).toFixed(2)}</strong></td>
                <td>${StringUtils.escapeHTML(item.descripcion || '')}</td>
                <td>${fecha}</td>
                <td>
                    <button class="action-btn btn-edit" data-codigo="${StringUtils.escapeHTML(item.codigo_barras)}" data-fecha="${StringUtils.escapeHTML(item.fecha_venta)}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="action-btn btn-delete" data-codigo="${StringUtils.escapeHTML(item.codigo_barras)}" data-fecha="${StringUtils.escapeHTML(item.fecha_venta)}" data-cantidad="${item.cantidad}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `;
        
        tbody.innerHTML += rowHTML;
    });
    
    document.querySelectorAll('#ventasBody .btn-edit').forEach(button => {
        button.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            const fecha = this.getAttribute('data-fecha');
            const { editSale } = await import('./ventas.js');
            editSale(codigo, fecha);
        });
    });
    
    document.querySelectorAll('#ventasBody .btn-delete').forEach(button => {
        button.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            const fecha = this.getAttribute('data-fecha');
            const cantidad = parseInt(this.getAttribute('data-cantidad'));
            const { deleteSale } = await import('./ventas.js');
            deleteSale(codigo, fecha, cantidad);
        });
    });
}

export function setupInventoryEventListeners() {
    const closeBtn = document.getElementById('close-modal-inventario');
    const cancelBtn = document.getElementById('cancel-inventario');
    const saveBtn = document.getElementById('save-inventario');
    const recargaBtn = document.getElementById('recarga-inventario-btn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modalManager.close(Constants.MODAL_IDS.INVENTORY));
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => modalManager.close(Constants.MODAL_IDS.INVENTORY));
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveInventory);
    }
    
    if (recargaBtn) {
        recargaBtn.addEventListener('click', async () => {
            notificationManager.info('🔄 Recargando inventario completo MEJORAS...');
            await loadInventoryData(true);
            StateManager.inventarioSincronizado = true;
            updateSyncIndicator();
        });
    }
}
