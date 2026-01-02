function guardarVentaOffline(ventaData) {
    const ventaParaGuardar = {
        barcode: ventaData.barcode,
        cantidad: ventaData.cantidad,
        precio_unitario: ventaData.precio_unitario,
        descuento: ventaData.descuento || 0,
        descripcion: ventaData.descripcion || '',
        fecha_venta: ventaData.fecha_venta || getHoraChileISO(),
        offline_id: Date.now() + Math.random(),
        estado: 'pendiente'
    };
    let ventasPendientes = JSON.parse(localStorage.getItem('ventas_offline_mejoras') || '[]');
    ventasPendientes.push(ventaParaGuardar);
    localStorage.setItem('ventas_offline_mejoras', JSON.stringify(ventasPendientes));
    actualizarBadgeOffline();
}

function actualizarInventarioLocal(codigoBarras, cambio) {
    let inventarioOffline = JSON.parse(localStorage.getItem('inventario_offline_mejoras') || '{}');
    if (!inventarioOffline[codigoBarras]) {
        const producto = inventario.find(p => p.codigo_barras === codigoBarras);
        inventarioOffline[codigoBarras] = producto ? producto.cantidad : 0;
    }
    inventarioOffline[codigoBarras] += cambio;
    if (inventarioOffline[codigoBarras] < 0) {
        inventarioOffline[codigoBarras] = 0;
    }
    localStorage.setItem('inventario_offline_mejoras', JSON.stringify(inventarioOffline));
}

function actualizarVistaInventarioLocal() {
    const inventarioOffline = JSON.parse(localStorage.getItem('inventario_offline_mejoras') || '{}');
    inventario.forEach(item => {
        if (inventarioOffline[item.codigo_barras] !== undefined) {
            item.cantidad = inventarioOffline[item.codigo_barras];
        }
    });
    mostrarInventario(inventario);
}

function actualizarBadgeOffline() {
    const ventasPendientes = JSON.parse(localStorage.getItem('ventas_offline_mejoras') || '[]');
    const badge = document.getElementById('offlineBadge');
    const countSpan = document.getElementById('offlineCount');
    countSpan.textContent = ventasPendientes.length;
    badge.style.display = ventasPendientes.length > 0 ? 'block' : 'none';
}

async function sincronizarVentasPendientes() {
    if (!navigator.onLine) {
        showNotification('❌ No hay conexión a internet', 'error');
        return;
    }
    const ventasPendientes = JSON.parse(localStorage.getItem('ventas_offline_mejoras') || '[]');
    if (ventasPendientes.length === 0) {
        showNotification('✅ No hay ventas pendientes por sincronizar - MEJORAS', 'success');
        return;
    }
    showNotification(`🔄 Sincronizando ${ventasPendientes.length} ventas pendientes MEJORAS...`, 'info');
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
                .from('ventas_mejoras')
                .insert([ventaParaSubir]);
                
            if (!errorVenta) {
                const productoIndex = inventario.findIndex(p => p.codigo_barras === venta.barcode);
                if (productoIndex !== -1) {
                    const nuevoStock = inventario[productoIndex].cantidad - venta.cantidad;
                    const { error: errorInventario } = await supabaseClient
                        .from('inventario_mejoras')
                        .update({ 
                            cantidad: nuevoStock,
                            fecha_actualizacion: getHoraChileISO()
                        })
                        .eq('barcode', venta.barcode);
                        
                    if (!errorInventario) {
                        inventario[productoIndex].cantidad = nuevoStock;
                        inventario[productoIndex].fecha_actualizacion = new Date().toISOString();
                        mostrarInventario([inventario[productoIndex]], true);
                    }
                }
                exitosas.push(venta);
            } else {
                console.error('Error insertando venta MEJORAS:', errorVenta);
                fallidas.push(venta);
            }
        } catch (error) {
            console.error('Error sincronizando venta MEJORAS:', error);
            fallidas.push(venta);
        }
    }
    
    localStorage.setItem('ventas_offline_mejoras', JSON.stringify(fallidas));
    const inventarioOffline = JSON.parse(localStorage.getItem('inventario_offline_mejoras') || '{}');
    exitosas.forEach(venta => {
        delete inventarioOffline[venta.barcode];
    });
    localStorage.setItem('inventario_offline_mejoras', JSON.stringify(inventarioOffline));
    
    if (exitosas.length > 0) {
        showNotification(`✅ ${exitosas.length} ventas MEJORAS sincronizadas exitosamente`, 'success');
        await cargarVentas();
        actualizarEstadisticas();
    }
    
    if (fallidas.length > 0) {
        showNotification(`⚠️ ${fallidas.length} ventas MEJORAS no se pudieron sincronizar`, 'warning');
    }
    
    actualizarBadgeOffline();
}
