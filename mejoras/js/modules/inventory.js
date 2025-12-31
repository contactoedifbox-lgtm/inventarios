/* ============================================
   GESTIÓN DE INVENTARIO
   ============================================
   Manejo completo del inventario de productos:
   - Carga y visualización
   - Búsqueda y filtrado
   - Edición y actualización
   - Estadísticas y reportes
   ============================================ */

// ============================================
// VARIABLES GLOBALES DE INVENTARIO
// ============================================

/**
 * Array con todos los productos del inventario
 * @type {Array<Object>}
 */
let inventario = [];

/**
 * Cache de inventario para mejor performance
 * @type {Object}
 */
let inventarioCache = {
    data: null,
    timestamp: 0,
    expiresIn: 30000 // 30 segundos
};

/**
 * Filtro actual aplicado al inventario
 * @type {Object}
 */
let filtroActual = {
    texto: '',
    stockBajo: false,
    conEncargos: false,
    ordenPor: 'fecha_actualizacion',
    ordenAscendente: false
};

/**
 * Suscripción a cambios en tiempo real
 * @type {RealtimeChannel|null}
 */
let realtimeChannel = null;

// ============================================
// INICIALIZACIÓN DEL MÓDULO DE INVENTARIO
// ============================================

/**
 * Inicializa el módulo de inventario
 */
function initializeInventory() {
    console.log('📦 Inicializando módulo de inventario...');
    
    // Configurar event listeners
    setupInventoryListeners();
    
    // Configurar real-time si hay usuario autenticado
    if (window.auth?.isAuthenticated()) {
        setupRealtimeUpdates();
    }
    
    console.log('✅ Módulo de inventario inicializado');
}

// ============================================
// CARGA DE DATOS DE INVENTARIO
// ============================================

/**
 * Carga el inventario desde Supabase
 * @async
 * @param {boolean} forceRefresh - Forzar recarga ignorando cache
 * @returns {Promise<Array>} Array de productos
 */
async function cargarInventario(forceRefresh = false) {
    try {
        console.log('📥 Cargando inventario...');
        
        // Verificar cache si no se fuerza refresh
        if (!forceRefresh && isCacheValid()) {
            console.log('📦 Usando cache de inventario');
            inventario = inventarioCache.data;
            mostrarInventario(inventario);
            actualizarEstadisticasInventario();
            return inventario;
        }
        
        // Mostrar estado de carga
        showLoadingState(true);
        
        // Obtener cliente Supabase
        const supabase = window.supabaseConfig?.getClient();
        if (!supabase) {
            throw new Error('Cliente Supabase no disponible');
        }
        
        // Cargar datos desde vista_inventario_mejoras
        const { data, error } = await supabase
            .from('vista_inventario_mejoras')
            .select('*')
            .order(filtroActual.ordenPor, { 
                ascending: filtroActual.ordenAscendente 
            });
        
        if (error) {
            throw error;
        }
        
        // Actualizar cache
        inventarioCache.data = data;
        inventarioCache.timestamp = Date.now();
        
        // Actualizar variable global
        inventario = data;
        
        // Actualizar UI
        mostrarInventario(inventario);
        actualizarEstadisticasInventario();
        
        console.log(`✅ Inventario cargado: ${data.length} productos`);
        
        // Ocultar estado de carga
        showLoadingState(false);
        
        return data;
        
    } catch (error) {
        console.error('❌ Error cargando inventario:', error);
        registrarError('inventory_load', error);
        
        // Mostrar error al usuario
        if (window.notifications) {
            window.notifications.showNotification(
                'Error al cargar el inventario. Intentando nuevamente...',
                'error'
            );
        }
        
        // Intentar cargar desde cache si hay error
        if (inventarioCache.data) {
            console.log('🔄 Usando datos cacheados por error de red');
            inventario = inventarioCache.data;
            mostrarInventario(inventario);
            actualizarEstadisticasInventario();
        }
        
        showLoadingState(false);
        return inventarioCache.data || [];
    }
}

/**
 * Verifica si el cache es válido
 * @returns {boolean} True si el cache es válido
 */
function isCacheValid() {
    if (!inventarioCache.data || inventarioCache.timestamp === 0) {
        return false;
    }
    
    const now = Date.now();
    const cacheAge = now - inventarioCache.timestamp;
    
    return cacheAge < inventarioCache.expiresIn;
}

/**
 * Muestra/oculta el estado de carga
 * @param {boolean} isLoading - True para mostrar estado de carga
 */
function showLoadingState(isLoading) {
    const tbody = document.getElementById('inventarioBody');
    if (!tbody) return;
    
    if (isLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="spinner"></div>
                    <p class="text-muted">Cargando inventario...</p>
                </td>
            </tr>
        `;
    }
}

// ============================================
// VISUALIZACIÓN DEL INVENTARIO
// ============================================

/**
 * Muestra el inventario en la tabla
 * @param {Array} data - Datos a mostrar
 */
function mostrarInventario(data) {
    const tbody = document.getElementById('inventarioBody');
    if (!tbody) {
        console.error('❌ Tabla de inventario no encontrada');
        return;
    }
    
    // Limpiar tabla
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div style="padding: 40px 20px; color: var(--gray-500);">
                        <i class="fas fa-box-open fa-2x" style="opacity: 0.5; margin-bottom: 15px;"></i>
                        <p>No hay productos en el inventario</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Aplicar filtros si existen
    let productosFiltrados = data;
    if (filtroActual.texto) {
        productosFiltrados = filtrarProductos(data, filtroActual.texto);
    }
    if (filtroActual.stockBajo) {
        productosFiltrados = productosFiltrados.filter(p => p.cantidad < 10);
    }
    if (filtroActual.conEncargos) {
        productosFiltrados = productosFiltrados.filter(p => p.cantidad < 0);
    }
    
    // Aplicar ordenamiento
    productosFiltrados = ordenarProductos(productosFiltrados, filtroActual.ordenPor, filtroActual.ordenAscendente);
    
    // Renderizar filas
    productosFiltrados.forEach(producto => {
        const row = crearFilaInventario(producto);
        tbody.appendChild(row);
    });
    
    // Actualizar contador
    updateProductCount(productosFiltrados.length, data.length);
}

/**
 * Crea una fila de tabla para un producto
 * @param {Object} producto - Datos del producto
 * @returns {HTMLTableRowElement} Fila creada
 */
function crearFilaInventario(producto) {
    const row = document.createElement('tr');
    
    // Aplicar clase especial si tiene stock bajo
    if (producto.cantidad < 5) {
        row.classList.add('low-stock');
    }
    
    // Aplicar clase especial si tiene encargos (stock negativo)
    if (producto.cantidad < 0) {
        row.classList.add('out-of-stock');
    }
    
    // Obtener badge de stock
    const stockBadge = getStockBadge(producto.cantidad);
    
    // Formatear fechas y números
    const fechaActualizacion = window.utils.formatoHoraChile(producto.fecha_actualizacion);
    const costo = window.utils.formatoMoneda(producto.costo || 0);
    const precio = window.utils.formatoMoneda(producto.precio || 0);
    
    // Crear contenido de la fila
    row.innerHTML = `
        <td><strong>${producto.codigo_barras}</strong></td>
        <td>
            <div>${producto.descripcion || '<span class="text-muted">Sin descripción</span>'}</div>
            ${producto.descripcion ? `<small class="text-muted">${window.utils.truncarTexto(producto.descripcion, 80)}</small>` : ''}
        </td>
        <td class="text-center">
            <span class="stock-badge ${stockBadge.class}">
                ${producto.cantidad} unidades
            </span>
        </td>
        <td class="text-right">${costo}</td>
        <td class="text-right"><strong>${precio}</strong></td>
        <td>
            <div>${fechaActualizacion}</div>
            <small class="text-muted">${window.utils.formatoHoraCortaChile(producto.fecha_actualizacion)}</small>
        </td>
        <td class="text-center">
            <button class="action-btn btn-edit" data-codigo="${producto.codigo_barras}">
                <i class="fas fa-edit"></i> Editar
            </button>
        </td>
    `;
    
    // Agregar event listener al botón de editar
    const editButton = row.querySelector('.btn-edit');
    if (editButton) {
        editButton.addEventListener('click', () => {
            editarInventario(producto.codigo_barras);
        });
    }
    
    return row;
}

/**
 * Obtiene el badge de stock correspondiente
 * @param {number} cantidad - Cantidad en stock
 * @returns {Object} Objeto con clase y texto
 */
function getStockBadge(cantidad) {
    if (cantidad < 0) {
        return { 
            class: 'stock-low', 
            text: `Encargo: ${Math.abs(cantidad)} unidades` 
        };
    }
    if (cantidad <= 5) {
        return { class: 'stock-low', text: 'Muy Bajo' };
    }
    if (cantidad <= 10) {
        return { class: 'stock-medium', text: 'Bajo' };
    }
    return { class: 'stock-good', text: 'Disponible' };
}

/**
 * Actualiza el contador de productos
 * @param {number} filtrados - Productos filtrados
 * @param {number} total - Total de productos
 */
function updateProductCount(filtrados, total) {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let placeholder = 'Buscar por código o descripción...';
    
    if (filtrados !== total) {
        placeholder = `Mostrando ${filtrados} de ${total} productos`;
        
        // Actualizar después de 3 segundos
        setTimeout(() => {
            if (searchInput.placeholder.includes('Mostrando')) {
                searchInput.placeholder = 'Buscar por código o descripción...';
            }
        }, 3000);
    }
    
    searchInput.placeholder = placeholder;
}

// ============================================
## Continuación del archivo `inventory.js`:

```javascript
// ============================================
// FILTRADO Y BÚSQUEDA
// ============================================

/**
 * Filtra productos por texto
 * @param {Array} productos - Array de productos
 * @param {string} texto - Texto de búsqueda
 * @returns {Array} Productos filtrados
 */
function filtrarProductos(productos, texto) {
    if (!texto || !productos || !Array.isArray(productos)) {
        return productos;
    }
    
    const textoLower = texto.toLowerCase().trim();
    
    return productos.filter(producto => {
        // Buscar en código de barras
        if (producto.codigo_barras && 
            producto.codigo_barras.toLowerCase().includes(textoLower)) {
            return true;
        }
        
        // Buscar en descripción
        if (producto.descripcion && 
            producto.descripcion.toLowerCase().includes(textoLower)) {
            return true;
        }
        
        return false;
    });
}

/**
 * Ordena productos por una propiedad
 * @param {Array} productos - Array de productos
 * @param {string} propiedad - Propiedad para ordenar
 * @param {boolean} ascendente - True para orden ascendente
 * @returns {Array} Productos ordenados
 */
function ordenarProductos(productos, propiedad, ascendente = true) {
    if (!productos || !Array.isArray(productos)) {
        return [];
    }
    
    return [...productos].sort((a, b) => {
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
        if (propiedad.includes('fecha') || propiedad.includes('actualizacion')) {
            const fechaA = new Date(valorA).getTime();
            const fechaB = new Date(valorB).getTime();
            
            return ascendente ? fechaA - fechaB : fechaB - fechaA;
        }
        
        return 0;
    });
}

/**
 * Aplica un filtro al inventario
 * @param {Object} filtro - Objeto con filtros
 */
function aplicarFiltro(filtro) {
    filtroActual = { ...filtroActual, ...filtro };
    mostrarInventario(inventario);
}

/**
 * Limpia todos los filtros
 */
function limpiarFiltros() {
    filtroActual = {
        texto: '',
        stockBajo: false,
        conEncargos: false,
        ordenPor: 'fecha_actualizacion',
        ordenAscendente: false
    };
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    mostrarInventario(inventario);
}

// ============================================
// EDICIÓN DE PRODUCTOS
// ============================================

/**
 * Abre el modal para editar un producto
 * @param {string} codigoBarras - Código de barras del producto
 */
async function editarInventario(codigoBarras) {
    try {
        console.log(`✏️ Editando producto: ${codigoBarras}`);
        
        // Buscar producto en el inventario
        const producto = inventario.find(p => p.codigo_barras === codigoBarras);
        if (!producto) {
            throw new Error(`Producto no encontrado: ${codigoBarras}`);
        }
        
        // Guardar referencia al producto que se está editando
        window.productoEditando = producto;
        
        // Llenar formulario
        document.getElementById('editCodigo').value = producto.codigo_barras;
        document.getElementById('editDescripcion').value = producto.descripcion || '';
        document.getElementById('editCantidad').value = producto.cantidad;
        document.getElementById('editCosto').value = producto.costo || 0;
        document.getElementById('editPrecio').value = producto.precio || 0;
        
        // Abrir modal
        if (window.modalManager) {
            window.modalManager.openModal('modalInventario');
        } else {
            document.getElementById('modalInventario').style.display = 'flex';
        }
        
    } catch (error) {
        console.error('❌ Error abriendo editor:', error);
        registrarError('inventory_edit_open', error, { codigo: codigoBarras });
        
        if (window.notifications) {
            window.notifications.showNotification(
                'Error al abrir el editor del producto',
                'error'
            );
        }
    }
}

/**
 * Guarda los cambios de un producto
 * @async
 */
async function guardarInventario() {
    try {
        // Obtener valores del formulario
        const descripcion = document.getElementById('editDescripcion').value;
        const cantidad = parseInt(document.getElementById('editCantidad').value);
        const costo = parseFloat(document.getElementById('editCosto').value);
        const precio = parseFloat(document.getElementById('editPrecio').value);
        
        // Validaciones
        if (isNaN(cantidad) || cantidad < 0) {
            throw new Error('La cantidad debe ser un número positivo');
        }
        
        if (isNaN(costo) || costo < 0) {
            throw new Error('El costo debe ser un número positivo');
        }
        
        if (isNaN(precio) || precio < 0) {
            throw new Error('El precio debe ser un número positivo');
        }
        
        if (precio < costo) {
            const confirmar = confirm(
                '⚠️ El precio de venta es menor que el costo. ' +
                '¿Estás seguro de continuar?'
            );
            if (!confirmar) return;
        }
        
        // Obtener producto en edición
        const producto = window.productoEditando;
        if (!producto) {
            throw new Error('No hay producto seleccionado para editar');
        }
        
        console.log(`💾 Guardando producto: ${producto.codigo_barras}`);
        
        // Mostrar estado de carga
        const saveButton = document.getElementById('save-inventario');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        saveButton.disabled = true;
        
        // Obtener cliente Supabase
        const supabase = window.supabaseConfig?.getClient();
        if (!supabase) {
            throw new Error('Cliente Supabase no disponible');
        }
        
        // Llamar a la función RPC para editar inventario_mejoras
        const { data, error } = await supabase.rpc('editar_inventario_mejoras', {
            p_barcode: producto.codigo_barras,
            p_descripcion: descripcion,
            p_cantidad: cantidad,
            p_costo: costo,
            p_precio: precio
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
            window.modalManager.closeModal('modalInventario');
        }
        
        // Limpiar referencia
        window.productoEditando = null;
        
        // Mostrar notificación
        if (window.notifications) {
            window.notifications.showNotification(
                '✅ Producto actualizado correctamente',
                'success'
            );
        }
        
        // Recargar inventario (forzar refresh para ver cambios)
        await cargarInventario(true);
        
        console.log('✅ Producto guardado exitosamente');
        
    } catch (error) {
        console.error('❌ Error guardando inventario:', error);
        registrarError('inventory_save', error);
        
        // Restaurar botón si existe
        const saveButton = document.getElementById('save-inventario');
        if (saveButton) {
            saveButton.innerHTML = 'Guardar Cambios';
            saveButton.disabled = false;
        }
        
        // Mostrar error al usuario
        let errorMessage = 'Error al guardar el producto';
        if (error.message.includes('duplicate')) {
            errorMessage = 'Ya existe un producto con ese código';
        } else if (error.message.includes('RPC')) {
            errorMessage = 'Error del servidor al guardar';
        }
        
        if (window.notifications) {
            window.notifications.showNotification(errorMessage, 'error');
        }
    }
}

// ============================================
## Continuación final del archivo `inventory.js`:

```javascript
// ============================================
// ESTADÍSTICAS Y REPORTES
// ============================================

/**
 * Actualiza las estadísticas del inventario
 */
function actualizarEstadisticasInventario() {
    if (!inventario || inventario.length === 0) {
        document.getElementById('total-productos').textContent = '0';
        document.getElementById('stock-bajo').textContent = '0';
        document.getElementById('ultima-actualizacion').textContent = '--:--';
        return;
    }
    
    // Total de productos
    document.getElementById('total-productos').textContent = inventario.length;
    
    // Productos con stock bajo (< 10)
    const stockBajo = inventario.filter(p => p.cantidad < 10 && p.cantidad >= 0).length;
    document.getElementById('stock-bajo').textContent = stockBajo;
    
    // Última actualización
    if (inventario.length > 0) {
        const ultimaFecha = inventario.reduce((latest, producto) => {
            const fechaProd = new Date(producto.fecha_actualizacion);
            const fechaLatest = new Date(latest);
            return fechaProd > fechaLatest ? producto.fecha_actualizacion : latest;
        }, inventario[0].fecha_actualizacion);
        
        const hora = window.utils.formatoHoraCortaChile(ultimaFecha);
        document.getElementById('ultima-actualizacion').textContent = hora;
    }
    
    // Calcular valor total del inventario
    calcularValorInventario();
}

/**
 * Calcula el valor total del inventario
 */
function calcularValorInventario() {
    if (!inventario || inventario.length === 0) return;
    
    let valorTotal = 0;
    let valorVentaTotal = 0;
    
    inventario.forEach(producto => {
        if (producto.cantidad > 0) {
            const costo = parseFloat(producto.costo || 0);
            const precio = parseFloat(producto.precio || 0);
            
            valorTotal += producto.cantidad * costo;
            valorVentaTotal += producto.cantidad * precio;
        }
    });
    
    // Podrías mostrar estos valores en algún lugar
    console.log(`💰 Valor del inventario (costo): ${window.utils.formatoMoneda(valorTotal)}`);
    console.log(`💰 Valor del inventario (venta): ${window.utils.formatoMoneda(valorVentaTotal)}`);
}

/**
 * Genera reporte de productos con stock bajo
 * @returns {Array} Productos con stock bajo
 */
function getProductosStockBajo() {
    if (!inventario) return [];
    
    return inventario
        .filter(p => p.cantidad < 10 && p.cantidad >= 0)
        .sort((a, b) => a.cantidad - b.cantidad);
}

/**
 * Genera reporte de productos con encargos (stock negativo)
 * @returns {Array} Productos con encargos
 */
function getProductosConEncargos() {
    if (!inventario) return [];
    
    return inventario
        .filter(p => p.cantidad < 0)
        .sort((a, b) => a.cantidad - b.cantidad);
}

// ============================================
// REAL-TIME UPDATES
// ============================================

/**
 * Configura actualizaciones en tiempo real
 */
function setupRealtimeUpdates() {
    try {
        console.log('📡 Configurando real-time para inventario...');
        
        // Suscribirse a cambios en inventario_mejoras
        realtimeChannel = window.supabaseConfig?.subscribe(
            'inventario_mejoras',
            handleInventoryChange
        );
        
    } catch (error) {
        console.error('❌ Error configurando real-time:', error);
    }
}

/**
 * Maneja cambios en tiempo real del inventario
 * @param {Object} payload - Datos del cambio
 */
function handleInventoryChange(payload) {
    console.log('🔄 Cambio en tiempo real:', payload);
    
    const { eventType, new: newData, old: oldData } = payload;
    
    switch (eventType) {
        case 'INSERT':
            // Agregar nuevo producto
            inventario.unshift(newData);
            mostrarInventario(inventario);
            actualizarEstadisticasInventario();
            break;
            
        case 'UPDATE':
            // Actualizar producto existente
            const index = inventario.findIndex(p => p.codigo_barras === newData.codigo_barras);
            if (index !== -1) {
                inventario[index] = newData;
                mostrarInventario(inventario);
                actualizarEstadisticasInventario();
            }
            break;
            
        case 'DELETE':
            // Eliminar producto
            inventario = inventario.filter(p => p.codigo_barras !== oldData.codigo_barras);
            mostrarInventario(inventario);
            actualizarEstadisticasInventario();
            break;
    }
    
    // Invalidar cache
    inventarioCache.timestamp = 0;
    
    // Mostrar notificación
    if (window.notifications && eventType !== 'DELETE') {
        const action = eventType === 'INSERT' ? 'agregado' : 'actualizado';
        window.notifications.showNotification(
            `📦 Producto ${action} en tiempo real`,
            'info'
        );
    }
}

/**
 * Desconecta las suscripciones real-time
 */
function disconnectRealtime() {
    if (realtimeChannel) {
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
        console.log('📡 Real-time desconectado');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Configura event listeners del inventario
 */
function setupInventoryListeners() {
    // Búsqueda en tiempo real
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const debouncedSearch = window.utils.debounce((e) => {
            aplicarFiltro({ texto: e.target.value });
        }, 300);
        
        searchInput.addEventListener('input', debouncedSearch);
    }
    
    // Botón de guardar en modal
    const saveButton = document.getElementById('save-inventario');
    if (saveButton) {
        saveButton.addEventListener('click', guardarInventario);
    }
    
    // Botón de cancelar en modal
    const cancelButton = document.getElementById('cancel-inventario');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            if (window.modalManager) {
                window.modalManager.closeModal('modalInventario');
            }
            window.productoEditando = null;
        });
    }
}

// ============================================
// FUNCIONES PÚBLICAS
// ============================================

/**
 * Obtiene el inventario actual
 * @returns {Array} Array de productos
 */
function getInventario() {
    return inventario;
}

/**
 * Busca un producto por código de barras
 * @param {string} codigo - Código de barras
 * @returns {Object|null} Producto encontrado o null
 */
function buscarProducto(codigo) {
    if (!inventario || !codigo) return null;
    
    return inventario.find(p => 
        p.codigo_barras.toLowerCase() === codigo.toLowerCase()
    );
}

/**
 * Actualiza el stock de un producto localmente
 * @param {string} codigo - Código de barras
 * @param {number} cantidad - Nueva cantidad
 * @returns {boolean} True si se actualizó
 */
function actualizarStockLocal(codigo, cantidad) {
    const producto = buscarProducto(codigo);
    if (!producto) return false;
    
    producto.cantidad = cantidad;
    producto.fecha_actualizacion = new Date().toISOString();
    
    // Actualizar UI
    mostrarInventario(inventario);
    actualizarEstadisticasInventario();
    
    return true;
}

// ============================================
// EXPORTACIÓN
// ============================================

// Inicializar módulo cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeInventory);
} else {
    initializeInventory();
}

// Exportar funciones al ámbito global
window.inventory = {
    // Funciones principales
    cargarInventario,
    mostrarInventario,
    getInventario,
    buscarProducto,
    actualizarStockLocal,
    
    // Edición
    editarInventario,
    guardarInventario,
    
    // Filtrado y búsqueda
    filtrarProductos,
    ordenarProductos,
    aplicarFiltro,
    limpiarFiltros,
    
    // Estadísticas
    actualizarEstadisticasInventario,
    getProductosStockBajo,
    getProductosConEncargos,
    calcularValorInventario,
    
    // Real-time
    setupRealtimeUpdates,
    disconnectRealtime,
    
    // Getters
    get filtroActual() { return { ...filtroActual }; },
    get productosFiltrados() { 
        return inventario.filter(p => 
            (!filtroActual.texto || 
             p.codigo_barras.toLowerCase().includes(filtroActual.texto.toLowerCase()) ||
             (p.descripcion && p.descripcion.toLowerCase().includes(filtroActual.texto.toLowerCase()))) &&
            (!filtroActual.stockBajo || p.cantidad < 10) &&
            (!filtroActual.conEncargos || p.cantidad < 0)
        );
    }
};

console.log('✅ Módulo de inventario cargado y listo');
