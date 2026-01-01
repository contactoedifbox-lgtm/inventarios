async function cargarInventario(forzarCompleto = false) {
    console.log('=== cargarInventario llamado ===', { forzarCompleto, inventarioLength: inventario.length });
    
    try {
        if (forzarCompleto || inventario.length === 0) {
            console.log('Haciendo carga COMPLETA de inventario');
            showNotification('🔄 Cargando inventario COMPLETO MEJORAS...', 'info');
            
            const { data, error } = await supabaseClient
                .from('vista_inventario_mejoras')
                .select('*')
                .order('fecha_actualizacion', { ascending: false });
                
            if (error) throw error;
            
            console.log('Datos recibidos de Supabase:', data.length, 'productos');
            inventario = data;
            mostrarInventario(inventario);
            showNotification(`✅ Inventario MEJORAS cargado (${data.length} productos)`, 'success');
            inventarioSincronizado = true;
            
        } else {
            showNotification('🔄 Actualizando inventario MEJORAS...', 'info');
            
            const ultimaActualizacion = Math.max(...inventario.map(p => new Date(p.fecha_actualizacion || 0).getTime()));
            const fechaLimite = new Date(ultimaActualizacion - 5 * 60 * 1000).toISOString();
            
            const { data, error } = await supabaseClient
                .from('vista_inventario_mejoras')
                .select('*')
                .gte('fecha_actualizacion', fechaLimite)
                .order('fecha_actualizacion', { ascending: false });
                
            if (error) throw error;
            
            if (data.length > 0) {
                actualizarInventarioIncremental(data);
                showNotification(`✅ Inventario MEJORAS actualizado (${data.length} productos modificados)`, 'success');
                marcarInventarioComoNoSincronizado();
            } else {
                showNotification('✅ Inventario MEJORAS ya está actualizado', 'success');
            }
        }
        
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
            // Verifica que la función exista antes de llamarla
            if (window.editarInventario && typeof window.editarInventario === 'function') {
                window.editarInventario(codigo);
            } else {
                console.error('Error: editarInventario no está disponible');
                showNotification('Error: Función no disponible. Recarga la página.', 'error');
            }
        });
    });
    
    document.getElementById('total-productos').textContent = inventario.length;
}

function actualizarInventarioIncremental(nuevosDatos) {
    if (!nuevosDatos || nuevosDatos.length === 0) return;
    
    nuevosDatos.forEach(nuevoItem => {
        const index = inventario.findIndex(p => p.codigo_barras === nuevoItem.codigo_barras);
        if (index !== -1) {
            inventario[index] = nuevoItem;
        } else {
            inventario.push(nuevoItem);
        }
    });
    
    mostrarInventario(inventario);
    actualizarEstadisticas();
}

function actualizarEstadisticas() {
    const stockBajo = inventario.filter(p => p.cantidad < 10).length;
    document.getElementById('stock-bajo').textContent = stockBajo;
    if (inventario.length > 0 && inventario[0].fecha_actualizacion) {
        const hora = formatoHoraCortaChile(inventario[0].fecha_actualizacion);
        document.getElementById('ultima-actualizacion').textContent = hora;
    }
}
