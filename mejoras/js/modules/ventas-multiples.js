import { supabaseClient, StateManager, Constants } from '../config/supabase-config.js';
import { DateTimeUtils, InventoryUtils, StringUtils, InventoryUISync } from './utils.js';
import notificationManager from '../ui/notifications.js';
import modalManager from '../ui/modals.js';

let lineasVenta = [];
let idVentaActual = null;

export function openMultipleSaleModal() {
    console.log('Abriendo modal de venta múltiple');
    
    lineasVenta = [];
    idVentaActual = null;
    
    idVentaActual = Constants.VENTA_PREFIX + Date.now();
    console.log('ID Venta generado:', idVentaActual);
    
    const contenedor = document.getElementById('lineas-venta-container');
    if (contenedor) {
        contenedor.innerHTML = '';
    }
    
    agregarLineaVenta();
    
    actualizarContadorLineas();
    actualizarFechaVenta();
    calcularResumenVenta();
    
    modalManager.open(Constants.MODAL_IDS.MULTIPLE_SALE);
}

export function agregarLineaVenta() {
    const numeroLinea = lineasVenta.length + 1;
    
    if (numeroLinea > Constants.LIMITS.MAX_LINEAS_POR_VENTA) {
        notificationManager.warning(`Límite máximo: ${Constants.LIMITS.MAX_LINEAS_POR_VENTA} productos por venta`);
        return;
    }
    
    const nuevaLinea = {
        id: Date.now() + numeroLinea,
        numero: numeroLinea,
        producto: null,
        cantidad: 1,
        precio: 0,
        descuento: 0,
        subtotal: 0,
        descripcion: ''
    };
    
    lineasVenta.push(nuevaLinea);
    
    const htmlLinea = crearHTMLLinea(nuevaLinea);
    
    const contenedor = document.getElementById('lineas-venta-container');
    if (contenedor) {
        contenedor.insertAdjacentHTML('beforeend', htmlLinea);
        
        configurarEventListenersLinea(nuevaLinea.numero);
    }
    
    actualizarContadorLineas();
    
    console.log(`Línea ${numeroLinea} agregada`);
}

function crearHTMLLinea(linea) {
    return `
        <div class="venta-linea" data-linea-id="${linea.numero}">
            <div class="linea-header">
                <span class="linea-numero">Producto ${linea.numero}</span>
                <button class="linea-remove-btn" data-linea="${linea.numero}" ${linea.numero === 1 ? 'style="display: none;"' : ''}>
                    <i class="fas fa-times"></i> Quitar
                </button>
            </div>
            
            <div class="linea-body">
                <div class="form-group">
                    <label>Buscar Producto</label>
                    <div class="search-wrapper">
                        <input type="text" 
                               class="search-product-input linea-busqueda" 
                               data-linea="${linea.numero}"
                               placeholder="Escribe código o descripción..." 
                               autocomplete="off">
                        <div class="search-results-linea" data-linea="${linea.numero}"></div>
                    </div>
                </div>
                
                <div class="producto-info-linea" data-linea="${linea.numero}" style="display: none;">
                    <div class="producto-selected">
                        <p><strong>Producto:</strong> <span class="producto-nombre"></span></p>
                        <p><strong>Código:</strong> <span class="producto-codigo"></span></p>
                        <p><strong>Stock disponible:</strong> <span class="producto-stock"></span></p>
                        <p><strong>Precio actual:</strong> $<span class="producto-precio"></span></p>
                    </div>
                </div>
                
                <div class="linea-fields">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Cantidad</label>
                            <input type="number" 
                                   class="linea-cantidad" 
                                   data-linea="${linea.numero}" 
                                   min="1" 
                                   value="1" 
                                   required>
                        </div>
                        <div class="form-group">
                            <label>Precio Unitario</label>
                            <input type="number" 
                                   class="linea-precio" 
                                   data-linea="${linea.numero}" 
                                   step="0.01" 
                                   min="0" 
                                   required>
                        </div>
                        <div class="form-group">
                            <label>Descuento ($)</label>
                            <input type="number" 
                                   class="linea-descuento" 
                                   data-linea="${linea.numero}" 
                                   step="0.01" 
                                   min="0" 
                                   value="0" 
                                   required>
                            <small class="form-help">Monto fijo en pesos</small>
                        </div>
                        <div class="form-group">
                            <label>Subtotal</label>
                            <input type="text" 
                                   class="linea-subtotal readonly-input" 
                                   data-linea="${linea.numero}" 
                                   value="$0.00" 
                                   readonly>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Descripción (opcional)</label>
                        <textarea class="linea-descripcion" 
                                  data-linea="${linea.numero}" 
                                  rows="2" 
                                  placeholder="Descripción adicional..."></textarea>
                    </div>
                </div>
            </div>
            
            <div class="linea-separator"></div>
        </div>
    `;
}

function configurarEventListenersLinea(numeroLinea) {
    const inputBusqueda = document.querySelector(`.linea-busqueda[data-linea="${numeroLinea}"]`);
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', function() {
            buscarProductoEnLinea(numeroLinea, this.value);
        });
    }
    
    const inputCantidad = document.querySelector(`.linea-cantidad[data-linea="${numeroLinea}"]`);
    if (inputCantidad) {
        inputCantidad.addEventListener('input', function() {
            actualizarLinea(numeroLinea, 'cantidad', parseFloat(this.value) || 1);
        });
    }
    
    const inputPrecio = document.querySelector(`.linea-precio[data-linea="${numeroLinea}"]`);
    if (inputPrecio) {
        inputPrecio.addEventListener('input', function() {
            actualizarLinea(numeroLinea, 'precio', parseFloat(this.value) || 0);
        });
    }
    
    const inputDescuento = document.querySelector(`.linea-descuento[data-linea="${numeroLinea}"]`);
    if (inputDescuento) {
        inputDescuento.addEventListener('input', function() {
            actualizarLinea(numeroLinea, 'descuento', parseFloat(this.value) || 0);
        });
    }
    
    const textareaDescripcion = document.querySelector(`.linea-descripcion[data-linea="${numeroLinea}"]`);
    if (textareaDescripcion) {
        textareaDescripcion.addEventListener('input', function() {
            actualizarLinea(numeroLinea, 'descripcion', this.value);
        });
    }
    
    const botonQuitar = document.querySelector(`.linea-remove-btn[data-linea="${numeroLinea}"]`);
    if (botonQuitar) {
        botonQuitar.addEventListener('click', function() {
            eliminarLineaVenta(numeroLinea);
        });
    }
}

function buscarProductoEnLinea(numeroLinea, termino) {
    const resultadosDiv = document.querySelector(`.search-results-linea[data-linea="${numeroLinea}"]`);
    if (!resultadosDiv) return;
    
    if (termino.length < 2) {
        resultadosDiv.innerHTML = '';
        resultadosDiv.style.display = 'none';
        return;
    }
    
    const inventario = StateManager.getInventario();
    const resultados = inventario.filter(p => 
        p.codigo_barras.toLowerCase().includes(termino.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(termino.toLowerCase()))
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
                 data-codigo="${StringUtils.escapeHTML(producto.codigo_barras)}"
                 data-linea="${numeroLinea}">
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
    
    document.querySelectorAll(`.search-results-linea[data-linea="${numeroLinea}"] div`).forEach(div => {
        div.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            seleccionarProductoEnLinea(numeroLinea, codigo);
            resultadosDiv.style.display = 'none';
        });
    });
}

function seleccionarProductoEnLinea(numeroLinea, codigoBarras) {
    const producto = StateManager.getProducto(codigoBarras);
    if (!producto) {
        console.error('Producto no encontrado para código:', codigoBarras);
        return;
    }
    
    const lineaIndex = lineasVenta.findIndex(l => l.numero === numeroLinea);
    if (lineaIndex !== -1) {
        lineasVenta[lineaIndex].producto = producto;
        lineasVenta[lineaIndex].precio = parseFloat(producto.precio || 0);
        
        const infoDiv = document.querySelector(`.producto-info-linea[data-linea="${numeroLinea}"]`);
        const nombreSpan = infoDiv.querySelector('.producto-nombre');
        const codigoSpan = infoDiv.querySelector('.producto-codigo');
        const stockSpan = infoDiv.querySelector('.producto-stock');
        const precioSpan = infoDiv.querySelector('.producto-precio');
        const inputPrecio = document.querySelector(`.linea-precio[data-linea="${numeroLinea}"]`);
        const inputCantidad = document.querySelector(`.linea-cantidad[data-linea="${numeroLinea}"]`);
        
        if (nombreSpan) nombreSpan.textContent = producto.descripcion || 'Sin descripción';
        if (codigoSpan) codigoSpan.textContent = producto.codigo_barras;
        if (stockSpan) stockSpan.textContent = producto.cantidad;
        if (precioSpan) precioSpan.textContent = parseFloat(producto.precio || 0).toFixed(2);
        if (inputPrecio) inputPrecio.value = parseFloat(producto.precio || 0).toFixed(2);
        if (inputCantidad) {
            inputCantidad.max = producto.cantidad;
            inputCantidad.setAttribute('max', producto.cantidad);
        }
        
        infoDiv.style.display = 'block';
        
        actualizarLinea(numeroLinea, 'precio', parseFloat(producto.precio || 0));
        
        const inputBusqueda = document.querySelector(`.linea-busqueda[data-linea="${numeroLinea}"]`);
        if (inputBusqueda) inputBusqueda.value = '';
        
        console.log(`Producto seleccionado en línea ${numeroLinea}:`, producto.codigo_barras);
    }
}

function actualizarLinea(numeroLinea, campo, valor) {
    const lineaIndex = lineasVenta.findIndex(l => l.numero === numeroLinea);
    if (lineaIndex === -1) return;
    
    lineasVenta[lineaIndex][campo] = valor;
    
    if (['cantidad', 'precio', 'descuento'].includes(campo)) {
        calcularSubtotalLinea(numeroLinea);
    }
    
    calcularResumenVenta();
}

function calcularSubtotalLinea(numeroLinea) {
    const lineaIndex = lineasVenta.findIndex(l => l.numero === numeroLinea);
    if (lineaIndex === -1) return;
    
    const linea = lineasVenta[lineaIndex];
    const cantidad = parseFloat(linea.cantidad) || 0;
    const precio = parseFloat(linea.precio) || 0;
    const descuento = parseFloat(linea.descuento) || 0;
    
    if (cantidad <= 0 || precio <= 0) {
        linea.subtotal = 0;
        actualizarSubtotalEnDOM(numeroLinea, 0);
        return;
    }
    
    if (linea.producto && cantidad > linea.producto.cantidad) {
        const inputCantidad = document.querySelector(`.linea-cantidad[data-linea="${numeroLinea}"]`);
        if (inputCantidad) {
            inputCantidad.value = linea.producto.cantidad;
            linea.cantidad = linea.producto.cantidad;
        }
    }
    
    const subtotal = cantidad * precio;
    const total = Math.max(subtotal - descuento, 0);
    
    linea.subtotal = total;
    
    actualizarSubtotalEnDOM(numeroLinea, total);
}

function actualizarSubtotalEnDOM(numeroLinea, subtotal) {
    const inputSubtotal = document.querySelector(`.linea-subtotal[data-linea="${numeroLinea}"]`);
    if (inputSubtotal) {
        inputSubtotal.value = `$${subtotal.toFixed(2)}`;
    }
}

function eliminarLineaVenta(numeroLinea) {
    if (numeroLinea === 1) {
        notificationManager.warning('No se puede eliminar la primera línea de producto');
        return;
    }
    
    if (!confirm(`¿Eliminar producto ${numeroLinea} de la venta?`)) {
        return;
    }
    
    lineasVenta = lineasVenta.filter(l => l.numero !== numeroLinea);
    
    lineasVenta.forEach((linea, index) => {
        linea.numero = index + 1;
    });
    
    reconstruirLineasEnDOM();
    
    actualizarContadorLineas();
    
    calcularResumenVenta();
    
    console.log(`Línea ${numeroLinea} eliminada`);
}

function reconstruirLineasEnDOM() {
    const contenedor = document.getElementById('lineas-venta-container');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';
    
    lineasVenta.forEach(linea => {
        const htmlLinea = crearHTMLLinea(linea);
        contenedor.insertAdjacentHTML('beforeend', htmlLinea);
        
        configurarEventListenersLinea(linea.numero);
        
        if (linea.producto) {
            setTimeout(() => {
                seleccionarProductoEnLinea(linea.numero, linea.producto.codigo_barras);
                const inputCantidad = document.querySelector(`.linea-cantidad[data-linea="${linea.numero}"]`);
                const inputPrecio = document.querySelector(`.linea-precio[data-linea="${linea.numero}"]`);
                const inputDescuento = document.querySelector(`.linea-descuento[data-linea="${linea.numero}"]`);
                const textareaDescripcion = document.querySelector(`.linea-descripcion[data-linea="${linea.numero}"]`);
                
                if (inputCantidad) inputCantidad.value = linea.cantidad;
                if (inputPrecio) inputPrecio.value = linea.precio.toFixed(2);
                if (inputDescuento) inputDescuento.value = linea.descuento.toFixed(2);
                if (textareaDescripcion) textareaDescripcion.value = linea.descripcion;
                
                calcularSubtotalLinea(linea.numero);
            }, 100);
        }
    });
}

function calcularResumenVenta() {
    let subtotal = 0;
    let descuentoTotal = 0;
    let productosDistintos = 0;
    
    lineasVenta.forEach(linea => {
        if (linea.producto) {
            productosDistintos++;
        }
        subtotal += parseFloat(linea.subtotal) || 0;
        descuentoTotal += parseFloat(linea.descuento) || 0;
    });
    
    const total = subtotal;
    
    const resumenSubtotal = document.getElementById('resumen-subtotal');
    const resumenDescuento = document.getElementById('resumen-descuento');
    const resumenTotal = document.getElementById('resumen-total');
    const totalProductos = document.getElementById('total-productos-venta');
    
    if (resumenSubtotal) resumenSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    if (resumenDescuento) resumenDescuento.textContent = `$${descuentoTotal.toFixed(2)}`;
    if (resumenTotal) resumenTotal.textContent = `$${total.toFixed(2)}`;
    if (totalProductos) totalProductos.textContent = productosDistintos;
}

function actualizarContadorLineas() {
    const contador = document.getElementById('contador-lineas');
    if (contador) {
        contador.textContent = lineasVenta.length;
    }
}

function actualizarFechaVenta() {
    const fechaElement = document.getElementById('fecha-venta-multiple');
    if (fechaElement) {
        fechaElement.textContent = DateTimeUtils.getCurrentChileDate();
    }
}

export async function registrarVentaMultiple() {
    console.log('Iniciando registro de venta múltiple...');
    
    const lineasValidas = lineasVenta.filter(l => l.producto && l.cantidad > 0 && l.precio > 0);
    
    if (lineasValidas.length === 0) {
        notificationManager.error('Agrega al menos un producto a la venta');
        return;
    }
    
    for (const linea of lineasValidas) {
        if (linea.cantidad > linea.producto.cantidad) {
            notificationManager.error(`Stock insuficiente para ${linea.producto.descripcion || linea.producto.codigo_barras}. Disponible: ${linea.producto.cantidad}`);
            return;
        }
    }
    
    const observacionesInput = document.getElementById('observaciones-venta');
    const observaciones = observacionesInput ? observacionesInput.value.trim() : '';
    
    if (!navigator.onLine) {
        notificationManager.warning('Modo offline activado. La venta se guardará localmente');
        await guardarVentaMultipleOffline(lineasValidas, observaciones);
        return;
    }
    
    try {
        notificationManager.info(`🔄 Registrando venta con ${lineasValidas.length} productos...`);
        
        const ventasInsertadas = [];
        
        for (let i = 0; i < lineasValidas.length; i++) {
            const linea = lineasValidas[i];
            
            const ventaData = {
                barcode: linea.producto.codigo_barras,
                cantidad: linea.cantidad,
                precio_unitario: linea.precio,
                descuento: linea.descuento,
                descripcion: linea.descripcion || linea.producto.descripcion || '',
                fecha_venta: DateTimeUtils.getCurrentChileISO(),
                id_venta_agrupada: idVentaActual,
                numero_linea: i + 1
            };
            
            const { data, error } = await supabaseClient
                .from(Constants.API_ENDPOINTS.SALES_TABLE)
                .insert([ventaData])
                .select();
                
            if (error) throw error;
            
            ventasInsertadas.push(ventaData);
            
            const nuevoStock = linea.producto.cantidad - linea.cantidad;
            
            const { error: errorInventario } = await supabaseClient
                .from(Constants.API_ENDPOINTS.INVENTORY_TABLE)
                .update({ 
                    cantidad: nuevoStock,
                    fecha_actualizacion: DateTimeUtils.getCurrentChileISO()
                })
                .eq('barcode', linea.producto.codigo_barras);
                
            if (errorInventario) {
                console.error(`Error actualizando inventario para ${linea.producto.codigo_barras}:`, errorInventario);
            }
            
            StateManager.updateInventoryItem(linea.producto.codigo_barras, {
                cantidad: nuevoStock,
                fecha_actualizacion: new Date().toISOString()
            });
            
            InventoryUISync.updateSingleInventoryRow(linea.producto.codigo_barras, nuevoStock);
        }
        
        modalManager.close(Constants.MODAL_IDS.MULTIPLE_SALE);
        
        const totalVenta = lineasValidas.reduce((sum, linea) => sum + linea.subtotal, 0);
        notificationManager.success(`✅ Venta ${idVentaActual} registrada correctamente. Total: $${totalVenta.toFixed(2)}`);
        
        setTimeout(async () => {
            const { loadSalesData } = await import('./inventario.js');
            await loadSalesData();
        }, 1000);
        
        lineasVenta = [];
        idVentaActual = null;
        
    } catch (error) {
        console.error('Error registrando venta múltiple:', error);
        notificationManager.error('❌ Error al registrar la venta: ' + error.message);
        
        notificationManager.warning('Intentando guardar localmente...');
        await guardarVentaMultipleOffline(lineasValidas, observaciones);
    }
}

async function guardarVentaMultipleOffline(lineasValidas, observaciones) {
    try {
        const ventaOffline = {
            id: Date.now(),
            id_venta_agrupada: idVentaActual,
            fecha: DateTimeUtils.getCurrentChileISO(),
            lineas: lineasValidas.map(linea => ({
                barcode: linea.producto.codigo_barras,
                cantidad: linea.cantidad,
                precio_unitario: linea.precio,
                descuento: linea.descuento,
                descripcion: linea.descripcion || linea.producto.descripcion || '',
                producto: linea.producto
            })),
            observaciones: observaciones,
            estado: 'pendiente'
        };
        
        let ventasPendientes = JSON.parse(
            localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_MULTIPLE_SALES) || '[]'
        );
        
        ventasPendientes.push(ventaOffline);
        localStorage.setItem(
            Constants.LOCAL_STORAGE_KEYS.OFFLINE_MULTIPLE_SALES,
            JSON.stringify(ventasPendientes)
        );
        
        lineasValidas.forEach(linea => {
            const { updateLocalInventory } = import('./offline.js');
            updateLocalInventory(linea.producto.codigo_barras, -linea.cantidad);
        });
        
        modalManager.close(Constants.MODAL_IDS.MULTIPLE_SALE);
        
        notificationManager.success(`📴 Venta guardada localmente. ID: ${idVentaActual}`);
        
        const { updateLocalInventoryView } = await import('./offline.js');
        await updateLocalInventoryView();
        
        lineasVenta = [];
        idVentaActual = null;
        
    } catch (error) {
        console.error('Error guardando venta offline:', error);
        notificationManager.error('❌ Error al guardar la venta localmente');
    }
}

export function setupMultipleSalesEventListeners() {
    console.log('Configurando event listeners para ventas múltiples...');
    
    const agregarLineaBtn = document.getElementById('agregar-linea-btn');
    if (agregarLineaBtn) {
        agregarLineaBtn.addEventListener('click', agregarLineaVenta);
        console.log('Event listener agregado: agregar-linea-btn');
    }
    
    const registrarBtn = document.getElementById('registrar-venta-multiple');
    if (registrarBtn) {
        registrarBtn.addEventListener('click', registrarVentaMultiple);
        console.log('Event listener agregado: registrar-venta-multiple');
    }
    
    const cancelarBtn = document.querySelector('#modalVentaMultiple .btn-cancel');
    if (cancelarBtn) {
        cancelarBtn.addEventListener('click', () => {
            modalManager.close(Constants.MODAL_IDS.MULTIPLE_SALE);
            lineasVenta = [];
            idVentaActual = null;
        });
        console.log('Event listener agregado: botón cancelar');
    }
    
    const modal = document.getElementById('modalVentaMultiple');
    if (modal) {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modalManager.close(Constants.MODAL_IDS.MULTIPLE_SALE);
                lineasVenta = [];
                idVentaActual = null;
            });
        }
    }
    
    console.log('✅ Event listeners para ventas múltiples configurados');
}
