window.editarInventario = async function(codigo) {
    console.log('editando inventario, codigo:', codigo);
    console.log('inventario array length:', inventario.length);
    console.log('inventario array:', inventario);
    
    window.productoEditando = inventario.find(p => p.codigo_barras === codigo);
    
    console.log('producto encontrado:', window.productoEditando);
    
    if (!window.productoEditando) {
        console.error('Producto no encontrado en inventario. Código:', codigo);
        showNotification('❌ Producto no encontrado en el inventario local', 'error');
        return;
    }
    
    document.getElementById('editCodigo').value = window.productoEditando.codigo_barras;
    document.getElementById('editDescripcion').value = window.productoEditando.descripcion || '';
    document.getElementById('editCantidad').value = window.productoEditando.cantidad;
    document.getElementById('editCosto').value = window.productoEditando.costo || 0;
    document.getElementById('editPrecio').value = window.productoEditando.precio || 0;
    
    openModal('modalInventario');
};

window.guardarInventario = async function() {
    console.log('=== INICIANDO guardarInventario ===');
    console.log('window.productoEditando:', window.productoEditando);
    
    if (!window.productoEditando || !window.productoEditando.codigo_barras) {
        showNotification('❌ Error: No hay producto seleccionado o el producto no tiene código', 'error');
        console.error('Error crítico - productoEditando:', window.productoEditando);
        return;
    }
    
    const descripcion = document.getElementById('editDescripcion').value;
    const cantidad = parseInt(document.getElementById('editCantidad').value);
    const costo = parseFloat(document.getElementById('editCosto').value);
    const precio = parseFloat(document.getElementById('editPrecio').value);
    
    console.log('Datos a guardar:', {
        codigo: window.productoEditando.codigo_barras,
        descripcion,
        cantidad,
        costo,
        precio
    });
    
    try {
        const { data, error } = await supabaseClient.rpc('editar_inventario_mejoras', {
            p_barcode: window.productoEditando.codigo_barras,
            p_descripcion: descripcion,
            p_cantidad: cantidad,
            p_costo: costo,
            p_precio: precio
        });
        
        if (error) throw error;
        
        if (data && data.success) {
            showNotification('✅ Producto actualizado', 'success');
            closeModal('modalInventario');
            
            // Actualizar el array local de inventario
            const productoIndex = inventario.findIndex(p => p.codigo_barras === window.productoEditando.codigo_barras);
            console.log('Índice encontrado en inventario:', productoIndex);
            
            if (productoIndex !== -1) {
                inventario[productoIndex].descripcion = descripcion;
                inventario[productoIndex].cantidad = cantidad;
                inventario[productoIndex].costo = costo;
                inventario[productoIndex].precio = precio;
                inventario[productoIndex].fecha_actualizacion = new Date().toISOString();
                
                console.log('Inventario actualizado localmente:', inventario[productoIndex]);
            }
            
            // Recargar la vista
            await cargarInventario(false);
            window.productoEditando = null;
            
        } else {
            showNotification('❌ Error: ' + (data?.message || 'Desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error completo actualizando inventario MEJORAS:', error);
        showNotification('❌ Error al actualizar: ' + error.message, 'error');
    }
};
