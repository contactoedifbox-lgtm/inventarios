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
    await cargarInventario();
    showNotification('✅ Inventario sincronizado completamente', 'success');
};
