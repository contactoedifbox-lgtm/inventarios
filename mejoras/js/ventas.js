async function cargarVentas() {
    try {
        const { data, error } = await supabaseClient
            .from('vista_ventas_mejoras')
            .select('*')
            .order('fecha_venta', { ascending: false })
            .limit(200);
        if (error) throw error;
        ventas = data;
        mostrarVentas(ventas);
    } catch (error) {
        console.error('Error cargando ventas MEJORAS:', error);
        showNotification('Error al cargar ventas MEJORAS', 'error');
    }
}

function mostrarVentas(data) {
    const tbody = document.getElementById('ventasBody');
    tbody.innerHTML = '';
    const hoyChile = getFechaHoyChile();
    const ventasHoy = data.filter(v => {
        if (!v.fecha_venta) return false;
        const fechaVenta = v.fecha_venta.split('T')[0];
        return fechaVenta === hoyChile;
    });
    const totalHoy = ventasHoy.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    document.getElementById('ventas-hoy').textContent = `$${totalHoy.toFixed(2)}`;
    data.forEach(item => {
        const fecha = formatoHoraChile(item.fecha_venta);
        const descuento = parseFloat(item.descuento || 0);
        const row = `
            <tr>
                <td>${item.codigo_barras}</td>
                <td>${item.cantidad}</td>
                <td>$${parseFloat(item.precio_unitario || 0).toFixed(2)}</td>
                <td>${descuento > 0 ? `-$${descuento.toFixed(2)}` : '$0.00'}</td>
                <td><strong>$${parseFloat(item.total || 0).toFixed(2)}</strong></td>
                <td>${item.descripcion || ''}</td>
                <td>${fecha}</td>
                <td>
                    <button class="action-btn btn-edit" data-codigo="${item.codigo_barras}" data-fecha="${item.fecha_venta}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="action-btn btn-delete" data-codigo="${item.codigo_barras}" data-fecha="${item.fecha_venta}" data-cantidad="${item.cantidad}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
    document.querySelectorAll('#ventasBody .btn-edit').forEach(button => {
        button.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            const fecha = this.getAttribute('data-fecha');
            editarVenta(codigo, fecha);
        });
    });
    document.querySelectorAll('#ventasBody .btn-delete').forEach(button => {
        button.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            const fecha = this.getAttribute('data-fecha');
            const cantidad = parseInt(this.getAttribute('data-cantidad'));
            eliminarVenta(codigo, fecha, cantidad);
        });
    });
}

function actualizarFilaInventario(codigo, nuevaCantidad) {
    console.log('=== ACTUALIZAR FILA INVENTARIO ===');
    console.log('Código buscado:', codigo);
    console.log('Nueva cantidad:', nuevaCantidad);
    
    // CAMBIA ESTA LÍNEA: usa 'let' en lugar de 'const'
    let filas = document.querySelectorAll('#inventarioBody tr');
    console.log('Filas encontradas:', filas.length);
    
    for (let fila of filas) {
        const primeraCelda = fila.querySelector('td:first-child');
        if (!primeraCelda) continue;
        
        const codigoFila = primeraCelda.textContent.trim();
        console.log('Código en fila:', codigoFila);
        
        if (codigoFila === codigo) {
            console.log('¡Fila encontrada!');
            
            const celdaStock = fila.querySelector('td:nth-child(3)');
            const badge = celdaStock.querySelector('.stock-badge');
            const stockBadge = getStockBadge(nuevaCantidad);
            
            badge.textContent = `${nuevaCantidad} unidades`;
            badge.className = `stock-badge ${stockBadge.class}`;
            
            const productoIndex = inventario.findIndex(p => p.codigo_barras === codigo);
            if (productoIndex !== -1) {
                inventario[productoIndex].cantidad = nuevaCantidad;
                inventario[productoIndex].fecha_actualizacion = getHoraChileISO();
            }
            
            const fechaCelda = fila.querySelector('td:nth-child(6)');
            if (fechaCelda) {
                fechaCelda.textContent = formatoHoraChile(getHoraChileISO());
            }
            
            console.log('Fila actualizada exitosamente');
            break;
        }
    }
    
    actualizarEstadisticas();
    document.getElementById('inventario-needs-sync').style.display = 'inline-block';
}

async function eliminarVenta(codigo, fechaVenta, cantidad) {
    if (!confirm(`¿Estás seguro de eliminar esta venta?\nCódigo: ${codigo}\nCantidad: ${cantidad}\n\nEsta acción devolverá ${cantidad} unidades al inventario.`)) {
        return;
    }
    
    try {
        showNotification('🔄 Eliminando venta MEJORAS...', 'info');
        
        console.log('Iniciando eliminación:', { codigo, fechaVenta, cantidad });
        
        const { data: producto, error: errorProducto } = await supabaseClient
            .from('inventario_mejoras')
            .select('cantidad, descripcion')
            .eq('barcode', codigo)
            .single();
        
        if (errorProducto) {
            console.error('Error obteniendo producto:', errorProducto);
            throw new Error(`Producto ${codigo} no encontrado en inventario`);
        }
        
        console.log('Producto encontrado:', producto);
        
        const stockActual = parseInt(producto.cantidad) || 0;
        const nuevoStock = stockActual + parseInt(cantidad);
        
        console.log('Cálculo de stock:', { stockActual, cantidad, nuevoStock });
        
        const { error: errorEliminar } = await supabaseClient
            .from('ventas_mejoras')
            .delete()
            .eq('barcode', codigo)
            .eq('fecha_venta', fechaVenta);
        
        if (errorEliminar) {
            console.error('Error eliminando venta:', errorEliminar);
            throw errorEliminar;
        }
        
        console.log('Venta eliminada correctamente');
        
        const { error: errorInventario } = await supabaseClient
            .from('inventario_mejoras')
            .update({ 
                cantidad: nuevoStock,
                fecha_actualizacion: getHoraChileISO()
            })
            .eq('barcode', codigo);
        
        if (errorInventario) {
            console.error('Error actualizando inventario:', errorInventario);
            throw errorInventario;
        }
        
        console.log('Inventario actualizado correctamente en Supabase');
        
        const productoIndex = inventario.findIndex(p => p.codigo_barras === codigo);
        if (productoIndex !== -1) {
            inventario[productoIndex].cantidad = nuevoStock;
            inventario[productoIndex].fecha_actualizacion = getHoraChileISO();
            
            actualizarFilaInventario(codigo, nuevoStock);
        }
        
        await cargarVentas();
        
        actualizarEstadisticas();
        
        showNotification(`✅ Venta eliminada. Stock de ${producto.descripcion || codigo} restaurado: ${stockActual} → ${nuevoStock} unidades`, 'success');
        
        console.log('Eliminación completada exitosamente');
        
    } catch (error) {
        console.error('Error completo eliminando venta:', error);
        showNotification('❌ Error al eliminar la venta: ' + error.message, 'error');
    }
}

async function editarVenta(codigo, fechaVenta) {
    console.log('=== INICIANDO editarVenta ===');
    console.log('Buscando venta:', { codigo, fechaVenta });
    
    ventaEditando = ventas.find(v => v.codigo_barras === codigo && v.fecha_venta === fechaVenta);
    
    if (!ventaEditando) {
        console.error('❌ Venta no encontrada en array ventas');
        console.log('Total ventas en array:', ventas.length);
        console.log('Primeras 5 ventas:', ventas.slice(0, 5));
        showNotification('❌ Error: Venta no encontrada', 'error');
        return;
    }
    
    console.log('✅ Venta encontrada:', ventaEditando);
    
    const producto = inventario.find(p => p.codigo_barras === codigo);
    const stockActual = producto ? producto.cantidad : 0;
    
    document.getElementById('editVentaCodigo').value = ventaEditando.codigo_barras;
    document.getElementById('editVentaFecha').value = formatoHoraChile(ventaEditando.fecha_venta);
    document.getElementById('editVentaDescripcion').value = ventaEditando.descripcion || '';
    document.getElementById('editVentaPrecio').value = parseFloat(ventaEditando.precio_unitario).toFixed(2);
    document.getElementById('editVentaDescuento').value = parseFloat(ventaEditando.descuento || 0).toFixed(2);
    document.getElementById('editVentaCantidad').value = ventaEditando.cantidad;
    document.getElementById('editVentaDescripcion').placeholder = `Descripción | Stock actual: ${stockActual} unidades`;
    
    calcularNuevoTotalConDescuento();
    openModal('modalVenta');
}

function calcularNuevoTotalConDescuento() {
    const precio = parseFloat(document.getElementById('editVentaPrecio').value);
    const descuento = parseFloat(document.getElementById('editVentaDescuento').value) || 0;
    const cantidad = parseInt(document.getElementById('editVentaCantidad').value) || 0;
    const subtotal = precio * cantidad;
    const total = Math.max(subtotal - descuento, 0);
    document.getElementById('editVentaTotal').value = `$${total.toFixed(2)}`;
}

async function guardarVenta() {
    // VERIFICAR SI ventaEditando EXISTE
    if (!ventaEditando || !ventaEditando.codigo_barras) {
        console.error('Error: ventaEditando no está definido:', ventaEditando);
        showNotification('❌ Error: No hay venta seleccionada para editar', 'error');
        return;
    }
    
    const nuevaCantidad = parseInt(document.getElementById('editVentaCantidad').value);
    const precio = parseFloat(document.getElementById('editVentaPrecio').value);
    const nuevoDescuento = parseFloat(document.getElementById('editVentaDescuento').value) || 0;

    console.log('=== INICIANDO guardarVenta ===');
    console.log('ventaEditando:', ventaEditando);
    console.log('Código barras:', ventaEditando.codigo_barras);
    console.log('Cantidad anterior:', ventaEditando.cantidad);
    console.log('Cantidad nueva:', nuevaCantidad);
    
    if (nuevaCantidad <= 0) {
        showNotification('❌ La cantidad debe ser mayor a 0', 'error');
        return;
    }
    if (nuevoDescuento < 0) {
        showNotification('❌ El descuento no puede ser negativo', 'error');
        return;
    }
    
    const subtotal = nuevaCantidad * precio;
    if (nuevoDescuento > subtotal) {
        showNotification(`❌ El descuento ($${nuevoDescuento.toFixed(2)}) no puede ser mayor al subtotal ($${subtotal.toFixed(2)})`, 'error');
        return;
    }
    
    try {
        showNotification('🔄 Actualizando venta MEJORAS...', 'info');
        
        const { data: productoActual, error: errorProducto } = await supabaseClient
            .from('inventario_mejoras')
            .select('cantidad')
            .eq('barcode', ventaEditando.codigo_barras)
            .single();
        
        if (errorProducto) {
            console.error('Error obteniendo producto actual:', errorProducto);
            throw errorProducto;
        }
        
        const diferencia = nuevaCantidad - ventaEditando.cantidad;
        const stockActual = parseInt(productoActual.cantidad);
        const nuevoStock = stockActual - diferencia;
        
        console.log('=== DEBUG EDICIÓN VENTA ===');
        console.log('Código producto:', ventaEditando.codigo_barras);
        console.log('Cantidad anterior:', ventaEditando.cantidad);
        console.log('Cantidad nueva:', nuevaCantidad);
        console.log('Diferencia:', diferencia);
        console.log('Stock actual en Supabase:', stockActual);
        console.log('Nuevo stock calculado:', nuevoStock);
        
        const { data, error } = await supabaseClient.rpc('editar_cantidad_venta_mejoras', {
            p_barcode: ventaEditando.codigo_barras,
            p_fecha_venta: ventaEditando.fecha_venta,
            p_nueva_cantidad: nuevaCantidad,
            p_nuevo_descuento: nuevoDescuento
        });
        
        if (error) throw error;
        
        console.log('Respuesta de Supabase:', data);
        
        if (data && data.success) {
            const { error: errorUpdateInventario } = await supabaseClient
                .from('inventario_mejoras')
                .update({ 
                    cantidad: nuevoStock,
                    fecha_actualizacion: getHoraChileISO()
                })
                .eq('barcode', ventaEditando.codigo_barras);
            
            if (errorUpdateInventario) throw errorUpdateInventario;
            
            console.log('✅ Inventario actualizado en Supabase');
            
            showNotification('✅ Venta MEJORAS actualizada correctamente', 'success');
            closeModal('modalVenta');
            
            await cargarVentas();
            
            console.log('Llamando a actualizarFilaInventario...');
            console.log('Parámetros:', ventaEditando.codigo_barras, nuevoStock);
            
            // ACTUALIZAR INCREMENTALMENTE
            actualizarFilaInventario(ventaEditando.codigo_barras, nuevoStock);
            
            actualizarEstadisticas();
            
            console.log('✅ Edición completada exitosamente');
            
        } else {
            const mensajeError = data?.error || 'Error desconocido';
            console.error('Error en respuesta:', data);
            showNotification('❌ Error: ' + mensajeError, 'error');
        }
    } catch (error) {
        console.error('Error completo al actualizar venta MEJORAS:', error);
        showNotification('❌ Error al actualizar la venta MEJORAS: ' + error.message, 'error');
    }
}

function abrirAgregarVenta() {
    productoSeleccionado = null;
    document.getElementById('buscarProducto').value = '';
    document.getElementById('resultadosBusqueda').innerHTML = '';
    document.getElementById('resultadosBusqueda').style.display = 'none';
    document.getElementById('infoProducto').style.display = 'none';
    document.getElementById('ventaCantidad').value = 1;
    document.getElementById('ventaPrecio').value = '';
    document.getElementById('ventaDescuento').value = 0;
    document.getElementById('ventaDescripcion').value = '';
    document.getElementById('ventaTotal').textContent = '$0.00';
    document.getElementById('fechaVentaActual').textContent = getFechaActualChile();
    if (!navigator.onLine) {
        document.getElementById('modalAgregarVenta').classList.add('offline-mode');
        document.querySelector('#modalAgregarVenta .modal-header h2').innerHTML = '<i class="fas fa-wifi-slash"></i> Agregar Venta (Modo Offline) - MEJORAS';
    } else {
        document.getElementById('modalAgregarVenta').classList.remove('offline-mode');
        document.querySelector('#modalAgregarVenta .modal-header h2').textContent = 'Agregar Venta Manual - MEJORAS';
    }
    openModal('modalAgregarVenta');
}

function buscarProductos() {
    const termino = document.getElementById('buscarProducto').value.toLowerCase();
    const resultadosDiv = document.getElementById('resultadosBusqueda');
    if (termino.length < 2) {
        resultadosDiv.innerHTML = '';
        resultadosDiv.style.display = 'none';
        return;
    }
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
                 data-codigo="${producto.codigo_barras}">
                <div><strong>${producto.codigo_barras}</strong></div>
                <div style="color: #475569; font-size: 14px;">${producto.descripcion || 'Sin descripción'}</div>
                <div style="color: #64748b; font-size: 12px;">
                    Stock: ${producto.cantidad} | Precio: $${parseFloat(producto.precio || 0).toFixed(2)}
                </div>
            </div>
        `;
    });
    resultadosDiv.innerHTML = html;
    resultadosDiv.style.display = 'block';
    document.querySelectorAll('#resultadosBusqueda div').forEach(div => {
        div.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            seleccionarProducto(codigo);
        });
    });
}

function seleccionarProducto(codigo) {
    productoSeleccionado = inventario.find(p => p.codigo_barras === codigo);
    if (productoSeleccionado) {
        document.getElementById('productoCodigo').textContent = productoSeleccionado.codigo_barras;
        document.getElementById('productoNombre').textContent = productoSeleccionado.descripcion || 'Sin descripción';
        document.getElementById('productoStock').textContent = productoSeleccionado.cantidad;
        document.getElementById('productoPrecio').textContent = parseFloat(productoSeleccionado.precio || 0).toFixed(2);
        document.getElementById('ventaPrecio').value = parseFloat(productoSeleccionado.precio || 0).toFixed(2);
        document.getElementById('ventaDescuento').value = 0;
        document.getElementById('ventaDescripcion').value = productoSeleccionado.descripcion || '';
        document.getElementById('ventaCantidad').max = productoSeleccionado.cantidad;
        document.getElementById('resultadosBusqueda').style.display = 'none';
        document.getElementById('infoProducto').style.display = 'block';
        calcularTotalVenta();
    }
}

function calcularTotalVenta() {
    const cantidad = parseInt(document.getElementById('ventaCantidad').value) || 0;
    const precio = parseFloat(document.getElementById('ventaPrecio').value) || 0;
    const descuento = parseFloat(document.getElementById('ventaDescuento').value) || 0;
    const subtotal = cantidad * precio;
    const total = subtotal - descuento;
    document.getElementById('ventaTotal').textContent = `$${Math.max(total, 0).toFixed(2)}`;
}

async function guardarNuevaVenta() {
    if (!productoSeleccionado) {
        showNotification('❌ Primero selecciona un producto', 'error');
        return;
    }
    const cantidad = parseInt(document.getElementById('ventaCantidad').value);
    const precio = parseFloat(document.getElementById('ventaPrecio').value);
    const descuento = parseFloat(document.getElementById('ventaDescuento').value) || 0;
    const descripcion = document.getElementById('ventaDescripcion').value;
    const codigoBarras = productoSeleccionado.codigo_barras;
    if (cantidad <= 0) {
        showNotification('❌ La cantidad debe ser mayor a 0', 'error');
        return;
    }
    if (precio <= 0) {
        showNotification('❌ El precio debe ser mayor a 0', 'error');
        return;
    }
    if (descuento < 0) {
        showNotification('❌ El descuento no puede ser negativo', 'error');
        return;
    }
    const subtotal = cantidad * precio;
    if (descuento > subtotal) {
        showNotification(`❌ El descuento ($${descuento.toFixed(2)}) no puede ser mayor al subtotal ($${subtotal.toFixed(2)})`, 'error');
        return;
    }
    if (cantidad > productoSeleccionado.cantidad) {
        showNotification(`❌ Stock insuficiente. Disponible: ${productoSeleccionado.cantidad}`, 'error');
        return;
    }
    const ventaData = {
        barcode: codigoBarras,
        cantidad: cantidad,
        precio_unitario: precio,
        descuento: descuento,
        descripcion: descripcion || productoSeleccionado.descripcion || '',
        fecha_venta: getHoraChileISO()
    };
    if (!navigator.onLine) {
        if (ventaData.descuento === undefined) {
            ventaData.descuento = descuento || 0;
        }
        guardarVentaOffline(ventaData);
        actualizarInventarioLocal(codigoBarras, -cantidad);
        showNotification('📴 Venta guardada localmente. Se sincronizará cuando haya internet', 'warning');
        closeModal('modalAgregarVenta');
        actualizarVistaInventarioLocal();
        return;
    }
    try {
        const { data: ventaInsertada, error: errorVenta } = await supabaseClient
            .from('ventas_mejoras')
            .insert([ventaData])
            .select();
        if (errorVenta) throw errorVenta;
        const nuevoStock = productoSeleccionado.cantidad - cantidad;
        
        console.log('Cálculo stock nueva venta:', {
            stockInicial: productoSeleccionado.cantidad,
            cantidadVendida: cantidad,
            nuevoStock: nuevoStock
        });
        
        const { error: errorInventario } = await supabaseClient
            .from('inventario_mejoras')
            .update({ 
                cantidad: nuevoStock,
                fecha_actualizacion: getHoraChileISO()
            })
            .eq('barcode', codigoBarras);
        if (errorInventario) throw errorInventario;
        showNotification('✅ Venta MEJORAS registrada correctamente', 'success');
        closeModal('modalAgregarVenta');
        await cargarVentas();
        actualizarFilaInventario(codigoBarras, nuevoStock);
        actualizarEstadisticas();
    } catch (error) {
        console.warn('Error online, guardando offline:', error);
        guardarVentaOffline(ventaData);
        actualizarInventarioLocal(codigoBarras, -cantidad);
        showNotification('⚠️ Error de conexión. Venta guardada localmente', 'warning');
        closeModal('modalAgregarVenta');
        actualizarVistaInventarioLocal();
    }
}

function mostrarReporteEncargos() {
    const encargos = inventario.filter(producto => producto.cantidad < 0);
    if (encargos.length === 0) {
        showNotification('✅ No hay encargos pendientes - MEJORAS', 'success');
        return;
    }
    document.getElementById('total-encargos').textContent = encargos.length;
    const tbody = document.getElementById('lista-encargos');
    tbody.innerHTML = '';
    let totalUnidadesPendientes = 0;
    let inversionTotal = 0;
    encargos.forEach(producto => {
        const cantidadPendiente = Math.abs(producto.cantidad);
        const costoUnitario = parseFloat(producto.costo || 0);
        const costoProducto = cantidadPendiente * costoUnitario;
        totalUnidadesPendientes += cantidadPendiente;
        inversionTotal += costoProducto;
        const row = `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px;"><strong>${producto.codigo_barras}</strong></td>
                <td style="padding: 12px;">${producto.descripcion || '<span style="color: #94a3b8;">Sin descripción</span>'}</td>
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
    const totalRow = `
        <tr style="background: #f8fafc; font-weight: bold;">
            <td style="padding: 12px; color: #475569;" colspan="2">TOTAL GENERAL - MEJORAS</td>
            <td style="padding: 12px; color: #dc2626;">${totalUnidadesPendientes} unidades</td>
            <td style="padding: 12px; color: #dc2626;">
                <div>Inversión total:</div>
                <div style="font-size: 18px;">$${inversionTotal.toFixed(2)}</div>
            </td>
        </tr>
    `;
    tbody.innerHTML += totalRow;
    openModal('modalEncargos');
    showNotification(`💰 Inversión requerida MEJORAS: $${inversionTotal.toFixed(2)} para ${encargos.length} productos`, 'success');
}

function exportToExcel() {
    const tabActiva = document.querySelector('.tab-btn.active').textContent.toLowerCase();
    let data, filename;
    if (tabActiva.includes('inventario')) {
        data = inventario;
        filename = 'inventario_mejoras.xlsx';
    } else {
        data = ventas;
        filename = 'ventas_mejoras.xlsx';
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
                return value;
            });
            csv += row.join(',') + '\n';
        });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    showNotification('Archivo MEJORAS exportado correctamente', 'success');
}
