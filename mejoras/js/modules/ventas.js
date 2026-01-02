import { supabaseClient, StateManager, Constants } from '../config/supabase-config.js';
import { DateTimeUtils, InventoryUtils, StringUtils } from './utils.js';
import notificationManager from '../ui/notifications.js';
import modalManager from '../ui/modals.js';

// ========== FUNCIONES DE VENTAS INDIVIDUALES ==========

// Función para editar una venta
export async function editSale(codigoBarras, fechaVenta) {
    console.log('✏️ Editando venta:', codigoBarras, fechaVenta);
    
    const venta = StateManager.ventas.find(v => 
        v.codigo_barras === codigoBarras && v.fecha_venta === fechaVenta
    );
    
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

// Función para calcular el nuevo total con descuento
export function calculateNewTotalWithDiscount() {
    const precio = parseFloat(document.getElementById('editVentaPrecio').value) || 0;
    const descuento = parseFloat(document.getElementById('editVentaDescuento').value) || 0;
    const cantidad = parseInt(document.getElementById('editVentaCantidad').value) || 0;
    
    const { total } = InventoryUtils.calculateSaleTotal(cantidad, precio, descuento);
    document.getElementById('editVentaTotal').value = `$${total.toFixed(2)}`;
}

// Función para guardar una venta editada
export async function saveSale() {
    if (!StateManager.ventaEditando) {
        notificationManager.error('❌ Error: No hay venta seleccionada para editar');
        return;
    }
    
    const nuevaCantidad = parseInt(document.getElementById('editVentaCantidad').value);
    const nuevoDescuento = parseFloat(document.getElementById('editVentaDescuento').value) || 0;
    const precioActual = parseFloat(document.getElementById('editVentaPrecio').value) || 0;
    
    const validation = InventoryUtils.validateSaleData(nuevaCantidad, precioActual, nuevoDescuento);
    if (!validation.isValid) {
        validation.errors.forEach(error => notificationManager.error(error));
        return;
    }
    
    try {
        notificationManager.info('🔄 Actualizando venta...');
        
        const { data, error } = await supabaseClient.rpc(Constants.RPC_FUNCTIONS.EDIT_SALE, {
            p_barcode: StateManager.ventaEditando.codigo_barras,
            p_fecha_venta: StateManager.ventaEditando.fecha_venta,
            p_nueva_cantidad: nuevaCantidad,
            p_nuevo_descuento: nuevoDescuento
        });
        
        if (error) throw error;
        
        if (data && data.success) {
            updateLocalInventoryAfterSaleEdit(nuevaCantidad);
            
            notificationManager.success('✅ Venta actualizada correctamente');
            modalManager.close(Constants.MODAL_IDS.SALE);
            
            // Recargar ventas
            await reloadSalesData();
            const { updateStatistics } = await import('./inventario.js');
            updateStatistics();
            
            StateManager.ventaEditando = null;
            
        } else {
            const mensajeError = data?.error || 'Error desconocido';
            notificationManager.error('❌ Error: ' + mensajeError);
        }
    } catch (error) {
        console.error('Error actualizando venta:', error);
        notificationManager.error('❌ Error al actualizar la venta');
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

// Función para eliminar una venta
export async function deleteSale(codigoBarras, fechaVenta, cantidad) {
    if (!confirm(`¿Estás seguro de eliminar esta venta?\nCódigo: ${codigoBarras}\nCantidad: ${cantidad}`)) {
        return;
    }
    
    try {
        notificationManager.info('🔄 Eliminando venta...');
        
        // Buscar venta exacta
        const ventaEncontrada = StateManager.ventas.find(v => 
            v.codigo_barras === codigoBarras && v.fecha_venta === fechaVenta
        );
        
        if (!ventaEncontrada) {
            notificationManager.error('❌ Venta no encontrada');
            return;
        }
        
        const productoIndex = StateManager.getInventario().findIndex(p => p.codigo_barras === codigoBarras);
        if (productoIndex === -1) {
            notificationManager.error('❌ Producto no encontrado');
            return;
        }
        
        const stockActual = parseInt(StateManager.getInventario()[productoIndex].cantidad) || 0;
        const nuevoStock = stockActual + parseInt(cantidad);
        
        // Eliminar de Supabase
        const { error: errorEliminar } = await supabaseClient
            .from(Constants.API_ENDPOINTS.SALES_TABLE)
            .delete()
            .eq('barcode', codigoBarras)
            .eq('fecha_venta', fechaVenta);
        
        if (errorEliminar) throw errorEliminar;
        
        // Actualizar inventario
        const { error: errorInventario } = await supabaseClient
            .from(Constants.API_ENDPOINTS.INVENTORY_TABLE)
            .update({ 
                cantidad: nuevoStock,
                fecha_actualizacion: new Date().toISOString()
            })
            .eq('barcode', codigoBarras);
        
        if (errorInventario) throw errorInventario;
        
        // Actualizar StateManager
        StateManager.updateInventoryItem(codigoBarras, {
            cantidad: nuevoStock,
            fecha_actualizacion: new Date().toISOString()
        });
        
        updateLocalInventoryRow(codigoBarras, nuevoStock);
        
        // Remover venta del StateManager
        const ventaIndex = StateManager.ventas.findIndex(v => 
            v.codigo_barras === codigoBarras && v.fecha_venta === fechaVenta
        );
        
        if (ventaIndex !== -1) {
            StateManager.ventas.splice(ventaIndex, 1);
        }
        
        // Recargar ventas
        await reloadSalesData();
        
        // Actualizar estadísticas
        const { updateStatistics } = await import('./inventario.js');
        updateStatistics();
        
        notificationManager.success(`✅ Venta eliminada correctamente`);
        
    } catch (error) {
        console.error('Error eliminando venta:', error);
        notificationManager.error('❌ Error al eliminar la venta');
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

// Función para recargar ventas
async function reloadSalesData() {
    try {
        const { data, error } = await supabaseClient
            .from(Constants.API_ENDPOINTS.SALES_VIEW)
            .select('*')
            .order('fecha_venta', { ascending: false })
            .limit(200);
            
        if (error) throw error;
        
        StateManager.setVentas(data);
        
        // Actualizar vista
        displaySales(data);
        
        // Actualizar estadísticas
        updateSalesStatistics();
        
    } catch (error) {
        console.error('Error recargando ventas:', error);
        notificationManager.error('Error al recargar ventas');
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
    
    const ventasHoyElement = document.getElementById('ventas-hoy');
    if (ventasHoyElement) {
        ventasHoyElement.textContent = `$${totalHoy.toFixed(2)}`;
    }
}

// Función para mostrar ventas
export function displaySales(data) {
    const tbody = document.getElementById('ventasBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-inbox"></i> No hay ventas registradas
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(item => {
        const fechaFormateada = DateTimeUtils.formatToChileTime(item.fecha_venta);
        const descuento = parseFloat(item.descuento || 0);
        
        const rowHTML = `
            <tr>
                <td>${StringUtils.escapeHTML(item.codigo_barras)}</td>
                <td>${item.cantidad}</td>
                <td>$${parseFloat(item.precio_unitario || 0).toFixed(2)}</td>
                <td>${descuento > 0 ? `-$${descuento.toFixed(2)}` : '$0.00'}</td>
                <td><strong>$${parseFloat(item.total || 0).toFixed(2)}</strong></td>
                <td>${StringUtils.escapeHTML(item.descripcion || '')}</td>
                <td>${fechaFormateada}</td>
                <td>
                    <button class="action-btn btn-edit" 
                            data-codigo="${StringUtils.escapeHTML(item.codigo_barras)}" 
                            data-fecha="${StringUtils.escapeHTML(item.fecha_venta)}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="action-btn btn-delete" 
                            data-codigo="${StringUtils.escapeHTML(item.codigo_barras)}" 
                            data-fecha="${StringUtils.escapeHTML(item.fecha_venta)}" 
                            data-cantidad="${item.cantidad}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `;
        
        tbody.innerHTML += rowHTML;
    });
    
    // Configurar event listeners
    setupSalesRowEventListeners();
}

function setupSalesRowEventListeners() {
    document.querySelectorAll('#ventasBody .btn-edit').forEach(button => {
        button.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            const fecha = this.getAttribute('data-fecha');
            editSale(codigo, fecha);
        });
    });
    
    document.querySelectorAll('#ventasBody .btn-delete').forEach(button => {
        button.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            const fecha = this.getAttribute('data-fecha');
            const cantidad = parseInt(this.getAttribute('data-cantidad'));
            deleteSale(codigo, fecha, cantidad);
        });
    });
}

// ========== FUNCIONES PARA AGREGAR VENTAS ==========

// Función para abrir modal de agregar venta
export function openAddSaleModal() {
    console.log('➕ Abriendo modal de agregar venta');
    
    StateManager.productoSeleccionado = null;
    document.getElementById('buscarProducto').value = '';
    document.getElementById('resultadosBusqueda').innerHTML = '';
    document.getElementById('resultadosBusqueda').style.display = 'none';
    document.getElementById('infoProducto').style.display = 'none';
    document.getElementById('ventaCantidad').value = 1;
    document.getElementById('ventaPrecio').value = '';
    document.getElementById('ventaDescuento').value = 0;
    document.getElementById('ventaDescripcion').value = '';
    document.getElementById('ventaTotal').textContent = '$0.00';
    document.getElementById('fechaVentaActual').textContent = DateTimeUtils.getCurrentChileDate();
    
    modalManager.open(Constants.MODAL_IDS.ADD_SALE);
}

// Función para buscar productos
export function searchProducts() {
    const termino = document.getElementById('buscarProducto').value.trim().toLowerCase();
    const resultadosDiv = document.getElementById('resultadosBusqueda');
    
    if (!resultadosDiv) return;
    
    if (termino.length < 2) {
        resultadosDiv.innerHTML = '';
        resultadosDiv.style.display = 'none';
        return;
    }
    
    const inventario = StateManager.getInventario();
    const resultados = inventario.filter(p => 
        p.codigo_barras.toLowerCase().includes(termino) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(termino))
    ).slice(0, 10);
    
    if (resultados.length === 0) {
        resultadosDiv.innerHTML = '<div style="padding: 10px; color: #64748b;">No se encontraron productos</div>';
        resultadosDiv.style.display = 'block';
        return;
    }
    
    let html = '';
    resultados.forEach(producto => {
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
    
    // Agregar event listeners
    document.querySelectorAll('#resultadosBusqueda div').forEach(div => {
        div.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            selectProduct(codigo);
        });
    });
}

// Función para seleccionar producto
export function selectProduct(codigoBarras) {
    StateManager.productoSeleccionado = StateManager.getProducto(codigoBarras);
    
    if (StateManager.productoSeleccionado) {
        document.getElementById('productoCodigo').textContent = StateManager.productoSeleccionado.codigo_barras;
        document.getElementById('productoNombre').textContent = StateManager.productoSeleccionado.descripcion || 'Sin descripción';
        document.getElementById('productoStock').textContent = StateManager.productoSeleccionado.cantidad;
        document.getElementById('productoPrecio').textContent = parseFloat(StateManager.productoSeleccionado.precio || 0).toFixed(2);
        document.getElementById('ventaPrecio').value = parseFloat(StateManager.productoSeleccionado.precio || 0).toFixed(2);
        document.getElementById('ventaDescuento').value = 0;
        document.getElementById('ventaDescripcion').value = StateManager.productoSeleccionado.descripcion || '';
        
        const ventaCantidadInput = document.getElementById('ventaCantidad');
        if (ventaCantidadInput) {
            ventaCantidadInput.max = StateManager.productoSeleccionado.cantidad;
        }
        
        document.getElementById('resultadosBusqueda').style.display = 'none';
        document.getElementById('infoProducto').style.display = 'block';
        calculateSaleTotal();
    }
}

// Función para calcular total de venta
export function calculateSaleTotal() {
    const cantidad = parseInt(document.getElementById('ventaCantidad').value) || 0;
    const precio = parseFloat(document.getElementById('ventaPrecio').value) || 0;
    const descuento = parseFloat(document.getElementById('ventaDescuento').value) || 0;
    
    const { total } = InventoryUtils.calculateSaleTotal(cantidad, precio, descuento);
    document.getElementById('ventaTotal').textContent = `$${total.toFixed(2)}`;
}

// Función para guardar nueva venta
export async function saveNewSale() {
    if (!StateManager.productoSeleccionado) {
        notificationManager.error('❌ Primero selecciona un producto');
        return;
    }
    
    const cantidad = parseInt(document.getElementById('ventaCantidad').value);
    const precio = parseFloat(document.getElementById('ventaPrecio').value);
    const descuento = parseFloat(document.getElementById('ventaDescuento').value) || 0;
    const descripcion = document.getElementById('ventaDescripcion').value.trim();
    const codigoBarras = StateManager.productoSeleccionado.codigo_barras;
    
    const validation = InventoryUtils.validateSaleData(cantidad, precio, descuento);
    if (!validation.isValid) {
        validation.errors.forEach(error => notificationManager.error(error));
        return;
    }
    
    if (cantidad > StateManager.productoSeleccionado.cantidad) {
        notificationManager.error(`❌ Stock insuficiente. Disponible: ${StateManager.productoSeleccionado.cantidad}`);
        return;
    }
    
    const ventaData = {
        barcode: codigoBarras,
        cantidad: cantidad,
        precio_unitario: precio,
        descuento: descuento,
        descripcion: descripcion || StateManager.productoSeleccionado.descripcion || '',
        fecha_venta: DateTimeUtils.getCurrentChileISO()
    };
    
    // Modo offline
    if (!navigator.onLine) {
        const { saveSaleOffline } = await import('./offline.js');
        saveSaleOffline(ventaData);
        
        const { updateLocalInventory } = await import('./offline.js');
        updateLocalInventory(codigoBarras, -cantidad);
        
        notificationManager.warning('📴 Venta guardada localmente');
        modalManager.close(Constants.MODAL_IDS.ADD_SALE);
        return;
    }
    
    try {
        const { error: errorVenta } = await supabaseClient
            .from(Constants.API_ENDPOINTS.SALES_TABLE)
            .insert([ventaData]);
            
        if (errorVenta) throw errorVenta;
        
        const nuevoStock = StateManager.productoSeleccionado.cantidad - cantidad;
        
        const { error: errorInventario } = await supabaseClient
            .from(Constants.API_ENDPOINTS.INVENTORY_TABLE)
            .update({ 
                cantidad: nuevoStock,
                fecha_actualizacion: DateTimeUtils.getCurrentChileISO()
            })
            .eq('barcode', codigoBarras);
            
        if (errorInventario) throw errorInventario;
        
        StateManager.updateInventoryItem(codigoBarras, {
            cantidad: nuevoStock,
            fecha_actualizacion: new Date().toISOString()
        });
        
        updateLocalInventoryRow(codigoBarras, nuevoStock);
        
        // Recargar ventas
        await reloadSalesData();
        
        notificationManager.success('✅ Venta registrada correctamente');
        modalManager.close(Constants.MODAL_IDS.ADD_SALE);
        
        const { updateStatistics } = await import('./inventario.js');
        updateStatistics();
        
    } catch (error) {
        console.warn('Error online, guardando offline:', error);
        
        const { saveSaleOffline } = await import('./offline.js');
        saveSaleOffline(ventaData);
        
        const { updateLocalInventory } = await import('./offline.js');
        updateLocalInventory(codigoBarras, -cantidad);
        
        notificationManager.warning('⚠️ Error de conexión. Venta guardada localmente');
        modalManager.close(Constants.MODAL_IDS.ADD_SALE);
    }
}

// ========== FUNCIONES DE REPORTES ==========

// Función para mostrar encargos pendientes
export async function showPendingOrdersReport() {
    const inventario = StateManager.getInventario();
    const encargos = inventario.filter(producto => producto.cantidad < 0);
    
    if (encargos.length === 0) {
        notificationManager.success('✅ No hay encargos pendientes');
        return;
    }
    
    document.getElementById('total-encargos').textContent = encargos.length;
    const tbody = document.getElementById('lista-encargos');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    encargos.forEach(producto => {
        const cantidadPendiente = Math.abs(producto.cantidad);
        const costoUnitario = parseFloat(producto.costo || 0);
        const costoProducto = cantidadPendiente * costoUnitario;
        
        const row = `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px;"><strong>${StringUtils.escapeHTML(producto.codigo_barras)}</strong></td>
                <td style="padding: 12px;">${StringUtils.escapeHTML(producto.descripcion || '<span style="color: #94a3b8;">Sin descripción</span>')}</td>
                <td style="padding: 12px;">
                    <span style="padding: 4px 10px; background: #fee2e2; color: #dc2626; border-radius: 20px; font-weight: bold;">
                        ${cantidadPendiente} unidades
                    </span>
                </td>
                <td style="padding: 12px;">
                    <div>$${costoUnitario.toFixed(2)} c/u</div>
                    <div style="font-size: 12px; color: #64748b;">Total: $${costoProducto.toFixed(2)}</div>
                </td>
            </tr>
        `;
        
        tbody.innerHTML += row;
    });
    
    modalManager.open(Constants.MODAL_IDS.ORDERS);
    notificationManager.success(`💰 Reporte de encargos generado`);
}

// Función para exportar a Excel
export function exportToExcel() {
    const tabActiva = document.querySelector('.tab-btn.active').textContent.toLowerCase();
    let data, filename;
    
    if (tabActiva.includes('inventario')) {
        data = StateManager.getInventario();
        filename = 'inventario_cliente.xlsx';
    } else {
        data = StateManager.ventas;
        filename = 'ventas_cliente.xlsx';
    }
    
    if (data.length === 0) {
        notificationManager.warning('No hay datos para exportar');
        return;
    }
    
    let csv = '';
    
    if (data.length > 0) {
        const headers = Object.keys(data[0]);
        csv += headers.join(',') + '\n';
        
        data.forEach(item => {
            const row = headers.map(header => {
                let value = item[header];
                if (typeof value === 'string' && value.includes(',')) {
                    value = `"${value}"`;
                }
                if (value === null || value === undefined) {
                    value = '';
                }
                return value;
            });
            csv += row.join(',') + '\n';
        });
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = filename;
    a.click();
    
    window.URL.revokeObjectURL(url);
    
    notificationManager.success('Archivo exportado correctamente');
}

// ========== CONFIGURACIÓN DE EVENT LISTENERS ==========

// Función para configurar event listeners del modal de edición
function setupModalEventListeners() {
    const editCantidad = document.getElementById('editVentaCantidad');
    const editDescuento = document.getElementById('editVentaDescuento');
    const editPrecio = document.getElementById('editVentaPrecio');
    
    if (editCantidad) {
        editCantidad.addEventListener('input', calculateNewTotalWithDiscount);
    }
    
    if (editDescuento) {
        editDescuento.addEventListener('input', calculateNewTotalWithDiscount);
    }
    
    if (editPrecio) {
        editPrecio.addEventListener('input', calculateNewTotalWithDiscount);
    }
    
    const saveVentaBtn = document.getElementById('save-venta');
    const cancelVentaBtn = document.querySelector('#modalVenta .btn-cancel');
    const closeVentaBtn = document.querySelector('#modalVenta .modal-close');
    
    if (saveVentaBtn) {
        saveVentaBtn.addEventListener('click', saveSale);
    }
    
    if (cancelVentaBtn) {
        cancelVentaBtn.addEventListener('click', () => modalManager.close(Constants.MODAL_IDS.SALE));
    }
    
    if (closeVentaBtn) {
        closeVentaBtn.addEventListener('click', () => modalManager.close(Constants.MODAL_IDS.SALE));
    }
}

// Función para configurar event listeners de agregar venta
function setupAddSaleEventListeners() {
    const agregarVentaBtn = document.getElementById('agregar-venta-btn');
    const saveAgregarVentaBtn = document.getElementById('save-agregar-venta');
    const cancelAgregarVentaBtn = document.querySelector('#modalAgregarVenta .btn-cancel');
    const closeAgregarVentaBtn = document.querySelector('#modalAgregarVenta .modal-close');
    
    if (agregarVentaBtn) {
        agregarVentaBtn.addEventListener('click', openAddSaleModal);
    }
    
    if (saveAgregarVentaBtn) {
        saveAgregarVentaBtn.addEventListener('click', saveNewSale);
    }
    
    if (cancelAgregarVentaBtn) {
        cancelAgregarVentaBtn.addEventListener('click', () => modalManager.close(Constants.MODAL_IDS.ADD_SALE));
    }
    
    if (closeAgregarVentaBtn) {
        closeAgregarVentaBtn.addEventListener('click', () => modalManager.close(Constants.MODAL_IDS.ADD_SALE));
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

// Función para configurar otros event listeners
function setupOtherEventListeners() {
    const exportarExcelBtn = document.getElementById('exportar-excel-btn');
    const reporteEncargosBtn = document.getElementById('reporte-encargos-btn');
    const closeEncargosBtn = document.querySelector('#modalEncargos .modal-close');
    const cancelEncargosBtn = document.querySelector('#modalEncargos .btn-cancel');
    
    if (exportarExcelBtn) {
        exportarExcelBtn.addEventListener('click', exportToExcel);
    }
    
    if (reporteEncargosBtn) {
        reporteEncargosBtn.addEventListener('click', showPendingOrdersReport);
    }
    
    if (closeEncargosBtn) {
        closeEncargosBtn.addEventListener('click', () => modalManager.close(Constants.MODAL_IDS.ORDERS));
    }
    
    if (cancelEncargosBtn) {
        cancelEncargosBtn.addEventListener('click', () => modalManager.close(Constants.MODAL_IDS.ORDERS));
    }
}

// Función principal para configurar todos los event listeners
export function setupSalesEventListeners() {
    setupModalEventListeners();
    setupAddSaleEventListeners();
    setupOtherEventListeners();
    
    console.log('✅ Event listeners de ventas configurados');
}
