const SUPABASE_URL = 'https://qnhmfvtqgwtlckcvzbhq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_791W4BHb07AeA_DX2EWZCQ_Fxlzv30o';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let inventario = [];
let ventas = [];
let productoEditando = null;
let currentUser = null;
let inventarioSincronizado = true;

window.cargarDatos = async function() {
    await cargarInventario();
    await cargarVentas();
    actualizarEstadisticas();
    document.getElementById('fecha-hoy').textContent = getFechaActualChile();
    showTab('ventas');
    inventarioSincronizado = true;
    actualizarIndicadorSincronizacion();
};

window.actualizarInventarioCompleto = async function() {
    showNotification('🔄 Recargando inventario completo MEJORAS...', 'info');
    await cargarInventario(true);
    inventarioSincronizado = true;
    actualizarIndicadorSincronizacion();
};

function actualizarIndicadorSincronizacion() {
    const indicador = document.getElementById('sincronizacion-indicador');
    if (!indicador) return;
    
    if (!inventarioSincronizado) {
        indicador.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Inventario parcial';
        indicador.className = 'sync-indicator sync-warning';
    } else {
        indicador.innerHTML = '<i class="fas fa-check-circle"></i> Inventario completo';
        indicador.className = 'sync-indicator sync-success';
    }
}

window.marcarInventarioComoNoSincronizado = function() {
    inventarioSincronizado = false;
    actualizarIndicadorSincronizacion();
}

window.editarInventario = async function(codigo) {
    productoEditando = inventario.find(p => p.codigo_barras === codigo);
    if (!productoEditando) return;
    document.getElementById('editCodigo').value = productoEditando.codigo_barras;
    document.getElementById('editDescripcion').value = productoEditando.descripcion || '';
    document.getElementById('editCantidad').value = productoEditando.cantidad;
    document.getElementById('editCosto').value = productoEditando.costo || 0;
    document.getElementById('editPrecio').value = productoEditando.precio || 0;
    openModal('modalInventario');
};

window.guardarInventario = async function() {
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
            }
            
            await cargarInventario(false);
            
        } else {
            showNotification('❌ Error: ' + (data?.message || 'Desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error actualizando inventario MEJORAS:', error);
        showNotification('❌ Error al actualizar', 'error');
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const headerButtons = document.querySelector('.header-buttons');
    if (headerButtons) {
        const botonRecargaCompleta = document.createElement('button');
        botonRecargaCompleta.id = 'recarga-inventario-btn';
        botonRecargaCompleta.className = 'header-btn warning';
        botonRecargaCompleta.innerHTML = '<i class="fas fa-sync-alt"></i> Recargar Inventario';
        botonRecargaCompleta.addEventListener('click', actualizarInventarioCompleto);
        
        const sincronizacionIndicador = document.createElement('div');
        sincronizacionIndicador.id = 'sincronizacion-indicador';
        sincronizacionIndicador.className = 'sync-indicator sync-success';
        sincronizacionIndicador.innerHTML = '<i class="fas fa-check-circle"></i> Inventario completo';
        sincronizacionIndicador.style.marginLeft = '10px';
        sincronizacionIndicador.style.padding = '8px 15px';
        sincronizacionIndicador.style.borderRadius = '6px';
        sincronizacionIndicador.style.fontSize = '14px';
        sincronizacionIndicador.style.fontWeight = '500';
        
        headerButtons.insertBefore(sincronizacionIndicador, headerButtons.firstChild);
        headerButtons.insertBefore(botonRecargaCompleta, headerButtons.firstChild);
    }
});
