const SUPABASE_URL = 'https://qnhmfvtqgwtlckcvzbhq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_791W4BHb07AeA_DX2EWZCQ_Fxlzv30o';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let inventario = [];
let ventas = [];
let productoEditando = null;
let ventaEditando = null;
let productoSeleccionado = null;
let currentUser = null;
let inventarioSincronizado = true;

window.cargarDatos = async function() {
    await cargarInventario(true);
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
