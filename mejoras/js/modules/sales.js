/* ============================================
   GESTIÓN DE VENTAS
   ============================================
   Manejo completo de ventas de productos:
   - Carga y visualización de ventas
   - Agregar nuevas ventas manuales
   - Editar y actualizar ventas existentes
   - Estadísticas y reportes de ventas
   ============================================ */

// ============================================
// VARIABLES GLOBALES DE VENTAS
// ============================================

/**
 * Array con todas las ventas
 * @type {Array<Object>}
 */
let ventas = [];

/**
 * Cache de ventas para mejor performance
 * @type {Object}
 */
let ventasCache = {
    data: null,
    timestamp: 0,
    expiresIn: 30000 // 30 segundos
};

/**
 * Filtro actual aplicado a las ventas
 * @type {Object}
 */
let filtroVentas = {
    texto: '',
    fechaDesde: '',
    fechaHasta: '',
    soloHoy: true,
    ordenPor: 'fecha_venta',
    ordenAscendente: false
};

/**
 * Suscripción a cambios en tiempo real de ventas
 * @type {RealtimeChannel|null}
 */
let ventasRealtimeChannel = null;

// ============================================
// INICIALIZACIÓN DEL MÓDULO DE VENTAS
// ============================================

/**
 * Inicializa el módulo de ventas
 */
function initializeSales() {
    console.log('💰 Inicializando módulo de ventas...');
    
    // Configurar event listeners
    setupSalesListeners();
    
    // Configurar real-time si hay usuario autenticado
    if (window.auth?.isAuthenticated()) {
        setupSalesRealtime();
    }
    
    console.log('✅ Módulo de ventas inicializado');
}

// ============================================
// CARGA DE DATOS DE VENTAS
// ============================================

/**
 * Carga las ventas desde Supabase
 * @async
 * @param {boolean} forceRefresh - Forzar recarga ignorando cache
 * @returns {Promise<Array>} Array de ventas
 */
async function cargarVentas(forceRefresh = false) {
    try {
        console.log('📥 Cargando ventas...');
        
        // Verificar cache si no se fuerza refresh
        if (!forceRefresh && isVentasCacheValid()) {
            console.log('💰 Usando cache de ventas');
            ventas = ventasCache.data;
            mostrarVentas(ventas);
            actualizarEstadisticasVentas();
            return ventas;
        }
        
        // Mostrar estado de carga
        showSalesLoadingState(true);
        
        // Obtener cliente Supabase
        const supabase = window.supabaseConfig?.getClient();
        if (!supabase) {
            throw new Error('Cliente Supabase no disponible');
        }
        
        // Construir query base
        let query = supabase
            .from('vista_ventas_mejoras')
            .select('*');
        
        // Aplicar filtro de fecha si está activo
        if (filtroVentas.soloHoy) {
            const fechaHoy = window.utils.getFechaHoyChile();
            query = query.gte('fecha_venta', `${fechaHoy}T00:00:00`)
                         .lte('fecha_venta', `${fechaHoy}T23:59:59`);
        } else if (filtroVentas.fechaDesde && filtroVentas.fechaHasta) {
            query = query.gte('fecha_venta', `${filtroVentas.fechaDesde}T00:00:00`)
                         .lte('fecha_venta', `${filtroVentas.fechaHasta}T23:59:59`);
        }
        
        // Aplicar ordenamiento
        query = query.order(filtroVentas.ordenPor, { 
            ascending: filtroVentas.ordenAscendente 
        });
        
        // Limitar resultados para performance
        query = query.limit(500);
        
        // Ejecutar query
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // Actualizar cache
        ventasCache.data = data;
        ventasCache.timestamp = Date.now();
        
        // Actualizar variable global
        ventas = data;
        
        // Actualizar UI
        mostrarVentas(ventas);
        actualizarEstadisticasVentas();
        
        console.log(`✅ Ventas cargadas: ${data.length} registros`);
        
        // Ocultar estado de carga
        showSalesLoadingState(false);
        
        return data;
        
    } catch (error) {
        console.error('❌ Error cargando ventas:', error);
        registrarError('sales_load', error);
        
        // Mostrar error al usuario
        if (window.notifications) {
            window.notifications.showNotification(
                'Error al cargar las ventas. Intentando nuevamente...',
                'error'
            );
        }
        
        // Intentar cargar desde cache si hay error
        if (ventasCache.data) {
            console.log('🔄 Usando datos cacheados por error de red');
            ventas = ventasCache.data;
            mostrarVentas(ventas);
            actualizarEstadisticasVentas();
        }
        
        showSalesLoadingState(false);
        return ventasCache.data || [];
    }
}

/**
 * Verifica si el cache de ventas es válido
 * @returns {boolean} True si el cache es válido
 */
function isVentasCacheValid() {
    if (!ventasCache.data || ventasCache.timestamp === 0) {
        return false;
    }
    
    const now = Date.now();
    const cacheAge = now - ventasCache.timestamp;
    
    return cacheAge < ventasCache.expiresIn;
}

/**
 * Muestra/oculta el estado de carga en tabla de ventas
 * @param {boolean} isLoading - True para mostrar estado de carga
 */
function showSalesLoadingState(isLoading) {
    const tbody = document.getElementById('ventasBody');
    if (!tbody) return;
    
    if (isLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="spinner"></div>
                    <p class="text-muted">Cargando ventas...</p>
                </td>
            </tr>
        `;
    }
}

// ============================================
// VISUALIZACIÓN DE VENTAS
// ============================================

/**
 * Muestra las ventas en la tabla
 * @param {Array} data - Datos a mostrar
 */
function mostrarVentas(data) {
    const tbody = document.getElementById('ventasBody');
    if (!tbody) {
        console.error('❌ Tabla de ventas no encontrada');
        return;
    }
    
    // Limpiar tabla
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div style="padding: 40px 20px; color: var(--gray-500);">
                        <i class="fas fa-shopping-cart fa-2x" style="opacity: 0.5; margin-bottom: 15px;"></i>
                        <p>No hay ventas registradas</p>
                        ${filtroVentas.soloHoy ? '<small class="text-muted">Mostrando solo ventas de hoy</small>' : ''}
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Aplicar filtros si existen
    let ventasFiltradas = data;
    if (filtroVentas.texto) {
        ventasFiltradas = filtrarVentas(data, filtroVentas.texto);
    }
    
    // Aplicar ordenamiento
    ventasFiltradas = ordenarVentas(ventasFiltradas, filtroVentas.ordenPor, filtroVentas.ordenAscendente);
    
    // Calcular totales
    const totalVentas = calcularTotalVentas(ventasFiltradas);
    
    // Renderizar filas
    ventasFiltradas.forEach(venta => {
        const row = crearFilaVenta(venta);
        tbody.appendChild(row);
    });
    
    // Actualizar contador y total
    updateSalesCount(ventasFiltradas.length, data.length, totalVentas);
}

/**
 * Crea una fila de tabla para una venta
 * @param {Object} venta - Datos de la venta
 * @returns {HTMLTableRowElement} Fila creada
 */
function crearFilaVenta(venta) {
    const row = document.createElement('tr');
    
    // Formatear valores
    const fechaVenta = window.utils.formatoHoraChile(venta.fecha_venta);
    const precioUnitario = window.utils.formatoMoneda(venta.precio_unitario || 0);
    const descuento = parseFloat(venta.descuento || 0);
    const descuentoFormateado = descuento > 0 ? `-$${descuento.toFixed(2)}` : '$0.00';
    const total = window.utils.formatoMoneda(venta.total || 0);
    
    // Crear contenido de la fila
    row.innerHTML = `
        <td>${venta.codigo_barras}</td>
        <td class="text-right">${venta.cantidad}</td>
        <td class="text-right">${precioUnitario}</td>
        <td class="text-right">${descuentoFormateado}</td>
        <td class="text-right"><strong>${total}</strong></td>
        <td>
            <div>${venta.descripcion || '<span class="text-muted">Sin descripción</span>'}</div>
            ${venta.descripcion ? `<small class="text-muted">${window.utils.truncarTexto(venta.descripcion, 60)}</small>` : ''}
        </td>
        <td>
            <div>${fechaVenta}</div>
            <small class="text-muted">${window.utils.formatoHoraCortaChile(venta.fecha_venta)}</small>
        </td>
        <td class="text-center">
            <button class="action-btn btn-edit" 
                    data-codigo="${venta.codigo_barras}" 
                    data-fecha="${venta.fecha_venta}">
                <i class="fas fa-edit"></i> Editar
            </button>
        </td>
    `;
    
    // Agregar event listener al botón de editar
    const editButton = row.querySelector('.btn-edit');
    if (editButton) {
        editButton.addEventListener('click', () => {
            editarVenta(venta.codigo_barras, venta.fecha_venta);
        });
    }
    
    return row;
}

/**
 * Actualiza el contador y total de ventas
 * @param {number} filtradas - Ventas filtradas
 * @param {number} total - Total de ventas
 * @param {number} totalMonto - Total monetario
 */
function updateSalesCount(filtradas, total, totalMonto) {
    const salesTabBtn = document.getElementById('tab-ventas-btn');
    if (!salesTabBtn) return;
    
    // Actualizar badge en el tab
    let badgeHtml = '';
    if (filtradas !== total) {
        badgeHtml = ` <span class="badge-count">${filtradas}/${total}</span>`;
    }
    
    // Actualizar título del tab con conteo
    salesTabBtn.innerHTML = `<i class="fas fa-shopping-cart"></i> Ventas${badgeHtml}`;
    
    // Actualizar total de ventas hoy en stats
    const ventasHoyElement = document.getElementById('ventas-hoy');
    if (ventasHoyElement) {
        ventasHoyElement.textContent = window.utils.formatoMoneda(totalMonto);
    }
}

// ============================================
## Continuación del archivo `sales.js`:

```javascript
// ============================================
// FILTRADO Y BÚSQUEDA DE VENTAS
// ============================================

/**
 * Filtra ventas por texto
 * @param {Array} ventasArray - Array de ventas
 * @param {string} texto - Texto de búsqueda
 * @returns {Array} Ventas filtradas
 */
function filtrarVentas(ventasArray, texto) {
    if (!texto || !ventasArray || !Array.isArray(ventasArray)) {
        return ventasArray;
    }
    
    const textoLower = texto.toLowerCase().trim();
    
    return ventasArray.filter(venta => {
        // Buscar en código de barras
        if (venta.codigo_barras && 
            venta.codigo_barras.toLowerCase().includes(textoLower)) {
            return true;
        }
        
        // Buscar en descripción
        if (venta.descripcion && 
            venta.descripcion.toLowerCase().includes(textoLower)) {
            return true;
        }
        
        return false;
    });
}

/**
 * Ordena ventas por una propiedad
 * @param {Array} ventasArray - Array de ventas
 * @param {string} propiedad - Propiedad para ordenar
 * @param {boolean} ascendente - True para orden ascendente
 * @returns {Array} Ventas ordenadas
 */
function ordenarVentas(ventasArray, propiedad, ascendente = true) {
    if (!ventasArray || !Array.isArray(ventasArray)) {
        return [];
    }
    
    return [...ventasArray].sort((a, b) => {
        let valorA = a[propiedad];
        let valorB = b[propiedad];
        
        // Manejar valores undefined/null
        if (valorA == null) valorA = ascendente ? Infinity : -Infinity;
        if (valorB == null) valorB = ascendente ? Infinity : -Infinity;
        
        // Ordenar números
        if (typeof valorA === 'number' && typeof valorB === 'number') {
            return ascendente ? valorA - valorB : valorB - valorA;
        }
        
        // Ordenar strings
        if (typeof valorA === 'string' && typeof valorB === 'string') {
            valorA = valorA.toLowerCase();
            valorB = valorB.toLowerCase();
            
            if (valorA < valorB) return ascendente ? -1 : 1;
            if (valorA > valorB) return ascendente ? 1 : -1;
            return 0;
        }
        
        // Ordenar fechas
        if (propiedad.includes('fecha')) {
            const fechaA = new Date(valorA).getTime();
            const fechaB = new Date(valorB).getTime();
            
            return ascendente ? fechaA - fechaB : fechaB - fechaA;
        }
        
        return 0;
    });
}

/**
 * Calcula el total monetario de un array de ventas
 * @param {Array} ventasArray - Array de ventas
 * @returns {number} Total monetario
 */
function calcularTotalVentas(ventasArray) {
    if (!ventasArray || !Array.isArray(ventasArray)) return 0;
    
    return ventasArray.reduce((total, venta) => {
        return total + parseFloat(venta.total || 0);
    }, 0);
}

/**
 * Aplica un filtro a las ventas
 * @param {Object} filtro - Objeto con filtros
 */
function aplicarFiltroVentas(filtro) {
    filtroVentas = { ...filtroVentas, ...filtro };
    cargarVentas(true); // Forzar recarga con nuevos filtros
}

/**
 * Cambia el filtro de fecha (hoy/todas)
 * @param {boolean} soloHoy - True para mostrar solo ventas de hoy
 */
function cambiarFiltroFecha(soloHoy) {
    filtroVentas.soloHoy = soloHoy;
    
    // Si no es hoy, limpiar fechas específicas
    if (!soloHoy) {
        filtroVentas.fechaDesde = '';
        filtroVentas.fechaHasta = '';
    }
    
    cargarVentas(true);
}

/**
 * Filtra ventas por rango de fechas
 * @param {string} fechaDesde - Fecha inicio (YYYY-MM-DD)
 * @param {string} fechaHasta - Fecha fin (YYYY-MM-DD)
 */
function filtrarPorFecha(fechaDesde, fechaHasta) {
    filtroVentas.soloHoy = false;
    filtroVentas.fechaDesde = fechaDesde;
    filtroVentas.fechaHasta = fechaHasta;
    
    cargarVentas(true);
}

// ============================================
// EDICIÓN DE VENTAS
// ============================================

/**
 * Abre el modal para editar una venta
 * @param {string} codigoBarras - Código de barras del producto
 * @param {string} fechaVenta - Fecha de la venta
 */
async function editarVenta(codigoBarras, fechaVenta) {
    try {
        console.log(`✏️ Editando venta: ${codigoBarras} - ${fechaVenta}`);
        
        // Buscar venta en el array
        const venta = ventas.find(v => 
            v.codigo_barras === codigoBarras && 
            v.fecha_venta === fechaVenta
        );
        
        if (!venta) {
            throw new Error(`Venta no encontrada: ${codigoBarras} - ${fechaVenta}`);
        }
        
        // Buscar producto en inventario para mostrar stock actual
        const producto = window.inventory?.buscarProducto(codigoBarras);
        const stockActual = producto ? producto.cantidad : 0;
        
        // Guardar referencia a la venta que se está editando
        window.ventaEditando = venta;
        
        // Llenar formulario
        document.getElementById('editVentaCodigo').value = venta.codigo_barras;
        document.getElementById('editVentaFecha').value = window.utils.formatoHoraChile(venta.fecha_venta);
        document.getElementById('editVentaDescripcion').value = venta.descripcion || '';
        document.getElementById('editVentaPrecio').value = parseFloat(venta.precio_unitario || 0).toFixed(2);
        document.getElementById('editVentaDescuento').value = parseFloat(venta.descuento || 0).toFixed(2);
        document.getElementById('editVentaCantidad').value = venta.cantidad;
        
        // Agregar información de stock disponible
        document.getElementById('editVentaDescripcion').placeholder = 
            `Descripción | Stock actual: ${stockActual} unidades`;
        
        // Calcular total inicial
        calcularNuevoTotalConDescuento();
        
        // Abrir modal
        if (window.modalManager) {
            window.modalManager.openModal('modalVenta');
        } else {
            document.getElementById('modalVenta').style.display = 'flex';
        }
        
    } catch (error) {
        console.error('❌ Error abriendo editor de venta:', error);
        registrarError('sales_edit_open', error, { codigo: codigoBarras, fecha: fechaVenta });
        
        if (window.notifications) {
            window.notifications.showNotification(
                'Error al abrir el editor de venta',
                'error'
            );
        }
    }
}

/**
 * Calcula el nuevo total con descuento aplicado
 */
function calcularNuevoTotalConDescuento() {
    try {
        const precio = parseFloat(document.getElementById('editVentaPrecio').value) || 0;
        const descuento = parseFloat(document.getElementById('editVentaDescuento').value) || 0;
        const cantidad = parseInt(document.getElementById('editVentaCantidad').value) || 0;
        
        const subtotal = precio * cantidad;
        const total = Math.max(subtotal - descuento, 0);
        
        document.getElementById('editVentaTotal').value = `$${total.toFixed(2)}`;
    } catch (error) {
        console.error('Error calculando total:', error);
        document.getElementById('editVentaTotal').value = '$0.00';
    }
}

/**
 * Guarda los cambios de una venta
 * @async
 */
async function guardarVenta() {
    try {
        // Obtener valores del formulario
        const nuevaCantidad = parseInt(document.getElementById('editVentaCantidad').value);
        const precio = parseFloat(document.getElementById('editVentaPrecio').value);
        const nuevoDescuento = parseFloat(document.getElementById('editVentaDescuento').value) || 0;
        
        // Validaciones
        if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
            throw new Error('La cantidad debe ser mayor a 0');
        }
        
        if (isNaN(precio) || precio < 0) {
            throw new Error('El precio debe ser mayor o igual a 0');
        }
        
        if (nuevoDescuento < 0) {
            throw new Error('El descuento no puede ser negativo');
        }
        
        // Verificar que el descuento no sea mayor al subtotal
        const subtotal = nuevaCantidad * precio;
        if (nuevoDescuento > subtotal) {
            throw new Error(`El descuento ($${nuevoDescuento.toFixed(2)}) no puede ser mayor al subtotal ($${subtotal.toFixed(2)})`);
        }
        
        // Obtener venta en edición
        const venta = window.ventaEditando;
        if (!venta) {
            throw new Error('No hay venta seleccionada para editar');
        }
        
        console.log(`💾 Guardando venta: ${venta.codigo_barras} - ${venta.fecha_venta}`);
        
        // Mostrar estado de carga
        const saveButton = document.getElementById('save-venta');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
        saveButton.disabled = true;
        
        // Obtener cliente Supabase
        const supabase = window.supabaseConfig?.getClient();
        if (!supabase) {
            throw new Error('Cliente Supabase no disponible');
        }
        
        // Llamar a la función RPC para editar cantidad de venta
        const { data, error } = await supabase.rpc('editar_cantidad_venta_mejoras', {
            p_barcode: venta.codigo_barras,
            p_fecha_venta: venta.fecha_venta,
            p_nueva_cantidad: nuevaCantidad,
            p_nuevo_descuento: nuevoDescuento
        });
        
        // Restaurar botón
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
        
        if (error) {
            throw error;
        }
        
        if (!data || !data.success) {
            const errorMsg = data?.error || data?.message || 'Error desconocido';
            throw new Error(`Error del servidor: ${errorMsg}`);
        }
        
        // Cerrar modal
        if (window.modalManager) {
            window.modalManager.closeModal('modalVenta');
        }
        
        // Limpiar referencia
        window.ventaEditando = null;
        
        // Mostrar notificación
        if (window.notifications) {
            window.notifications.showNotification(
                '✅ Venta actualizada correctamente',
                'success'
            );
        }
        
        // Recargar ventas e inventario
        await Promise.all([
            cargarVentas(true),
            window.inventory?.cargarInventario(true)
        ]);
        
        console.log('✅ Venta guardada exitosamente');
        
    } catch (error) {
        console.error('❌ Error guardando venta:', error);
        registrarError('sales_save', error);
        
        // Restaurar botón si existe
        const saveButton = document.getElementById('save-venta');
        if (saveButton) {
            saveButton.innerHTML = 'Actualizar Venta';
            saveButton.disabled = false;
        }
        
        // Mostrar error al usuario
        let errorMessage = 'Error al guardar la venta';
        if (error.message.includes('descuento')) {
            errorMessage = error.message;
        } else if (error.message.includes('cantidad')) {
            errorMessage = error.message;
        }
        
        if (window.notifications) {
            window.notifications.showNotification(errorMessage, 'error');
        }
    }
}

// ============================================
## Continuación final del archivo `sales.js`:

```javascript
// ============================================
// AGREGAR NUEVAS VENTAS MANUALES
// ============================================

/**
 * Abre el modal para agregar una nueva venta manual
 */
function abrirAgregarVenta() {
    try {
        console.log('➕ Abriendo modal para agregar venta manual');
        
        // Limpiar formulario
        document.getElementById('buscarProducto').value = '';
        document.getElementById('resultadosBusqueda').innerHTML = '';
        document.getElementById('resultadosBusqueda').style.display = 'none';
        document.getElementById('infoProducto').style.display = 'none';
        document.getElementById('ventaCantidad').value = 1;
        document.getElementById('ventaPrecio').value = '';
        document.getElementById('ventaDescuento').value = 0;
        document.getElementById('ventaDescripcion').value = '';
        document.getElementById('ventaTotal').textContent = '$0.00';
        document.getElementById('fechaVentaActual').textContent = window.utils.getFechaActualChile();
        
        // Limpiar producto seleccionado
        window.productoSeleccionado = null;
        
        // Verificar conexión
        if (!navigator.onLine) {
            document.getElementById('modalAgregarVenta').classList.add('offline-mode');
            const header = document.querySelector('#modalAgregarVenta .modal-header h2');
            if (header) {
                header.innerHTML = '<i class="fas fa-wifi-slash"></i> Agregar Venta (Modo Offline)';
            }
            
            if (window.notifications) {
                window.notifications.showNotification(
                    '📴 Modo offline activado. La venta se guardará localmente',
                    'warning'
                );
            }
        } else {
            document.getElementById('modalAgregarVenta').classList.remove('offline-mode');
            const header = document.querySelector('#modalAgregarVenta .modal-header h2');
            if (header) {
                header.textContent = 'Agregar Venta Manual (MEJORAS)';
            }
        }
        
        // Abrir modal
        if (window.modalManager) {
            window.modalManager.openModal('modalAgregarVenta');
        } else {
            document.getElementById('modalAgregarVenta').style.display = 'flex';
        }
        
        // Enfocar campo de búsqueda
        setTimeout(() => {
            const buscarInput = document.getElementById('buscarProducto');
            if (buscarInput) buscarInput.focus();
        }, 100);
        
    } catch (error) {
        console.error('❌ Error abriendo modal de venta:', error);
        registrarError('sales_add_open', error);
    }
}

/**
 * Busca productos para agregar venta
 */
function buscarProductosVenta() {
    try {
        const termino = document.getElementById('buscarProducto').value.toLowerCase();
        const resultadosDiv = document.getElementById('resultadosBusqueda');
        
        if (termino.length < 2) {
            resultadosDiv.innerHTML = '';
            resultadosDiv.style.display = 'none';
            return;
        }
        
        // Obtener inventario
        const inventario = window.inventory?.getInventario() || [];
        
        // Filtrar productos localmente
        const resultados = inventario.filter(p => 
            p.codigo_barras.toLowerCase().includes(termino) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(termino))
        ).slice(0, 10);
        
        if (resultados.length === 0) {
            resultadosDiv.innerHTML = '<div style="padding: 10px; color: var(--gray-500);">No se encontraron productos</div>';
            resultadosDiv.style.display = 'block';
            return;
        }
        
        let html = '';
        resultados.forEach(producto => {
            html += `
                <div style="padding: 10px; border-bottom: 1px solid var(--gray-200); cursor: pointer;"
                     data-codigo="${producto.codigo_barras}">
                    <div><strong>${producto.codigo_barras}</strong></div>
                    <div style="color: var(--gray-600); font-size: 14px;">${producto.descripcion || 'Sin descripción'}</div>
                    <div style="color: var(--gray-500); font-size: 12px;">
                        Stock: ${producto.cantidad} | Precio: ${window.utils.formatoMoneda(producto.precio || 0)}
                    </div>
                </div>
            `;
        });
        
        resultadosDiv.innerHTML = html;
        resultadosDiv.style.display = 'block';
        
        // Agregar eventos a los resultados
        document.querySelectorAll('#resultadosBusqueda div').forEach(div => {
            div.addEventListener('click', function() {
                seleccionarProductoVenta(this.getAttribute('data-codigo'));
            });
        });
        
    } catch (error) {
        console.error('Error buscando productos:', error);
    }
}

/**
 * Selecciona un producto para la venta
 * @param {string} codigo - Código del producto
 */
function seleccionarProductoVenta(codigo) {
    try {
        // Buscar producto en inventario
        const inventario = window.inventory?.getInventario() || [];
        const producto = inventario.find(p => p.codigo_barras === codigo);
        
        if (!producto) {
            throw new Error('Producto no encontrado');
        }
        
        // Guardar referencia
        window.productoSeleccionado = producto;
        
        // Actualizar UI
        document.getElementById('productoCodigo').textContent = producto.codigo_barras;
        document.getElementById('productoNombre').textContent = producto.descripcion || 'Sin descripción';
        document.getElementById('productoStock').textContent = producto.cantidad;
        document.getElementById('productoPrecio').textContent = parseFloat(producto.precio || 0).toFixed(2);
        
        document.getElementById('ventaPrecio').value = parseFloat(producto.precio || 0).toFixed(2);
        document.getElementById('ventaDescuento').value = 0;
        document.getElementById('ventaDescripcion').value = producto.descripcion || '';
        document.getElementById('ventaCantidad').max = producto.cantidad;
        
        document.getElementById('resultadosBusqueda').style.display = 'none';
        document.getElementById('infoProducto').style.display = 'block';
        
        // Calcular total inicial
        calcularTotalVenta();
        
    } catch (error) {
        console.error('Error seleccionando producto:', error);
        if (window.notifications) {
            window.notifications.showNotification('Error al seleccionar producto', 'error');
        }
    }
}

/**
 * Calcula el total de la venta en tiempo real
 */
function calcularTotalVenta() {
    try {
        const cantidad = parseInt(document.getElementById('ventaCantidad').value) || 0;
        const precio = parseFloat(document.getElementById('ventaPrecio').value) || 0;
        const descuento = parseFloat(document.getElementById('ventaDescuento').value) || 0;
        
        const subtotal = cantidad * precio;
        const total = Math.max(subtotal - descuento, 0);
        
        document.getElementById('ventaTotal').textContent = `$${total.toFixed(2)}`;
    } catch (error) {
        console.error('Error calculando total:', error);
        document.getElementById('ventaTotal').textContent = '$0.00';
    }
}

/**
 * Guarda una nueva venta manual
 * @async
 */
async function guardarNuevaVenta() {
    try {
        // Validar producto seleccionado
        if (!window.productoSeleccionado) {
            throw new Error('Primero selecciona un producto');
        }
        
        // Obtener valores del formulario
        const cantidad = parseInt(document.getElementById('ventaCantidad').value);
        const precio = parseFloat(document.getElementById('ventaPrecio').value);
        const descuento = parseFloat(document.getElementById('ventaDescuento').value) || 0;
        const descripcion = document.getElementById('ventaDescripcion').value;
        const codigoBarras = window.productoSeleccionado.codigo_barras;
        
        // Validaciones
        if (isNaN(cantidad) || cantidad <= 0) {
            throw new Error('La cantidad debe ser mayor a 0');
        }
        
        if (isNaN(precio) || precio <= 0) {
            throw new Error('El precio debe ser mayor a 0');
        }
        
        if (descuento < 0) {
            throw new Error('El descuento no puede ser negativo');
        }
        
        // Verificar que el descuento no sea mayor al subtotal
        const subtotal = cantidad * precio;
        if (descuento > subtotal) {
            throw new Error(`El descuento ($${descuento.toFixed(2)}) no puede ser mayor al subtotal ($${subtotal.toFixed(2)})`);
        }
        
        // Verificar stock disponible
        if (cantidad > window.productoSeleccionado.cantidad) {
            throw new Error(`Stock insuficiente. Disponible: ${window.productoSeleccionado.cantidad}`);
        }
        
        // Preparar datos de la venta
        const ventaData = {
            barcode: codigoBarras,
            cantidad: cantidad,
            precio_unitario: precio,
            descuento: descuento,
            descripcion: descripcion || window.productoSeleccionado.descripcion || '',
            fecha_venta: window.utils.getHoraChileISO()
        };
        
        // Verificar conexión
        if (!navigator.onLine) {
            // Guardar en modo offline
            if (window.syncManager) {
                window.syncManager.guardarVentaOffline(ventaData);
                window.inventory?.actualizarStockLocal(codigoBarras, -cantidad);
            }
            
            if (window.notifications) {
                window.notifications.showNotification(
                    '📴 Venta guardada localmente. Se sincronizará cuando haya internet',
                    'warning'
                );
            }
            
            // Cerrar modal
            if (window.modalManager) {
                window.modalManager.closeModal('modalAgregarVenta');
            }
            
            return;
        }
        
        // Mostrar estado de carga
        const saveButton = document.getElementById('save-agregar-venta');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        saveButton.disabled = true;
        
        // Obtener cliente Supabase
        const supabase = window.supabaseConfig?.getClient();
        if (!supabase) {
            throw new Error('Cliente Supabase no disponible');
        }
        
        // 1. Insertar venta
        const { data: ventaInsertada, error: errorVenta } = await supabase
            .from('ventas_mejoras')
            .insert([ventaData])
            .select();
        
        if (errorVenta) throw errorVenta;
        
        // 2. Actualizar inventario
        const nuevoStock = window.productoSeleccionado.cantidad - cantidad;
        const { error: errorInventario } = await supabase
            .from('inventario_mejoras')
            .update({ 
                cantidad: nuevoStock,
                fecha_actualizacion: window.utils.getHoraChileISO()
            })
            .eq('barcode', codigoBarras);
        
        if (errorInventario) throw errorInventario;
        
        // Restaurar botón
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
        
        // Cerrar modal
        if (window.modalManager) {
            window.modalManager.closeModal('modalAgregarVenta');
        }
        
        // Mostrar notificación
        if (window.notifications) {
            window.notifications.showNotification(
                '✅ Venta registrada correctamente',
                'success'
            );
        }
        
        // Recargar datos
        await Promise.all([
            cargarVentas(true),
            window.inventory?.cargarInventario(true)
        ]);
        
        console.log('✅ Venta manual guardada exitosamente');
        
    } catch (error) {
        console.error('❌ Error guardando nueva venta:', error);
        registrarError('sales_add_save', error);
        
        // Restaurar botón
        const saveButton = document.getElementById('save-agregar-venta');
        if (saveButton) {
            saveButton.innerHTML = 'Registrar Venta';
            saveButton.disabled = false;
        }
        
        // Mostrar error
        let errorMessage = 'Error al registrar la venta';
        if (error.message.includes('Stock')) {
            errorMessage = error.message;
        } else if (error.message.includes('descuento')) {
            errorMessage = error.message;
        } else if (error.message.includes('selecciona')) {
            errorMessage = error.message;
        }
        
        if (window.notifications) {
            window.notifications.showNotification(errorMessage, 'error');
        }
    }
}

// ============================================
// ESTADÍSTICAS DE VENTAS
// ============================================

/**
 * Actualiza las estadísticas de ventas
 */
function actualizarEstadisticasVentas() {
    if (!ventas || ventas.length === 0) {
        document.getElementById('ventas-hoy').textContent = '$0';
        return;
    }
    
    // Calcular ventas de hoy
    const fechaHoy = window.utils.getFechaHoyChile();
    const ventasHoy = ventas.filter(v => {
        if (!v.fecha_venta) return false;
        const fechaVenta = v.fecha_venta.split('T')[0];
        return fechaVenta === fechaHoy;
    });
    
    const totalHoy = calcularTotalVentas(ventasHoy);
    document.getElementById('ventas-hoy').textContent = window.utils.formatoMoneda(totalHoy);
    
    // Actualizar fecha en el stat card
    const fechaHoyElement = document.getElementById('fecha-hoy');
    if (fechaHoyElement) {
        fechaHoyElement.textContent = window.utils.getFechaActualChile();
    }
}

/**
 * Obtiene las ventas de hoy
 * @returns {Array} Ventas de hoy
 */
function getVentasHoy() {
    if (!ventas || ventas.length === 0) return [];
    
    const fechaHoy = window.utils.getFechaHoyChile();
    return ventas.filter(v => {
        if (!v.fecha_venta) return false;
        const fechaVenta = v.fecha_venta.split('T')[0];
        return fechaVenta === fechaHoy;
    });
}

/**
 * Obtiene las ventas de los últimos N días
 * @param {number} dias - Número de días
 * @returns {Array} Ventas de los últimos días
 */
function getVentasUltimosDias(dias = 7) {
    if (!ventas || ventas.length === 0) return [];
    
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    
    return ventas.filter(v => {
        if (!v.fecha_venta) return false;
        const fechaVenta = new Date(v.fecha_venta);
        return fechaVenta >= fechaLimite;
    });
}

// ============================================
// REAL-TIME UPDATES PARA VENTAS
// ============================================

/**
 * Configura actualizaciones en tiempo real para ventas
 */
function setupSalesRealtime() {
    try {
        console.log('📡 Configurando real-time para ventas...');
        
        // Suscribirse a cambios en ventas_mejoras
        ventasRealtimeChannel = window.supabaseConfig?.subscribe(
            'ventas_mejoras',
            handleSalesChange
        );
        
    } catch (error) {
        console.error('❌ Error configurando real-time para ventas:', error);
    }
}

/**
 * Maneja cambios en tiempo real de ventas
 * @param {Object} payload - Datos del cambio
 */
function handleSalesChange(payload) {
    console.log('🔄 Cambio en tiempo real (ventas):', payload);
    
    const { eventType, new: newData, old: oldData } = payload;
    
    switch (eventType) {
        case 'INSERT':
            // Agregar nueva venta
            ventas.unshift(newData);
            mostrarVentas(ventas);
            actualizarEstadisticasVentas();
            break;
            
        case 'UPDATE':
            // Actualizar venta existente
            const index = ventas.findIndex(v => 
                v.codigo_barras === newData.codigo_barras && 
                v.fecha_venta === newData.fecha_venta
            );
            if (index !== -1) {
                ventas[index] = newData;
                mostrarVentas(ventas);
                actualizarEstadisticasVentas();
            }
            break;
            
        case 'DELETE':
            // Eliminar venta
            ventas = ventas.filter(v => 
                !(v.codigo_barras === oldData.codigo_barras && 
                  v.fecha_venta === oldData.fecha_venta)
            );
            mostrarVentas(ventas);
            actualizarEstadisticasVentas();
            break;
    }
    
    // Invalidar cache
    ventasCache.timestamp = 0;
    
    // Mostrar notificación para nuevas ventas
    if (window.notifications && eventType === 'INSERT') {
        window.notifications.showNotification(
            '💰 Nueva venta registrada en tiempo real',
            'info'
        );
    }
}

/**
 * Desconecta las suscripciones real-time de ventas
 */
function disconnectSalesRealtime() {
    if (ventasRealtimeChannel) {
        ventasRealtimeChannel.unsubscribe();
        ventasRealtimeChannel = null;
        console.log('📡 Real-time de ventas desconectado');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Configura event listeners de ventas
 */
function setupSalesListeners() {
    // Botón de guardar en modal de edición
    const saveVentaButton = document.getElementById('save-venta');
    if (saveVentaButton) {
        saveVentaButton.addEventListener('click', guardarVenta);
    }
    
    // Botón de cancelar en modal de edición
    const cancelVentaButton = document.getElementById('cancel-venta');
    if (cancelVentaButton) {
        cancelVentaButton.addEventListener('click', () => {
            if (window.modalManager) {
                window.modalManager.closeModal('modalVenta');
            }
            window.ventaEditando = null;
        });
    }
    
    // Cálculo en tiempo real en modal de edición
    const cantidadInput = document.getElementById('editVentaCantidad');
    const descuentoInput = document.getElementById('editVentaDescuento');
    
    if (cantidadInput) {
        cantidadInput.addEventListener('input', calcularNuevoTotalConDescuento);
    }
    if (descuentoInput) {
        descuentoInput.addEventListener('input', calcularNuevoTotalConDescuento);
    }
    
    // Listeners para agregar venta manual
    const buscarProductoInput = document.getElementById('buscarProducto');
    if (buscarProductoInput) {
        const debouncedSearch = window.utils.debounce(buscarProductosVenta, 300);
        buscarProductoInput.addEventListener('input', debouncedSearch);
    }
    
    // Cálculo en tiempo real en agregar venta
    const ventaCantidad = document.getElementById('ventaCantidad');
    const ventaPrecio = document.getElementById('ventaPrecio');
    const ventaDescuento = document.getElementById('ventaDescuento');
    
    if (ventaCantidad) ventaCantidad.addEventListener('input', calcularTotalVenta);
    if (ventaPrecio) ventaPrecio.addEventListener('input', calcularTotalVenta);
    if (ventaDescuento) ventaDescuento.addEventListener('input', calcularTotalVenta);
    
    // Botón de guardar nueva venta
    const saveNuevaVentaButton = document.getElementById('save-agregar-venta');
    if (saveNuevaVentaButton) {
        saveNuevaVentaButton.addEventListener('click', guardarNuevaVenta);
    }
}

// ============================================
// EXPORTACIÓN
// ============================================

// Inicializar módulo cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSales);
} else {
    initializeSales();
}

// Exportar funciones al ámbito global
window.sales = {
    // Funciones principales
    cargarVentas,
    mostrarVentas,
    getVentas: () => ventas,
    
    // Edición
    editarVenta,
    guardarVenta,
    
    // Agregar nuevas ventas
    abrirAgregarVenta,
    guardarNuevaVenta,
    
    // Filtrado y búsqueda
    filtrarVentas,
    ordenarVentas,
    aplicarFiltroVentas,
    cambiarFiltroFecha,
    filtrarPorFecha,
    calcularTotalVentas,
    
    // Estadísticas
    actualizarEstadisticasVentas,
    getVentasHoy,
    getVentasUltimosDias,
    
    // Real-time
    setupSalesRealtime,
    disconnectSalesRealtime,
    
    // Utilidades
    calcularNuevoTotalConDescuento,
    calcularTotalVenta,
    
    // Getters
    get filtroVentas() { return { ...filtroVentas }; },
    get ventasFiltradas() { 
        return ventas.filter(v => 
            (!filtroVentas.texto || 
             v.codigo_barras.toLowerCase().includes(filtroVentas.texto.toLowerCase()) ||
             (v.descripcion && v.descripcion.toLowerCase().includes(filtroVentas.texto.toLowerCase())))
        );
    }
};

console.log('✅ Módulo de ventas cargado y listo');
