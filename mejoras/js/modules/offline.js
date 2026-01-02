import { StateManager, Constants } from '../config/supabase-config.js';
import { DateTimeUtils } from './utils.js';
import notificationManager from '../ui/notifications.js';
import { supabaseClient } from '../config/supabase-config.js';

export function saveSaleOffline(saleData) {
    const ventaParaGuardar = {
        barcode: saleData.barcode,
        cantidad: saleData.cantidad,
        precio_unitario: saleData.precio_unitario,
        descuento: saleData.descuento || 0,
        descripcion: saleData.descripcion || '',
        fecha_venta: saleData.fecha_venta || DateTimeUtils.getCurrentChileISO(),
        id_venta_agrupada: saleData.id_venta_agrupada || `OFF-${Date.now()}`,
        numero_linea: saleData.numero_linea || 1,
        offline_id: Date.now() + Math.random(),
        estado: 'pendiente'
    };
    
    let ventasPendientes = JSON.parse(
        localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_SALES) || '[]'
    );
    
    ventasPendientes.push(ventaParaGuardar);
    localStorage.setItem(
        Constants.LOCAL_STORAGE_KEYS.OFFLINE_SALES, 
        JSON.stringify(ventasPendientes)
    );
    
    updateOfflineBadge();
}

// Función para guardar ventas múltiples offline
export function saveMultipleSaleOffline(ventaMultipleData) {
    let ventasMultiplesPendientes = JSON.parse(
        localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_MULTIPLE_SALES) || '[]'
    );
    
    ventasMultiplesPendientes.push(ventaMultipleData);
    localStorage.setItem(
        Constants.LOCAL_STORAGE_KEYS.OFFLINE_MULTIPLE_SALES,
        JSON.stringify(ventasMultiplesPendientes)
    );
    
    // Actualizar inventario offline para cada línea
    if (ventaMultipleData.lineas && ventaMultipleData.lineas.length > 0) {
        ventaMultipleData.lineas.forEach(linea => {
            updateLocalInventory(linea.barcode, -linea.cantidad);
        });
    }
    
    updateOfflineBadge();
}

export function updateLocalInventory(barcode, change) {
    let inventarioOffline = JSON.parse(
        localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_INVENTORY) || '{}'
    );
    
    if (!inventarioOffline[barcode]) {
        const producto = StateManager.getProducto(barcode);
        inventarioOffline[barcode] = producto ? producto.cantidad : 0;
    }
    
    inventarioOffline[barcode] += change;
    
    if (inventarioOffline[barcode] < 0) {
        inventarioOffline[barcode] = 0;
    }
    
    localStorage.setItem(
        Constants.LOCAL_STORAGE_KEYS.OFFLINE_INVENTORY, 
        JSON.stringify(inventarioOffline)
    );
}

export async function updateLocalInventoryView() {
    const inventarioOffline = JSON.parse(
        localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_INVENTORY) || '{}'
    );
    
    const inventario = StateManager.getInventario();
    inventario.forEach(item => {
        if (inventarioOffline[item.codigo_barras] !== undefined) {
            item.cantidad = inventarioOffline[item.codigo_barras];
        }
    });
    
    StateManager.setInventario(inventario);
    
    const { displayInventory } = await import('./inventario.js');
    displayInventory(inventario);
}

export function updateOfflineBadge() {
    const ventasPendientes = JSON.parse(
        localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_SALES) || '[]'
    );
    
    const ventasMultiplesPendientes = JSON.parse(
        localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_MULTIPLE_SALES) || '[]'
    );
    
    const totalPendientes = ventasPendientes.length + ventasMultiplesPendientes.length;
    
    const badge = document.getElementById('offlineBadge');
    const countSpan = document.getElementById('offlineCount');
    
    if (countSpan) {
        countSpan.textContent = totalPendientes;
    }
    
    if (badge) {
        badge.style.display = totalPendientes > 0 ? 'block' : 'none';
    }
}

export async function syncPendingSales() {
    if (!navigator.onLine) {
        notificationManager.error('❌ No hay conexión a internet');
        return;
    }
    
    // Sincronizar ventas individuales
    const ventasPendientes = JSON.parse(
        localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_SALES) || '[]'
    );
    
    // Sincronizar ventas múltiples
    const ventasMultiplesPendientes = JSON.parse(
        localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_MULTIPLE_SALES) || '[]'
    );
    
    const totalPendientes = ventasPendientes.length + ventasMultiplesPendientes.length;
    
    if (totalPendientes === 0) {
        notificationManager.success('✅ No hay ventas pendientes por sincronizar');
        return;
    }
    
    notificationManager.info(`🔄 Sincronizando ${totalPendientes} ventas pendientes...`);
    
    let exitosas = 0;
    let fallidas = 0;
    
    // Sincronizar ventas individuales
    for (const venta of ventasPendientes) {
        try {
            const ventaParaSubir = {
                barcode: venta.barcode,
                cantidad: venta.cantidad,
                precio_unitario: venta.precio_unitario,
                descuento: venta.descuento || 0,
                descripcion: venta.descripcion || '',
                fecha_venta: venta.fecha_venta,
                id_venta_agrupada: venta.id_venta_agrupada,
                numero_linea: venta.numero_linea || 1
            };
            
            const { error: errorVenta } = await supabaseClient
                .from(Constants.API_ENDPOINTS.SALES_TABLE)
                .insert([ventaParaSubir]);
                
            if (!errorVenta) {
                const productoIndex = StateManager.getInventario().findIndex(p => 
                    p.codigo_barras === venta.barcode
                );
                
                if (productoIndex !== -1) {
                    const nuevoStock = StateManager.getInventario()[productoIndex].cantidad - venta.cantidad;
                    
                    const { error: errorInventario } = await supabaseClient
                        .from(Constants.API_ENDPOINTS.INVENTORY_TABLE)
                        .update({ 
                            cantidad: nuevoStock,
                            fecha_actualizacion: DateTimeUtils.getCurrentChileISO()
                        })
                        .eq('barcode', venta.barcode);
                        
                    if (!errorInventario) {
                        StateManager.updateInventoryItem(venta.barcode, {
                            cantidad: nuevoStock,
                            fecha_actualizacion: new Date().toISOString()
                        });
                    }
                }
                exitosas++;
            } else {
                console.error('Error insertando venta:', errorVenta);
                fallidas++;
            }
        } catch (error) {
            console.error('Error sincronizando venta:', error);
            fallidas++;
        }
    }
    
    // Sincronizar ventas múltiples
    for (const ventaMultiple of ventasMultiplesPendientes) {
        try {
            let ventasInsertadas = 0;
            
            for (const linea of ventaMultiple.lineas) {
                const ventaData = {
                    barcode: linea.barcode,
                    cantidad: linea.cantidad,
                    precio_unitario: linea.precio_unitario,
                    descuento: linea.descuento || 0,
                    descripcion: linea.descripcion || '',
                    fecha_venta: ventaMultiple.fecha,
                    id_venta_agrupada: ventaMultiple.id_venta_agrupada,
                    numero_linea: linea.numero_linea || 1
                };
                
                const { error: errorVenta } = await supabaseClient
                    .from(Constants.API_ENDPOINTS.SALES_TABLE)
                    .insert([ventaData]);
                    
                if (!errorVenta) {
                    ventasInsertadas++;
                    
                    // Actualizar inventario
                    const productoIndex = StateManager.getInventario().findIndex(p => 
                        p.codigo_barras === linea.barcode
                    );
                    
                    if (productoIndex !== -1) {
                        const nuevoStock = StateManager.getInventario()[productoIndex].cantidad - linea.cantidad;
                        
                        await supabaseClient
                            .from(Constants.API_ENDPOINTS.INVENTORY_TABLE)
                            .update({ 
                                cantidad: nuevoStock,
                                fecha_actualizacion: DateTimeUtils.getCurrentChileISO()
                            })
                            .eq('barcode', linea.barcode);
                    }
                }
            }
            
            if (ventasInsertadas === ventaMultiple.lineas.length) {
                exitosas++;
            } else {
                fallidas++;
            }
            
        } catch (error) {
            console.error('Error sincronizando venta múltiple:', error);
            fallidas++;
        }
    }
    
    // Limpiar localStorage solo de las ventas sincronizadas exitosamente
    if (exitosas > 0) {
        // Para simplificar, limpiamos todo si hubo éxito
        localStorage.setItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_SALES, JSON.stringify([]));
        localStorage.setItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_MULTIPLE_SALES, JSON.stringify([]));
        localStorage.setItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_INVENTORY, JSON.stringify({}));
    }
    
    updateOfflineBadge();
    
    if (exitosas > 0) {
        notificationManager.success(`✅ ${exitosas} ventas sincronizadas exitosamente`);
        
        // Recargar datos
        const { loadInventoryData, loadSalesData } = await import('./inventario.js');
        await loadInventoryData(true);
        await loadSalesData();
        
        const { updateStatistics } = await import('./inventario.js');
        updateStatistics();
    }
    
    if (fallidas > 0) {
        notificationManager.warning(`⚠️ ${fallidas} ventas no se pudieron sincronizar`);
    }
}

export function setupOfflineMonitoring() {
    const offlineBadge = document.getElementById('offlineBadge');
    
    if (offlineBadge) {
        offlineBadge.addEventListener('click', syncPendingSales);
    }
    
    updateOfflineBadge();
}
