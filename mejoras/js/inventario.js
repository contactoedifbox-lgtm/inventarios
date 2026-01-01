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
        document.getElementById('inventarioSincronizado').style.display = 'block';
        document.getElementById('inventarioNoSincronizado').style.display = 'none';
    } catch (error) {
        console.error('Error cargando inventario MEJORAS:', error);
        showNotification('Error al cargar inventario MEJORAS', 'error');
    }
}

async function actualizarFilaInventario(codigo) {
    try {
        const { data, error } = await supabaseClient
            .from('vista_inventario_mejoras')
            .select('*')
            .eq('codigo_barras', codigo)
            .single();
        
        if (error) throw error;
        
        const index = inventario.findIndex(p => p.codigo_barras === codigo);
        if (index !== -1) {
            inventario[index] = data;
            actualizarFilaTabla(data);
        } else {
            inventario.push(data);
            mostrarInventario(inventario);
        }
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error actualizando fila inventario:', error);
    }
}

function actualizarFilaTabla(producto) {
    const tbody = document.getElementById('inventarioBody');
    const rows = tbody.getElementsByTagName('tr');
    
    for (let row of rows) {
        const codigoCell = row.cells[0];
        if (codigoCell && codigoCell.textContent.trim() === producto.codigo_barras) {
            const stockBadge = getStockBadge(producto.cantidad);
            const fecha = formatoHoraChile(producto.fecha_actualizacion);
            
            row.cells[2].innerHTML = `<span class="stock-badge ${stockBadge.class}">${producto.cantidad} unidades</span>`;
            row.cells[5].textContent = fecha;
            
            document.getElementById('inventarioSincronizado').style.display = 'none';
            document.getElementById('inventarioNoSincronizado').style.display = 'block';
            return;
        }
    }
}

function mostrarInventario(data) {
    const tbody = document.getElementById('inventarioBody');
    tbody.innerHTML = '';
    data.forEach(item => {
        const stockBadge = getStockBadge(item.cantidad);
        const fecha = formatoHoraChile(item.fecha_actualizacion);
        const row = `
            <tr>
                <td><strong>${item.codigo_barras}</strong></td>
                <td>${item.descripcion || '<span style="color: #94a3b8;">Sin descripción</span>'}</td>
                <td><span class="stock-badge ${stockBadge.class}">${item.cantidad} unidades</span></td>
                <td>$${parseFloat(item.costo || 0).toFixed(2)}</td>
                <td><strong>$${parseFloat(item.precio || 0).toFixed(2)}</strong></td>
                <td>${fecha}</td>
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
    document.querySelectorAll('#inventarioBody .btn-edit').forEach(button => {
        button.addEventListener('click', function() {
            const codigo = this.getAttribute('data-codigo');
            editarInventario(codigo);
        });
    });
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
            await actualizarFilaInventario(productoEditando.codigo_barras);
        } else {
            showNotification('❌ Error: ' + (data?.message || 'Desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error actualizando inventario MEJORAS:', error);
        showNotification('❌ Error al actualizar', 'error');
    }
}
