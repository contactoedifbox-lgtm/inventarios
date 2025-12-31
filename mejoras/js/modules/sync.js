/* ============================================
   SISTEMA DE SINCRONIZACIÓN OFFLINE
   ============================================
   Manejo completo de operaciones offline:
   - Almacenamiento local de ventas pendientes
   - Sincronización automática cuando hay conexión
   - Conflict resolution
   - Gestión de datos offline
   ============================================ */

// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================

/**
 * Claves de almacenamiento local
 * @constant {Object}
 */
const STORAGE_KEYS = {
    VENTAS_OFFLINE: 'ventas_offline_mejoras',
    INVENTARIO_OFFLINE: 'inventario_offline_mejoras',
    SINCRONIZACION_INTENTOS: 'sync_intentos_mejoras',
    ULTIMA_SINCRONIZACION: 'ultima_sync_mejoras',
    ERRORES_SINCRONIZACION: 'sync_errores_mejoras'
};

/**
 * Configuración de sincronización
 * @constant {Object}
 */
const SYNC_CONFIG = {
    MAX_RETRIES: 3, // Máximo de reintentos por venta
    RETRY_DELAY: 5000, // 5 segundos entre reintentos
    BATCH_SIZE: 10, // Cantidad de ventas por lote
    MAX_OFFLINE_DAYS: 7, // Máximo días para guardar datos offline
    SYNC_INTERVAL: 30000 // 30 segundos entre sincronizaciones automáticas
};

/**
 * Estado de la sincronización
 * @type {Object}
 */
let syncState = {
    isSyncing: false,
    lastSyncAttempt: 0,
    pendingItems: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    offlineMode: false
};

/**
 * Intervalo para sincronización automática
 * @type {number|null}
 */
let autoSyncInterval = null;

// ============================================
// INICIALIZACIÓN DEL MÓDULO DE SINCRONIZACIÓN
// ============================================

/**
 * Inicializa el módulo de sincronización
 */
function initializeSync() {
    console.log('🔄 Inicializando sistema de sincronización...');
    
    try {
        // Configurar listeners de conexión
        setupConnectionListeners();
        
        // Cargar estado inicial
        loadSyncState();
        
        // Actualizar badge offline
        actualizarBadgeOffline();
        
        // Configurar sincronización automática si hay conexión
        if (navigator.onLine) {
            setupAutoSync();
        }
        
        // Limpiar datos expirados
        limpiarDatosExpirados();
        
        console.log('✅ Sistema de sincronización inicializado');
        console.log(`📊 Ventas pendientes: ${getVentasPendientes().length}`);
        
    } catch (error) {
        console.error('❌ Error inicializando sync:', error);
        registrarError('sync_initialize', error);
    }
}

// ============================================
// GESTIÓN DE VENTAS OFFLINE
// ============================================

/**
 * Guarda una venta localmente (modo offline)
 * @param {Object} ventaData - Datos de la venta
 * @returns {string} ID único de la venta offline
 */
function guardarVentaOffline(ventaData) {
    try {
        // Validar datos mínimos
        if (!ventaData.barcode || !ventaData.cantidad || !ventaData.precio_unitario) {
            throw new Error('Datos de venta incompletos');
        }
        
        // Generar ID único para la venta offline
        const offlineId = window.utils.generarIdOffline();
        
        // Preparar objeto de venta offline
        const ventaOffline = {
            ...ventaData,
            offline_id: offlineId,
            estado: 'pendiente',
            fecha_creacion: new Date().toISOString(),
            intentos: 0,
            ultimo_intento: null,
            error: null
        };
        
        // Asegurar que tenga descuento (0 por defecto)
        if (ventaOffline.descuento === undefined) {
            ventaOffline.descuento = 0;
        }
        
        // Obtener ventas pendientes existentes
        const ventasPendientes = getVentasPendientes();
        
        // Agregar nueva venta
        ventasPendientes.push(ventaOffline);
        
        // Guardar en localStorage
        localStorage.setItem(STORAGE_KEYS.VENTAS_OFFLINE, JSON.stringify(ventasPendientes));
        
        // Actualizar estado
        syncState.pendingItems = ventasPendientes.length;
        saveSyncState();
        
        // Actualizar badge
        actualizarBadgeOffline();
        
        console.log(`💾 Venta guardada offline: ${offlineId}`, ventaOffline);
        
        return offlineId;
        
    } catch (error) {
        console.error('❌ Error guardando venta offline:', error);
        registrarError('sync_save_offline', error, { ventaData });
        throw error;
    }
}

/**
 * Obtiene todas las ventas pendientes de sincronización
 * @returns {Array} Ventas pendientes
 */
function getVentasPendientes() {
    try {
        const ventasStr = localStorage.getItem(STORAGE_KEYS.VENTAS_OFFLINE);
        if (!ventasStr) return [];
        
        const ventas = JSON.parse(ventasStr);
        
        // Filtrar ventas expiradas
        const ventasValidas = ventas.filter(venta => !esVentaExpirada(venta));
        
        // Si hay diferencias, guardar de vuelta (limpiar expiradas)
        if (ventasValidas.length !== ventas.length) {
            localStorage.setItem(STORAGE_KEYS.VENTAS_OFFLINE, JSON.stringify(ventasValidas));
        }
        
        return ventasValidas;
        
    } catch (error) {
        console.error('Error obteniendo ventas pendientes:', error);
        return [];
    }
}

/**
 * Verifica si una venta offline está expirada
 * @param {Object} venta - Venta offline
 * @returns {boolean} True si está expirada
 */
function esVentaExpirada(venta) {
    try {
        if (!venta.fecha_creacion) return true;
        
        const fechaCreacion = new Date(venta.fecha_creacion);
        const ahora = new Date();
        const diffDias = (ahora - fechaCreacion) / (1000 * 60 * 60 * 24);
        
        return diffDias > SYNC_CONFIG.MAX_OFFLINE_DAYS;
    } catch (error) {
        return true;
    }
}

/**
 * Actualiza el estado de una venta offline
 * @param {string} offlineId - ID de la venta offline
 * @param {Object} updates - Campos a actualizar
 */
function actualizarEstadoVenta(offlineId, updates) {
    try {
        const ventasPendientes = getVentasPendientes();
        const index = ventasPendientes.findIndex(v => v.offline_id === offlineId);
        
        if (index === -1) {
            console.warn(`Venta offline no encontrada: ${offlineId}`);
            return;
        }
        
        // Actualizar venta
        ventasPendientes[index] = {
            ...ventasPendientes[index],
            ...updates,
            ultimo_intento: updates.estado === 'error' ? new Date().toISOString() : ventasPendientes[index].ultimo_intento
        };
        
        // Si está completada o tiene muchos errores, marcarla para eliminación
        if (updates.estado === 'completada' || 
            (updates.estado === 'error' && ventasPendientes[index].intentos >= SYNC_CONFIG.MAX_RETRIES)) {
            
            // Mover a histórico o eliminar (aquí simplemente eliminamos)
            ventasPendientes.splice(index, 1);
        }
        
        // Guardar cambios
        localStorage.setItem(STORAGE_KEYS.VENTAS_OFFLINE, JSON.stringify(ventasPendientes));
        
        // Actualizar estado
        syncState.pendingItems = ventasPendientes.length;
        saveSyncState();
        
        // Actualizar badge
        actualizarBadgeOffline();
        
    } catch (error) {
        console.error('Error actualizando estado venta:', error);
        registrarError('sync_update_status', error, { offlineId, updates });
    }
}

/**
 * Elimina una venta offline específica
 * @param {string} offlineId - ID de la venta offline
 */
function eliminarVentaOffline(offlineId) {
    try {
        const ventasPendientes = getVentasPendientes();
        const nuevasVentas = ventasPendientes.filter(v => v.offline_id !== offlineId);
        
        if (nuevasVentas.length !== ventasPendientes.length) {
            localStorage.setItem(STORAGE_KEYS.VENTAS_OFFLINE, JSON.stringify(nuevasVentas));
            
            // Actualizar estado
            syncState.pendingItems = nuevasVentas.length;
            saveSyncState();
            
            // Actualizar badge
            actualizarBadgeOffline();
            
            console.log(`🗑️ Venta offline eliminada: ${offlineId}`);
        }
        
    } catch (error) {
        console.error('Error eliminando venta offline:', error);
    }
}

// ============================================
## Continuación del archivo `sync.js`:

```javascript
// ============================================
// SINCRONIZACIÓN CON SERVIDOR
// ============================================

/**
 * Sincroniza todas las ventas pendientes con el servidor
 * @async
 * @param {boolean} force - Forzar sincronización aunque esté en proceso
 * @returns {Promise<Object>} Resultado de la sincronización
 */
async function sincronizarVentasPendientes(force = false) {
    // Verificar si ya se está sincronizando
    if (syncState.isSyncing && !force) {
        console.log('🔄 Sincronización ya en proceso, omitiendo...');
        return { success: false, message: 'Sincronización ya en proceso' };
    }
    
    // Verificar conexión
    if (!navigator.onLine) {
        console.log('📴 Sin conexión, no se puede sincronizar');
        syncState.offlineMode = true;
        
        if (window.notifications) {
            window.notifications.showNotification(
                'No hay conexión a internet para sincronizar',
                'warning'
            );
        }
        
        return { success: false, message: 'Sin conexión a internet' };
    }
    
    // Obtener ventas pendientes
    const ventasPendientes = getVentasPendientes();
    
    if (ventasPendientes.length === 0) {
        console.log('✅ No hay ventas pendientes por sincronizar');
        
        if (window.notifications && force) {
            window.notifications.showNotification(
                'No hay ventas pendientes por sincronizar',
                'success'
            );
        }
        
        return { success: true, message: 'No hay ventas pendientes' };
    }
    
    try {
        // Iniciar estado de sincronización
        syncState.isSyncing = true;
        syncState.offlineMode = false;
        syncState.lastSyncAttempt = Date.now();
        saveSyncState();
        
        console.log(`🔄 Sincronizando ${ventasPendientes.length} ventas pendientes...`);
        
        // Mostrar notificación de inicio
        if (window.notifications) {
            window.notifications.showNotification(
                `Sincronizando ${ventasPendientes.length} ventas pendientes...`,
                'info'
            );
        }
        
        // Dividir en lotes para no sobrecargar
        const lotes = dividirEnLotes(ventasPendientes, SYNC_CONFIG.BATCH_SIZE);
        let exitosas = 0;
        let fallidas = 0;
        let erroresDetalles = [];
        
        // Procesar cada lote
        for (let i = 0; i < lotes.length; i++) {
            const lote = lotes[i];
            console.log(`📦 Procesando lote ${i + 1}/${lotes.length} (${lote.length} ventas)`);
            
            // Procesar cada venta del lote
            for (const venta of lote) {
                try {
                    const resultado = await sincronizarVentaIndividual(venta);
                    
                    if (resultado.success) {
                        exitosas++;
                        
                        // Actualizar estado de la venta
                        actualizarEstadoVenta(venta.offline_id, {
                            estado: 'completada',
                            fecha_sincronizacion: new Date().toISOString(),
                            server_id: resultado.serverId
                        });
                        
                        // Actualizar inventario local
                        actualizarInventarioLocal(
                            venta.barcode, 
                            -venta.cantidad
                        );
                        
                    } else {
                        fallidas++;
                        erroresDetalles.push({
                            ventaId: venta.offline_id,
                            error: resultado.error,
                            codigo: venta.barcode
                        });
                        
                        // Actualizar estado con error
                        actualizarEstadoVenta(venta.offline_id, {
                            estado: 'error',
                            intentos: (venta.intentos || 0) + 1,
                            error: resultado.error?.message || 'Error desconocido'
                        });
                    }
                    
                    // Pequeña pausa entre ventas para no sobrecargar
                    await delay(100);
                    
                } catch (error) {
                    fallidas++;
                    console.error(`❌ Error procesando venta ${venta.offline_id}:`, error);
                    
                    actualizarEstadoVenta(venta.offline_id, {
                        estado: 'error',
                        intentos: (venta.intentos || 0) + 1,
                        error: error.message
                    });
                }
            }
            
            // Pausa entre lotes
            if (i < lotes.length - 1) {
                await delay(1000);
            }
        }
        
        // Finalizar sincronización
        syncState.isSyncing = false;
        syncState.successfulSyncs += exitosas;
        syncState.failedSyncs += fallidas;
        saveSyncState();
        
        // Mostrar resultados
        console.log(`✅ Sincronización completada: ${exitosas} exitosas, ${fallidas} fallidas`);
        
        // Registrar errores si los hay
        if (erroresDetalles.length > 0) {
            registrarError('sync_batch_errors', 'Errores en sincronización', { errores: erroresDetalles });
        }
        
        // Notificar al usuario
        if (window.notifications) {
            if (exitosas > 0 && fallidas === 0) {
                window.notifications.showNotification(
                    `✅ ${exitosas} ventas sincronizadas exitosamente`,
                    'success'
                );
            } else if (exitosas > 0 && fallidas > 0) {
                window.notifications.showNotification(
                    `⚠️ ${exitosas} ventas sincronizadas, ${fallidas} con errores`,
                    'warning'
                );
            } else if (fallidas > 0) {
                window.notifications.showNotification(
                    `❌ Error sincronizando ${fallidas} ventas`,
                    'error'
                );
            }
        }
        
        // Recargar datos si hubo éxitos
        if (exitosas > 0) {
            setTimeout(() => {
                if (window.inventory) window.inventory.cargarInventario(true);
                if (window.sales) window.sales.cargarVentas(true);
            }, 2000);
        }
        
        return {
            success: exitosas > 0,
            exitosas,
            fallidas,
            total: ventasPendientes.length,
            errores: erroresDetalles
        };
        
    } catch (error) {
        console.error('❌ Error en sincronización general:', error);
        registrarError('sync_general_error', error);
        
        syncState.isSyncing = false;
        saveSyncState();
        
        if (window.notifications) {
            window.notifications.showNotification(
                'Error en sincronización. Revisa la conexión.',
                'error'
            );
        }
        
        return {
            success: false,
            error: error.message,
            exitosas: 0,
            fallidas: 0,
            total: ventasPendientes.length
        };
    }
}

/**
 * Sincroniza una venta individual con el servidor
 * @async
 * @param {Object} ventaOffline - Venta offline a sincronizar
 * @returns {Promise<Object>} Resultado de la sincronización
 */
async function sincronizarVentaIndividual(ventaOffline) {
    try {
        // Verificar si ya se sincronizó previamente
        if (ventaOffline.estado === 'completada') {
            return { success: true, message: 'Ya sincronizada' };
        }
        
        // Verificar máximo de intentos
        if ((ventaOffline.intentos || 0) >= SYNC_CONFIG.MAX_RETRIES) {
            return { 
                success: false, 
                error: new Error('Máximo de intentos alcanzado') 
            };
        }
        
        // Preparar datos para enviar al servidor
        const ventaParaSubir = {
            barcode: ventaOffline.barcode,
            cantidad: ventaOffline.cantidad,
            precio_unitario: ventaOffline.precio_unitario,
            descuento: ventaOffline.descuento || 0,
            descripcion: ventaOffline.descripcion || '',
            fecha_venta: ventaOffline.fecha_venta || window.utils.getHoraChileISO()
        };
        
        // Obtener cliente Supabase
        const supabase = window.supabaseConfig?.getClient();
        if (!supabase) {
            throw new Error('Cliente Supabase no disponible');
        }
        
        // 1. Insertar venta en ventas_mejoras
        const { data: ventaInsertada, error: errorVenta } = await supabase
            .from('ventas_mejoras')
            .insert([ventaParaSubir])
            .select()
            .single();
        
        if (errorVenta) {
            console.error('Error insertando venta:', errorVenta);
            throw errorVenta;
        }
        
        // 2. Actualizar inventario
        // Buscar producto actual en inventario
        const inventario = window.inventory?.getInventario() || [];
        const producto = inventario.find(p => p.codigo_barras === ventaOffline.barcode);
        
        if (producto) {
            const nuevoStock = producto.cantidad - ventaOffline.cantidad;
            
            const { error: errorInventario } = await supabase
                .from('inventario_mejoras')
                .update({ 
                    cantidad: nuevoStock,
                    fecha_actualizacion: window.utils.getHoraChileISO()
                })
                .eq('barcode', ventaOffline.barcode);
            
            if (errorInventario) {
                console.error('Error actualizando inventario:', errorInventario);
                // No lanzamos error aquí para no revertir la venta insertada
            }
        }
        
        console.log(`✅ Venta sincronizada: ${ventaOffline.offline_id} -> ${ventaInsertada?.id || 'N/A'}`);
        
        return {
            success: true,
            serverId: ventaInsertada?.id,
            message: 'Venta sincronizada exitosamente'
        };
        
    } catch (error) {
        console.error(`❌ Error sincronizando venta ${ventaOffline.offline_id}:`, error);
        
        // Clasificar error para reintento inteligente
        const errorInfo = clasificarErrorSincronizacion(error);
        
        return {
            success: false,
            error: error,
            errorType: errorInfo.type,
            shouldRetry: errorInfo.retry
        };
    }
}

/**
 * Clasifica errores de sincronización para decidir si reintentar
 * @param {Error} error - Error ocurrido
 * @returns {Object} Información del error
 */
function clasificarErrorSincronizacion(error) {
    const errorMsg = error.message?.toLowerCase() || '';
    
    // Errores de red: reintentar
    if (errorMsg.includes('network') || 
        errorMsg.includes('fetch') || 
        errorMsg.includes('timeout') ||
        errorMsg.includes('offline')) {
        return { type: 'network', retry: true };
    }
    
    // Errores de autenticación: no reintentar
    if (errorMsg.includes('auth') || 
        errorMsg.includes('unauthorized') || 
        errorMsg.includes('token')) {
        return { type: 'auth', retry: false };
    }
    
    // Errores de validación: no reintentar (datos incorrectos)
    if (errorMsg.includes('validation') || 
        errorMsg.includes('invalid') || 
        errorMsg.includes('duplicate')) {
        return { type: 'validation', retry: false };
    }
    
    // Otros errores: reintentar
    return { type: 'other', retry: true };
}

/**
 * Divide un array en lotes más pequeños
 * @param {Array} array - Array a dividir
 * @param {number} tamanoLote - Tamaño de cada lote
 * @returns {Array} Array de lotes
 */
function dividirEnLotes(array, tamanoLote) {
    const lotes = [];
    for (let i = 0; i < array.length; i += tamanoLote) {
        lotes.push(array.slice(i, i + tamanoLote));
    }
    return lotes;
}

/**
 * Delay/pausa asíncrona
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise} Promise que se resuelve después del delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
## Continuación final del archivo `sync.js`:

```javascript
// ============================================
// GESTIÓN DE INVENTARIO OFFLINE
// ============================================

/**
 * Actualiza el inventario localmente (para modo offline)
 * @param {string} codigoBarras - Código de barras del producto
 * @param {number} cambio - Cambio en la cantidad (negativo para ventas)
 */
function actualizarInventarioLocal(codigoBarras, cambio) {
    try {
        // Obtener inventario offline actual
        let inventarioOffline = {};
        try {
            const inventarioStr = localStorage.getItem(STORAGE_KEYS.INVENTARIO_OFFLINE);
            if (inventarioStr) {
                inventarioOffline = JSON.parse(inventarioStr);
            }
        } catch (e) {
            console.warn('Error leyendo inventario offline, creando nuevo');
        }
        
        // Actualizar cantidad
        if (!inventarioOffline[codigoBarras]) {
            // Si no existe en el cache, obtener del inventario actual
            const inventario = window.inventory?.getInventario() || [];
            const producto = inventario.find(p => p.codigo_barras === codigoBarras);
            inventarioOffline[codigoBarras] = producto ? producto.cantidad : 0;
        }
        
        inventarioOffline[codigoBarras] += cambio;
        
        // No permitir cantidades negativas (excepto para encargos)
        if (inventarioOffline[codigoBarras] < -100) { // Límite razonable para encargos
            inventarioOffline[codigoBarras] = -100;
        }
        
        // Guardar cambios
        localStorage.setItem(STORAGE_KEYS.INVENTARIO_OFFLINE, JSON.stringify(inventarioOffline));
        
        console.log(`📦 Inventario local actualizado: ${codigoBarras} = ${inventarioOffline[codigoBarras]}`);
        
        // Actualizar vista si está en modo offline
        if (syncState.offlineMode && window.inventory) {
            window.inventory.actualizarStockLocal(codigoBarras, inventarioOffline[codigoBarras]);
        }
        
    } catch (error) {
        console.error('Error actualizando inventario local:', error);
        registrarError('sync_update_inventory', error, { codigoBarras, cambio });
    }
}

/**
 * Obtiene el inventario actualizado localmente
 * @returns {Object} Inventario offline
 */
function getInventarioOffline() {
    try {
        const inventarioStr = localStorage.getItem(STORAGE_KEYS.INVENTARIO_OFFLINE);
        if (!inventarioStr) return {};
        
        return JSON.parse(inventarioStr);
    } catch (error) {
        console.error('Error obteniendo inventario offline:', error);
        return {};
    }
}

/**
 * Aplica los cambios offline al inventario mostrado
 */
function aplicarInventarioOffline() {
    try {
        const inventarioOffline = getInventarioOffline();
        const inventario = window.inventory?.getInventario() || [];
        
        if (inventario.length === 0 || Object.keys(inventarioOffline).length === 0) {
            return;
        }
        
        // Aplicar cambios a cada producto
        inventario.forEach(producto => {
            if (inventarioOffline[producto.codigo_barras] !== undefined) {
                producto.cantidad = inventarioOffline[producto.codigo_barras];
            }
        });
        
        // Actualizar vista
        if (window.inventory) {
            window.inventory.mostrarInventario(inventario);
        }
        
    } catch (error) {
        console.error('Error aplicando inventario offline:', error);
    }
}

/**
 * Limpia el inventario offline después de sincronización exitosa
 * @param {Array} ventasSincronizadas - IDs de ventas sincronizadas
 */
function limpiarInventarioOffline(ventasSincronizadas) {
    try {
        const inventarioOffline = getInventarioOffline();
        const ventasPendientes = getVentasPendientes();
        
        // Crear conjunto de códigos de ventas aún pendientes
        const codigosPendientes = new Set(
            ventasPendientes.map(v => v.barcode)
        );
        
        // Eliminar solo los códigos que ya no tienen ventas pendientes
        Object.keys(inventarioOffline).forEach(codigo => {
            if (!codigosPendientes.has(codigo)) {
                delete inventarioOffline[codigo];
            }
        });
        
        // Guardar cambios
        localStorage.setItem(STORAGE_KEYS.INVENTARIO_OFFLINE, JSON.stringify(inventarioOffline));
        
    } catch (error) {
        console.error('Error limpiando inventario offline:', error);
    }
}

// ============================================
// GESTIÓN DE ESTADO Y CONFIGURACIÓN
// ============================================

/**
 * Carga el estado de sincronización desde localStorage
 */
function loadSyncState() {
    try {
        const syncStateStr = localStorage.getItem('sync_state_mejoras');
        if (syncStateStr) {
            const savedState = JSON.parse(syncStateStr);
            syncState = { ...syncState, ...savedState };
        }
        
        // Actualizar pendingItems basado en ventas reales
        syncState.pendingItems = getVentasPendientes().length;
        
    } catch (error) {
        console.error('Error cargando estado sync:', error);
    }
}

/**
 * Guarda el estado de sincronización en localStorage
 */
function saveSyncState() {
    try {
        localStorage.setItem('sync_state_mejoras', JSON.stringify(syncState));
    } catch (error) {
        console.error('Error guardando estado sync:', error);
    }
}

/**
 * Actualiza el badge offline en la interfaz
 */
function actualizarBadgeOffline() {
    const ventasPendientes = getVentasPendientes();
    const badge = document.getElementById('offlineBadge');
    const countSpan = document.getElementById('offlineCount');
    
    if (!badge || !countSpan) return;
    
    const count = ventasPendientes.length;
    countSpan.textContent = count;
    
    if (count > 0) {
        badge.style.display = 'block';
        
        // Cambiar color según antigüedad
        const tieneVentasViejas = ventasPendientes.some(v => esVentaExpirada(v));
        if (tieneVentasViejas) {
            badge.style.background = 'var(--danger)';
        } else {
            badge.style.background = 'var(--warning)';
        }
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Configura la sincronización automática periódica
 */
function setupAutoSync() {
    // Limpiar intervalo anterior si existe
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
    }
    
    // Establecer nuevo intervalo
    autoSyncInterval = setInterval(() => {
        if (navigator.onLine && getVentasPendientes().length > 0) {
            console.log('⏰ Sincronización automática iniciada...');
            sincronizarVentasPendientes();
        }
    }, SYNC_CONFIG.SYNC_INTERVAL);
    
    console.log('🔄 Sincronización automática configurada');
}

/**
 * Configura listeners para cambios de conexión
 */
function setupConnectionListeners() {
    window.addEventListener('online', () => {
        console.log('🌐 Conexión restablecida - Activando modo online');
        syncState.offlineMode = false;
        
        // Mostrar notificación
        if (window.notifications) {
            window.notifications.showNotification(
                'Conexión a internet restablecida',
                'success'
            );
        }
        
        // Iniciar sincronización automática
        setupAutoSync();
        
        // Sincronizar ventas pendientes después de 3 segundos
        setTimeout(() => {
            if (getVentasPendientes().length > 0) {
                console.log('🔄 Iniciando sincronización automática por conexión restablecida');
                sincronizarVentasPendientes();
            }
        }, 3000);
    });
    
    window.addEventListener('offline', () => {
        console.log('📴 Conexión perdida - Activando modo offline');
        syncState.offlineMode = true;
        
        // Mostrar notificación
        if (window.notifications) {
            window.notifications.showNotification(
                'Modo offline activado. Las ventas se guardarán localmente.',
                'warning'
            );
        }
        
        // Aplicar inventario offline a la vista
        aplicarInventarioOffline();
        
        // Detener sincronización automática
        if (autoSyncInterval) {
            clearInterval(autoSyncInterval);
            autoSyncInterval = null;
        }
    });
}

// ============================================
// LIMPIEZA Y MANTENIMIENTO
// ============================================

/**
 * Limpia datos expirados del almacenamiento offline
 */
function limpiarDatosExpirados() {
    try {
        // Limpiar ventas expiradas
        const ventasPendientes = getVentasPendientes(); // Ya filtra expiradas
        localStorage.setItem(STORAGE_KEYS.VENTAS_OFFLINE, JSON.stringify(ventasPendientes));
        
        // Limpiar inventario offline de productos sin ventas pendientes
        limpiarInventarioOffline([]);
        
        // Limpiar logs de errores viejos
        limpiarLogsAntiguos();
        
        console.log('🧹 Datos expirados limpiados');
        
    } catch (error) {
        console.error('Error limpiando datos expirados:', error);
    }
}

/**
 * Limpia logs de sincronización antiguos
 */
function limpiarLogsAntiguos() {
    try {
        const ahora = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días
        
        // Limpiar intentos de sync viejos
        const intentosStr = localStorage.getItem(STORAGE_KEYS.SINCRONIZACION_INTENTOS);
        if (intentosStr) {
            const intentos = JSON.parse(intentosStr);
            const intentosActualizados = intentos.filter(intento => 
                (ahora - new Date(intento.fecha).getTime()) < maxAge
            );
            
            if (intentosActualizados.length !== intentos.length) {
                localStorage.setItem(STORAGE_KEYS.SINCRONIZACION_INTENTOS, JSON.stringify(intentosActualizados));
            }
        }
        
        // Limpiar errores de sync viejos
        const erroresStr = localStorage.getItem(STORAGE_KEYS.ERRORES_SINCRONIZACION);
        if (erroresStr) {
            const errores = JSON.parse(erroresStr);
            const erroresActualizados = errores.filter(error => 
                (ahora - new Date(error.timestamp).getTime()) < maxAge
            );
            
            if (erroresActualizados.length !== errores.length) {
                localStorage.setItem(STORAGE_KEYS.ERRORES_SINCRONIZACION, JSON.stringify(erroresActualizados));
            }
        }
        
    } catch (error) {
        console.error('Error limpiando logs:', error);
    }
}

/**
 * Obtiene estadísticas de sincronización
 * @returns {Object} Estadísticas
 */
function getSyncStatistics() {
    const ventasPendientes = getVentasPendientes();
    
    return {
        pendientes: ventasPendientes.length,
        exitosas: syncState.successfulSyncs,
        fallidas: syncState.failedSyncs,
        modoOffline: syncState.offlineMode,
        sincronizando: syncState.isSyncing,
        ultimoIntento: syncState.lastSyncAttempt ? new Date(syncState.lastSyncAttempt).toLocaleString() : 'Nunca'
    };
}

/**
 * Reinicia el sistema de sincronización (para debugging)
 */
function reiniciarSistemaSync() {
    try {
        // Limpiar todos los datos offline
        localStorage.removeItem(STORAGE_KEYS.VENTAS_OFFLINE);
        localStorage.removeItem(STORAGE_KEYS.INVENTARIO_OFFLINE);
        localStorage.removeItem(STORAGE_KEYS.SINCRONIZACION_INTENTOS);
        localStorage.removeItem(STORAGE_KEYS.ULTIMA_SINCRONIZACION);
        localStorage.removeItem(STORAGE_KEYS.ERRORES_SINCRONIZACION);
        localStorage.removeItem('sync_state_mejoras');
        
        // Reiniciar estado
        syncState = {
            isSyncing: false,
            lastSyncAttempt: 0,
            pendingItems: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            offlineMode: false
        };
        
        // Actualizar badge
        actualizarBadgeOffline();
        
        console.log('🔄 Sistema de sincronización reiniciado');
        
        if (window.notifications) {
            window.notifications.showNotification(
                'Sistema de sincronización reiniciado',
                'info'
            );
        }
        
    } catch (error) {
        console.error('Error reiniciando sistema sync:', error);
    }
}

// ============================================
// EXPORTACIÓN
// ============================================

// Inicializar módulo cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSync);
} else {
    initializeSync();
}

// Exportar funciones al ámbito global
window.syncManager = {
    // Funciones principales
    initializeSync,
    sincronizarVentasPendientes,
    guardarVentaOffline,
    
    // Gestión de ventas offline
    getVentasPendientes,
    actualizarEstadoVenta,
    eliminarVentaOffline,
    
    // Gestión de inventario offline
    actualizarInventarioLocal,
    getInventarioOffline,
    aplicarInventarioOffline,
    
    // Configuración y estado
    setupAutoSync,
    getSyncStatistics,
    reiniciarSistemaSync,
    
    // Utilidades
    actualizarBadgeOffline,
    limpiarDatosExpirados,
    
    // Getters
    get isSyncing() { return syncState.isSyncing; },
    get offlineMode() { return syncState.offlineMode || !navigator.onLine; },
    get pendingCount() { return getVentasPendientes().length; },
    
    // Configuración (solo lectura)
    get config() { return { ...SYNC_CONFIG }; }
};

console.log('✅ Módulo de sincronización cargado y listo');
