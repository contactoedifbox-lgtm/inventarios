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
    console.log('💾 Venta guardada offline');
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
    
    localStorage.setItem(
        Constants.LOCAL_STORAGE_KEYS.OFFLINE_INVENTORY, 
        JSON.stringify(inventarioOffline)
    );
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
    
    notificationManager.info(`🔄 Sincronizando ${ventasPendientes.length} ventas...`);
    
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
                
            if (errorVenta) {
                console.error('Error insertando venta:', errorVenta);
                continue;
            }
            
            // Actualizar inventario
            const producto = StateManager.getProducto(venta.barcode);
            if (producto) {
                const nuevoStock = producto.cantidad - venta.cantidad;
                
                await supabaseClient
                    .from(Constants.API_ENDPOINTS.INVENTORY_TABLE)
                    .update({ 
                        cantidad: nuevoStock,
                        fecha_actualizacion: DateTimeUtils.getCurrentChileISO()
                    })
                    .eq('barcode', venta.barcode);
            }
            
        } catch (error) {
            console.error('Error sincronizando venta:', error);
        }
    }
    
    // Limpiar localStorage
    localStorage.removeItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_SALES);
    localStorage.removeItem(Constants.LOCAL_STORAGE_KEYS.OFFLINE_INVENTORY);
    
    updateOfflineBadge();
    
    notificationManager.success('✅ Ventas sincronizadas exitosamente');
    
    // Recargar datos
    const { loadInventoryData, loadSalesData } = await import('./inventario.js');
    await loadInventoryData(true);
    await loadSalesData();
}

export function setupOfflineMonitoring() {
    const offlineBadge = document.getElementById('offlineBadge');
    
    if (offlineBadge) {
        offlineBadge.addEventListener('click', syncPendingSales);
    }
    
    updateOfflineBadge();
    console.log('✅ Monitoreo offline configurado');
}
