import { supabaseClient, StateManager, Constants } from '../config/supabase-config.js';
import { DateTimeUtils, InventoryUtils, StringUtils } from './utils.js';
import notificationManager from '../ui/notifications.js';
import modalManager from '../ui/modals.js';
import { updateSalesTableView } from '../ui/sales-table.js';

// ========== FUNCIONES EXISTENTES (MODIFICADAS) ==========

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
            notificationManager.info('🔄 Cargando inventario COMPLETO...');
            
            const { data, error } = await supabaseClient
                .from(Constants.API_ENDPOINTS.INVENTORY_VIEW)
                .select('*')
                .order('fecha_actualizacion', { ascending: false });
                
            if (error) throw error;
            
            StateManager.setInventario(data);
            displayInventory(StateManager.getInventario());
            notificationManager.success(`✅ Inventario cargado (${data.length} productos)`);
            StateManager.inventarioSincronizado = true;
            
        } else {
            notificationManager.info('🔄 Actualizando inventario...');
            
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
                notificationManager.success(`✅ Inventario actualizado (${data.length} productos modificados)`);
                markInventoryAsNotSynced();
            } else {
                notificationManager.success('✅ Inventario ya está actualizado');
            }
        }
        
    } catch (error) {
        console.error('Error cargando inventario:', error);
        notificationManager.error('Error al cargar inventario');
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
    
    setupInventoryRowEventListeners();
    
    document.getElementById('total-productos').textContent = StateManager.getInventario().length;
}

function setupInventoryRowEventListeners() {
    document.querySelectorAll('#inventarioBody .btn-edit').forEach(button => {
        button.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            editInventory(codigo);
        });
    });
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
            
            // Actualización incremental - solo esta fila
            StateManager.updateInventoryItem(StateManager.productoEditando.codigo_barras, {
                descripcion: descripcion,
                cantidad: cantidad,
                costo: costo,
                precio: precio,
                fecha_actualizacion: new Date().toISOString()
            });
            
            // Actualizar solo la fila en la tabla
            updateSingleInventoryRow(StateManager.productoEditando.codigo_barras);
            
            // Actualizar estadísticas
            updateStatistics();
            
        } else {
            notificationManager.error('❌ Error: ' + (data?.message || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error actualizando inventario:', error);
        notificationManager.error('❌ Error al actualizar');
    }
}

function updateSingleInventoryRow(codigoBarras) {
    const producto = StateManager.getProducto(codigoBarras);
    if (!producto) return;
    
    const tbody = document.getElementById('inventarioBody');
    if (!tbody) return;
    
    const filas = tbody.getElementsByTagName('tr');
    
    for (let fila of filas) {
        const codigoCelda = fila.cells[0].textContent.trim();
        if (codigoCelda === codigoBarras) {
            const stockBadge = InventoryUtils.getStockStatus(producto.cantidad);
            const fecha = DateTimeUtils.formatToChileTime(producto.fecha_actualizacion);
            
            fila.cells[1].innerHTML = producto.descripcion ? 
                StringUtils.escapeHTML(producto.descripcion) : 
                '<span style="color: #94a3b8;">Sin descripción</span>';
            
            fila.cells[2].innerHTML = `<span class="stock-badge ${stockBadge.class}">${producto.cantidad} unidades</span>`;
            fila.cells[3].textContent = `$${parseFloat(producto.costo || 0).toFixed(2)}`;
            fila.cells[4].innerHTML = `<strong>$${parseFloat(producto.precio || 0).toFixed(2)}</strong>`;
            fila.cells[5].textContent = fecha;
            
            // Actualizar el botón de editar
            const editButton = fila.cells[6].querySelector('.btn-edit');
            if (editButton) {
                editButton.setAttribute('data-codigo', producto.codigo_barras);
                // Remover listeners antiguos y añadir nuevos
                editButton.replaceWith(editButton.cloneNode(true));
            }
            break;
        }
    }
    
    // Re-configurar listeners
    setupInventoryRowEventListeners();
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

// ========== FUNCIONES DE VENTAS (MODIFICADAS PARA INTEGRACIÓN) ==========

export async function loadSalesData() {
    try {
        const { data, error } = await supabaseClient
            .from(Constants.API_ENDPOINTS.SALES_VIEW)
            .select('*')
            .order('fecha_venta', { ascending: false })
            .limit(Constants.LIMITS.MAX_VENTAS_POR_CARGA);
            
        if (error) throw error;
        
        StateManager.setVentas(data);
        
        // Usar la nueva visualización agrupada
        updateSalesTableView(true);
        
        // Actualizar estadísticas de ventas del día
        updateSalesStatistics();
        
    } catch (error) {
        console.error('Error cargando ventas:', error);
        notificationManager.error('Error al cargar ventas');
    }
}

// Función para actualizar estadísticas de ventas
function updateSalesStatistics() {
    const ventas = StateManager.ventas;
    const hoyChile = DateTimeUtils.getTodayChileDate();
    
    const ventasHoy = ventas.filter(v => {
        if (!v.fecha_venta) return false;
        const fechaVenta = v.fecha_venta.split('T')[0];
        return fechaVenta === hoyChile;
    });
    
    const totalHoy = ventasHoy.reduce((sum, v) => {
        const subtotal = (v.cantidad * v.precio_unitario) - (v.descuento || 0);
        return sum + subtotal;
    }, 0);
    
    document.getElementById('ventas-hoy').textContent = `$${totalHoy.toFixed(2)}`;
}

// ========== FUNCIONES DE VISUALIZACIÓN (MANTENIDAS PARA COMPATIBILIDAD) ==========

// Función mantenida para compatibilidad con módulo de ventas.js
export function displaySales(data) {
    // Esta función ya no se usa directamente, pero se mantiene por compatibilidad
    // La visualización real ahora está en sales-table.js
    updateSalesTableView(true);
}

// ========== FUNCIONES DE NAVEGACIÓN ==========

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    if (tabName === 'ventas') {
        document.getElementById('tab-ventas-btn').classList.add('active');
    } else {
        document.getElementById('tab-inventario-btn').classList.add('active');
    }
}

// ========== CONFIGURACIÓN DE EVENT LISTENERS ==========

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
            notificationManager.info('🔄 Recargando inventario completo...');
            await loadInventoryData(true);
            StateManager.inventarioSincronizado = true;
            updateSyncIndicator();
        });
    }
}
