import { supabaseClient, StateManager, Constants } from '../config/supabase-config.js';
import { DateTimeUtils, InventoryUtils, StringUtils } from './utils.js';
import notificationManager from '../ui/notifications.js';
import modalManager from '../ui/modals.js';

export async function editSale(codigoBarras, fechaVenta) {
    const venta = StateManager.getVenta(codigoBarras, fechaVenta);
    if (!venta) {
        notificationManager.error('Venta no encontrada');
        return;
    }
    
    StateManager.ventaEditando = venta;
    
    const producto = StateManager.getProducto(codigoBarras);
    const stockActual = producto ? producto.cantidad : 0;
    
    document.getElementById('editVentaCodigo').value = venta.codigo_barras;
    document.getElementById('editVentaFecha').value = DateTimeUtils.formatToChileTime(venta.fecha_venta);
    document.getElementById('editVentaDescripcion').value = venta.descripcion || '';
    document.getElementById('editVentaPrecio').value = parseFloat(venta.precio_unitario).toFixed(2);
    document.getElementById('editVentaDescuento').value = parseFloat(venta.descuento || 0).toFixed(2);
    document.getElementById('editVentaCantidad').value = venta.cantidad;
    document.getElementById('editVentaDescripcion').placeholder = `Descripción | Stock actual: ${stockActual} unidades`;
    
    calculateNewTotalWithDiscount();
    modalManager.open(Constants.MODAL_IDS.SALE);
}

export function calculateNewTotalWithDiscount() {
    const precio = parseFloat(document.getElementById('editVentaPrecio').value) || 0;
    const descuento = parseFloat(document.getElementById('editVentaDescuento').value) || 0;
    const cantidad = parseInt(document.getElementById('editVentaCantidad').value) || 0;
    
    const { total } = InventoryUtils.calculateSaleTotal(cantidad, precio, descuento);
    document.getElementById('editVentaTotal').value = `$${total.toFixed(2)}`;
}

export async function saveSale() {
    if (!StateManager.ventaEditando) {
        notificationManager.error('❌ Error: No hay venta seleccionada para editar');
        return;
    }
    
    const nuevaCantidad = parseInt(document.getElementById('editVentaCantidad').value);
    const precio = parseFloat(document.getElementById('editVentaPrecio').value);
    const nuevoDescuento = parseFloat(document.getElementById('editVentaDescuento').value) || 0;
    
    const validation = InventoryUtils.validateSaleData(nuevaCantidad, precio, nuevoDescuento);
    if (!validation.isValid) {
        validation.errors.forEach(error => notificationManager.error(error));
        return;
    }
    
    try {
        notificationManager.info('🔄 Actualizando venta MEJORAS...');
        
        const { data, error } = await supabaseClient.rpc(Constants.RPC_FUNCTIONS.EDIT_SALE, {
            p_barcode: StateManager.ventaEditando.codigo_barras,
            p_fecha_venta: StateManager.ventaEditando.fecha_venta,
            p_nueva_cantidad: nuevaCantidad,
            p_nuevo_descuento: nuevoDescuento
        });
        
        if (error) throw error;
        
        if (data && data.success) {
            updateLocalInventoryAfterSaleEdit(nuevaCantidad);
            
            notificationManager.success('✅ Venta MEJORAS actualizada correctamente');
            modalManager.close(Constants.MODAL_IDS.SALE);
            
            const { loadSalesData } = await import('./inventario.js');
            await loadSalesData();
            const { updateStatistics } = await import('./inventario.js');
            updateStatistics();
            
            StateManager.ventaEditando = null;
            
        } else {
            const mensajeError = data?.error || 'Error desconocido';
            notificationManager.error('❌ Error: ' + mensajeError);
        }
    } catch (error) {
        console.error('Error completo al actualizar venta MEJORAS:', error);
        notificationManager.error('❌ Error al actualizar la venta MEJORAS: ' + error.message);
    }
}

function updateLocalInventoryAfterSaleEdit(nuevaCantidad) {
    const productoIndex = StateManager.getInventario().findIndex(p => 
        p.codigo_barras === StateManager.ventaEditando.codigo_barras
    );
    
    if (productoIndex !== -1) {
        const diferenciaCantidad = StateManager.ventaEditando.cantidad - nuevaCantidad;
        const nuevoStock = StateManager.getInventario()[productoIndex].cantidad + diferenciaCantidad;
        
        StateManager.updateInventoryItem(StateManager.ventaEditando.codigo_barras, {
            cantidad: nuevoStock,
            fecha_actualizacion: new Date().toISOString()
        });
        
        updateLocalInventoryRow(StateManager.ventaEditando.codigo_barras, nuevoStock);
    }
}

export async function deleteSale(codigoBarras, fechaVenta, cantidad) {
    if (!confirm(`¿Estás seguro de eliminar esta venta?\nCódigo: ${codigoBarras}\nCantidad: ${cantidad}\n\nEsta acción devolverá ${cantidad} unidades al inventario.`)) {
        return;
    }
    
    try {
        notificationManager.info('🔄 Eliminando venta MEJORAS...');
        
        const productoIndex = StateManager.getInventario().findIndex(p => p.codigo_barras === codigoBarras);
        if (productoIndex === -1) {
            notificationManager.error('❌ Producto no encontrado en inventario');
            return;
        }
        
        const stockActual = parseInt(StateManager.getInventario()[productoIndex].cantidad) || 0;
        const nuevoStock = stockActual + parseInt(cantidad);
        
        const { error: errorEliminar } = await supabaseClient
            .from(Constants.API_ENDPOINTS.SALES_TABLE)
            .delete()
            .eq('barcode', codigoBarras)
            .eq('fecha_venta', fechaVenta);
        
        if (errorEliminar) {
            console.error('Error eliminando venta:', errorEliminar);
            throw errorEliminar;
        }
        
        const { error: errorInventario } = await supabaseClient
            .from(Constants.API_ENDPOINTS.INVENTORY_TABLE)
            .update({ 
                cantidad: nuevoStock,
                fecha_actualizacion: new Date().toISOString()
            })
            .eq('barcode', codigoBarras);
        
        if (errorInventario) {
            console.error('Error actualizando inventario:', errorInventario);
            throw errorInventario;
        }
        
        StateManager.updateInventoryItem(codigoBarras, {
            cantidad: nuevoStock,
            fecha_actualizacion: new Date().toISOString()
        });
        
        updateLocalInventoryRow(codigoBarras, nuevoStock);
        
        const { loadSalesData } = await import('./inventario.js');
        await loadSalesData();
        const { updateStatistics } = await import('./inventario.js');
        updateStatistics();
        
        const producto = StateManager.getProducto(codigoBarras);
        const nombreProducto = producto ? producto.descripcion || codigoBarras : codigoBarras;
        notificationManager.success(`✅ Venta eliminada. Stock de ${nombreProducto} restaurado: ${stockActual} → ${nuevoStock} unidades`);
        
    } catch (error) {
        console.error('Error completo eliminando venta:', error);
        notificationManager.error('❌ Error al eliminar la venta: ' + error.message);
    }
}

function updateLocalInventoryRow(codigoBarras, nuevoStock) {
    const producto = StateManager.getProducto(codigoBarras);
    if (!producto) return;
    
    const tbody = document.getElementById('inventarioBody');
    if (!tbody) return;
    
    const filas = tbody.getElementsByTagName('tr');
    
    for (let fila of filas) {
        const codigoCelda = fila.cells[0].textContent.trim();
        if (codigoCelda === codigoBarras) {
            const stockBadge = InventoryUtils.getStockStatus(nuevoStock);
            const fecha = DateTimeUtils.formatToChileTime(producto.fecha_actualizacion);
            
            fila.cells[1].innerHTML = producto.descripcion ? 
                StringUtils.escapeHTML(producto.descripcion) : 
                '<span style="color: #94a3b8;">Sin descripción</span>';
            
            fila.cells[2].innerHTML = `<span class="stock-badge ${stockBadge.class}">${nuevoStock} unidades</span>`;
            fila.cells[3].textContent = `$${parseFloat(producto.costo || 0).toFixed(2)}`;
            fila.cells[4].innerHTML = `<strong>$${parseFloat(producto.precio || 0).toFixed(2)}</strong>`;
            fila.cells[5].textContent = fecha;
            break;
        }
    }
}

export function setupSalesEventListeners() {
    setupModalEventListeners();
    setupAddSaleEventListeners();
}

function setupModalEventListeners() {
    const closeBtn = document.getElementById('close-modal-venta');
    const cancelBtn = document.getElementById('cancel-venta');
    const saveBtn = document.getElementById('save-venta');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modalManager.close(Constants.MODAL_IDS.SALE));
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => modalManager.close(Constants.MODAL_IDS.SALE));
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSale);
    }
    
    const editCantidad = document.getElementById('editVentaCantidad');
    const editDescuento = document.getElementById('editVentaDescuento');
    
    if (editCantidad) {
        editCantidad.addEventListener('input', calculateNewTotalWithDiscount);
    }
    
    if (editDescuento) {
        editDescuento.addEventListener('input', calculateNewTotalWithDiscount);
    }
}

function setupAddSaleEventListeners() {
    const agregarVentaBtn = document.getElementById('agregar-venta-btn');
    const closeBtn = document.getElementById('close-modal-agregar-venta');
    const cancelBtn = document.getElementById('cancel-agregar-venta');
    const saveBtn = document.getElementById('save-agregar-venta');
    
    if (agregarVentaBtn) {
        agregarVentaBtn.addEventListener('click', openAddSaleModal);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modalManager.close(Constants.MODAL_IDS.ADD_SALE));
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => modalManager.close(Constants.MODAL_IDS.ADD_SALE));
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveNewSale);
    }
    
    const buscarProducto = document.getElementById('buscarProducto');
    const ventaCantidad = document.getElementById('ventaCantidad');
    const ventaPrecio = document.getElementById('ventaPrecio');
    const ventaDescuento = document.getElementById('ventaDescuento');
    
    if (buscarProducto) {
        buscarProducto.addEventListener('input', searchProducts);
    }
    
    if (ventaCantidad) {
        ventaCantidad.addEventListener('input', calculateSaleTotal);
    }
    
    if (ventaPrecio) {
        ventaPrecio.addEventListener('input', calculateSaleTotal);
    }
    
    if (ventaDescuento) {
        ventaDescuento.addEventListener('input', calculateSaleTotal);
    }
}
