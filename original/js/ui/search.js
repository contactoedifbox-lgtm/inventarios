import { StateManager } from '../config/supabase-config.js';
import { displayInventory, displayDetailedSales } from '../modules/inventario.js';

export function setupTabNavigation() {
    const inventarioBtn = document.getElementById('tab-inventario-btn');
    const ventasBtn = document.getElementById('tab-ventas-btn');
    
    if (inventarioBtn) {
        inventarioBtn.addEventListener('click', () => showTab('inventario'));
    }
    
    if (ventasBtn) {
        ventasBtn.addEventListener('click', () => showTab('ventas'));
    }
}

export function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    if (tabName === 'ventas') {
        document.getElementById('tab-ventas-btn').classList.add('active');
    } else {
        document.getElementById('tab-inventario-btn').classList.add('active');
    }
}

export function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filterTable(e.target.value);
        });
    }
}

function filterTable(termino) {
    const tabActiva = document.querySelector('.tab-btn.active').textContent.toLowerCase();
    
    if (tabActiva.includes('inventario')) {
        const inventario = StateManager.getInventario();
        const filtrados = inventario.filter(item =>
            item.codigo_barras.toLowerCase().includes(termino.toLowerCase()) ||
            (item.descripcion && item.descripcion.toLowerCase().includes(termino.toLowerCase()))
        );
        displayInventory(filtrados);
    } else {
        const ventas = StateManager.ventas;
        const filtrados = ventas.filter(item =>
            (item.barcode && item.barcode.toLowerCase().includes(termino.toLowerCase())) ||
            (item.codigo_barras && item.codigo_barras.toLowerCase().includes(termino.toLowerCase())) ||
            (item.descripcion && item.descripcion.toLowerCase().includes(termino.toLowerCase()))
        );
        displayDetailedSales(filtrados);
    }
}
