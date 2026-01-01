async function cargarInventario(forzarCompleto = false) {
    try {
        if (forzarCompleto) {
            showNotification('🔄 Cargando inventario COMPLETO MEJORAS...', 'info');
        } else {
            showNotification('🔄 Actualizando inventario MEJORAS...', 'info');
        }
        
        let query = supabaseClient
            .from('vista_inventario_mejoras')
            .select('*');
            
        if (!forzarCompleto && inventario.length > 0) {
            const ultimaActualizacion = inventario.length > 0 ? 
                Math.max(...inventario.map(p => new Date(p.fecha_actualizacion || 0).getTime())) : 0;
            
            const fechaLimite = new Date(ultimaActualizacion - 5 * 60 * 1000).toISOString();
            query = query.gte('fecha_actualizacion', fechaLimite);
        }
        
        const { data, error } = await query.order('fecha_actualizacion', { ascending: false });
        
        if (error) throw error;
        
        if (forzarCompleto) {
            inventario = data;
            mostrarInventario(inventario);
        } else {
            actualizarInventarioIncremental(data);
        }
        
        showNotification('✅ Inventario MEJORAS actualizado', 'success');
        
    } catch (error) {
        console.error('Error cargando inventario MEJORAS:', error);
        showNotification('Error al cargar inventario MEJORAS', 'error');
    }
}

function mostrarInventario(data, actualizarSoloFila = null) {
    const tbody = document.getElementById('inventarioBody');
    
    if (actualizarSoloFila) {
        const filas = tbody.getElementsByTagName('tr');
        for (let fila of filas) {
            const codigoCelda = fila.cells[0].textContent.trim();
            if (codigoCelda === actualizarSoloFila.codigo_barras) {
                const stockBadge = getStockBadge(actualizarSoloFila.cantidad);
                const fecha = formatoHoraChile(actualizarSoloFila.fecha_actualizacion);
                
                fila.cells[1].innerHTML = actualizarSoloFila.descripcion || '<span style="color: #94a3b8;">Sin descripción</span>';
                fila.cells[2].innerHTML = `<span class="stock-badge ${stockBadge.class}">${actualizarSoloFila.cantidad} unidades</span>`;
                fila.cells[3].textContent = `$${parseFloat(actualizarSoloFila.costo || 0).toFixed(2)}`;
                fila.cells[4].innerHTML = `<strong>$${parseFloat(actualizarSoloFila.precio || 0).toFixed(2)}</strong>`;
                fila.cells[5].textContent = fecha;
                return;
            }
        }
    } else {
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
        
        document.querySelectorAll('#inventarioBody .btn-edit').forEach(button => {
            button.addEventListener('click', function() {
                const codigo = this.getAttribute('data-codigo');
                editarInventario(codigo);
            });
        });
    }
    
    document.getElementById('total-productos').textContent = inventario.length;
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
        } else {
            inventario.push(data);
        }
        
        mostrarInventario([data], true);
        actualizarEstadisticas();
        
    } catch (error) {
        console.error('Error actualizando fila de inventario:', error);
    }
}

function actualizarInventarioIncremental(nuevosDatos) {
    if (!nuevosDatos || nuevosDatos.length === 0) return;
    
    nuevosDatos.forEach(nuevoItem => {
        const index = inventario.findIndex(p => p.codigo_barras === nuevoItem.codigo_barras);
        if (index !== -1) {
            inventario[index] = nuevoItem;
            mostrarInventario([nuevoItem], true);
        } else {
            inventario.push(nuevoItem);
            mostrarInventario([nuevoItem], true);
        }
    });
    
    actualizarEstadisticas();
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
            
            const productoIndex = inventario.findIndex(p => p.codigo_barras === productoEditando.codigo_barras);
            if (productoIndex !== -1) {
                inventario[productoIndex].descripcion = descripcion;
                inventario[productoIndex].cantidad = cantidad;
                inventario[productoIndex].costo = costo;
                inventario[productoIndex].precio = precio;
                inventario[productoIndex].fecha_actualizacion = new Date().toISOString();
                
                mostrarInventario([inventario[productoIndex]], true);
            }
            
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
