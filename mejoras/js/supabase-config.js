const SUPABASE_URL = 'https://qnhmfvtqgwtlckcvzbhq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_791W4BHb07AeA_DX2EWZCQ_Fxlzv30o';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let inventario = [];
let ventas = [];
let productoEditando = null;
let ventaEditando = null;
let productoSeleccionado = null;
let currentUser = null;
let inventarioNeedsSync = false;

window.cargarDatos = async function() {
    await cargarInventario();
    await cargarVentas();
    actualizarEstadisticas();
    document.getElementById('fecha-hoy').textContent = getFechaActualChile();
    showTab('ventas');
};

window.forzarSincronizacionInventario = async function() {
    if (!navigator.onLine) {
        showNotification('❌ No hay conexión a internet', 'error');
        return;
    }
    
    const boton = document.getElementById('sync-inventario-btn');
    const botonOriginal = boton.innerHTML;
    
    boton.classList.add('sync-loading');
    boton.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizando...';
    boton.disabled = true;
    
    try {
        await cargarInventario();
        showNotification('✅ Inventario sincronizado completamente', 'success');
        actualizarUltimaSincronizacion();
        document.getElementById('inventario-needs-sync').style.display = 'none';
    } catch (error) {
        console.error('Error sincronizando inventario:', error);
        showNotification('❌ Error al sincronizar inventario', 'error');
    } finally {
        boton.classList.remove('sync-loading');
        boton.innerHTML = botonOriginal;
        boton.disabled = false;
    }
};

function actualizarUltimaSincronizacion() {
    const ahora = getHoraChileISO();
    const horaFormateada = formatoHoraCortaChile(ahora);
    const elemento = document.getElementById('last-sync-time');
    if (elemento) {
        elemento.textContent = `Sincronizado: ${horaFormateada}`;
    }
    localStorage.setItem('ultimaSincronizacion', ahora);
}
