async function cargarInventario() {
    try {
        showNotification('Cargando inventario MEJORAS...', 'info');
        const { data, error } = await supabaseClient
            .from('vista_inventario_mejoras')
            .select('*')
            .order('fecha_actualizacion', { ascending: false });
        if (error) throw error;
        inventario = data;
        mostrarInventario(inventario);
        showNotification('Inventario MEJORAS cargado', 'success');
        document.getElementById('inventario-needs-sync').style.display = 'none';
    } catch (error) {
        console.error('Error cargando inventario MEJORAS:', error);
        showNotification('Error al cargar inventario MEJORAS', 'error');
    }
}

function mostrarInventario(data) {
    const tbody = document.getElementById('inventarioBody');
    tbody.innerHTML = '';
    data.forEach(item => {
        const stockBadge = getStockBadge(item.cantidad);
        const fecha = formatoHoraChile(item.fecha_actualizacion);
        const row = `
            <tr data-codigo="${item.codigo_barras}">
                <td><strong>${item.codigo_barras}</strong></td>
                <td>${item.descripcion || '<span style="color: #94a3b8;">Sin descripción</span>'}</td>
                <td><span class="stock-badge ${stockBadge.class}">${item.cantidad} unidades</span></td>
                <td>$${parseFloat(item.costo || 0).toFixed(2)}</td>
                <td><strong>$${parseFloat(item.precio || 0).toFixed(2)}</strong></td>
                <td class="fecha-actualizacion">${fecha}</td>
                <td>
                    <button class="action-btn btn-edit" data-codigo="${item.codigo_barras}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
    document.getElementById('total-productos').textContent = data.length;
    document.getElementById('inventario-needs-sync').style.display = 'none';
    document.querySelectorAll('#inventarioBody .btn-edit').forEach(button => {
        button.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            editarInventario(codigo);
        });
    });
}

async function editarInventario(codigo) {
    productoEditando = inventario.find(p => p.codigo_barras === codigo);
    if (!productoEditando) return;
    document.getElementById('editCodigo').value = productoEditando.codigo_barras;
    document.getElementById('editDescripcion').value = productoEditando.descripcion || '';
    document.getElementById('editCantidad').value = productoEditando.cantidad;
    document.getElementById('editCosto').value = productoEditando.costo || 0;
    document.getElementById('editPrecio').value = productoEditando.precio || 0;
    openModal('modalInventario');
}

async function guardarInventario() {
    const descripcion = document.getElementById('editDescripcion').value;
    const cantidad = parseInt(document.getElementById('editCantidad').value);
    const costo = parseFloat(document.getElementById('editCosto').value);
    const precio = parseFloat(document.getElementById('editPrecio').value);
    try {
        const { data, error } = await supabaseClient.rpc('editar_inventario_mejoras', {
            p_barcode: productoEditando.codigo_barras,
            p_descripcion: descripcion,
            p_cantidad: cantidad,
            p_costo: costo,
            p_precio: precio
        });
        if (error) throw error;
        if (data && data.success) {
            showNotification('✅ Producto actualizado', 'success');
            closeModal('modalInventario');
            cargarDatos();
        } else {
            showNotification('❌ Error: ' + (data?.message || 'Desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error actualizando inventario MEJORAS:', error);
        showNotification('❌ Error al actualizar', 'error');
    }
}

function actualizarEstadisticas() {
    const stockBajo = inventario.filter(p => p.cantidad < 10).length;
    document.getElementById('stock-bajo').textContent = stockBajo;
    if (inventario.length > 0 && inventario[0].fecha_actualizacion) {
        const hora = formatoHoraCortaChile(inventario[0].fecha_actualizacion);
        document.getElementById('ultima-actualizacion').textContent = hora;
    }
}
