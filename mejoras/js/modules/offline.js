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
    
    const badge = document.getElementById('offlineBadge');
    const countSpan = document.getElementById('offlineCount');
    
    if (countSpan) {
        countSpan.textContent = ventasPendientes.length;
    }
    
    if (badge) {
        badge.style.display = ventasPendientes.length > 0 ? 'block' : 'none';
    }
}

export async function syncPendingSales() {
    if (!navigator.onLine) {
        notificationManager.error('❌ No hay conexión a internet');
        return;
    }
    
    const ventasPendientes = JSON.parse(
        localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_SALES) || '[]'
    );
    
    if (ventasPendientes.length === 0) {
        notificationManager.success('✅ No hay ventas pendientes por sincronizar');
        return;
    }
    
    notificationManager.info(`🔄 Sincronizando ${ventasPendientes.length} ventas pendientes...`);
    
    const exitosas = [];
    const fallidas = [];
    
    for (const venta of ventasPendientes) {
        try {
            const ventaParaSubir = {
                barcode: venta.barcode,
                cantidad: venta.cantidad,
                precio_unitario: venta.precio_unitario,
                descuento: venta.descuento || 0,
                descripcion: venta.descripcion || '',
                fecha_venta: venta.fecha_venta
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
                        
                        const { displayInventory } = await import('./inventario.js');
                        const producto = StateManager.getProducto(venta.barcode);
                        if (producto) {
                            displayInventory([producto]);
                        }
                    }
                }
                exitosas.push(venta);
            } else {
                console.error('Error insertando venta:', errorVenta);
                fallidas.push(venta);
            }
        } catch (error) {
            console.error('Error sincronizando venta:', error);
            fallidas.push(venta);
        }
    }
    
    localStorage.setItem(
        Constants.LOCAL_STORAGE_KEYS.OFFLINE_SALES, 
        JSON.stringify(fallidas)
    );
    
    const inventarioOffline = JSON.parse(
        localStorage.getItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_INVENTORY) || '{}'
    );
    
    exitosas.forEach(venta => {
        delete inventarioOffline[venta.barcode];
    });
    
    localStorage.setItem(
        Constants.LOCAL_STORAGE_KEYS.OFFLINE_INVENTORY, 
        JSON.stringify(inventarioOffline)
    );
    
    if (exitosas.length > 0) {
        notificationManager.success(`✅ ${exitosas.length} ventas sincronizadas exitosamente`);
        
        const { loadSalesData } = await import('./inventario.js');
        await loadSalesData();
        const { updateStatistics } = await import('./inventario.js');
        updateStatistics();
    }
    
    if (fallidas.length > 0) {
        notificationManager.warning(`⚠️ ${fallidas.length} ventas no se pudieron sincronizar`);
    }
    
    updateOfflineBadge();
}

export function setupOfflineMonitoring() {
    const offlineBadge = document.getElementById('offlineBadge');
    
    if (offlineBadge) {
        offlineBadge.addEventListener('click', syncPendingSales);
    }
    
    updateOfflineBadge();
}
