const SUPABASE_URL = 'https://qnhmfvtqgwtlckcvzbhq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_791W4BHb07AeA_DX2EWZCQ_Fxlzv30o';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let inventario = [];
let ventas = [];
let productoEditando = null;
let ventaEditando = null;
let productoSeleccionado = null;
let currentUser = null;

window.cargarDatos = async function() {
    await cargarInventario();
    await cargarVentas();
    actualizarEstadisticas();
    document.getElementById('fecha-hoy').textContent = getFechaActualChile();
    showTab('ventas');
};

window.actualizarFilaInventario = async function(codigo) {
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
};

window.actualizarFilaTabla = function(producto) {
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
};
