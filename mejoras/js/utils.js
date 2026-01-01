function getHoraChileISO() {
    const ahora = new Date();
    const offset = -3;
    const horaChile = new Date(ahora.getTime() + offset * 60 * 60 * 1000);
    return horaChile.toISOString();
}

function formatoHoraChile(fechaString) {
    if (!fechaString) return 'Sin fecha';
    try {
        let fecha = new Date(fechaString);
        if (isNaN(fecha.getTime())) return 'Fecha inválida';
        const offset = 0;
        fecha = new Date(fecha.getTime() + offset * 60 * 60 * 1000);
        const dia = fecha.getDate().toString().padStart(2, '0');
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const año = fecha.getFullYear();
        const hora = fecha.getHours().toString().padStart(2, '0');
        const minutos = fecha.getMinutes().toString().padStart(2, '0');
        const segundos = fecha.getSeconds().toString().padStart(2, '0');
        return `${dia}/${mes}/${año} ${hora}:${minutos}:${segundos}`;
    } catch (error) {
        return fechaString || 'Sin fecha';
    }
}

function formatoHoraCortaChile(fechaString) {
    if (!fechaString) return '--:--';
    try {
        let fecha = new Date(fechaString);
        if (isNaN(fecha.getTime())) return '--:--';
        const offset = 0;
        fecha = new Date(fecha.getTime() + offset * 60 * 60 * 1000);
        return `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
    } catch (error) {
        return '--:--';
    }
}

function getFechaActualChile() {
    const ahora = new Date();
    const offset = -3;
    const fechaChile = new Date(ahora.getTime() + offset * 60 * 60 * 1000);
    const opciones = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'America/Santiago'
    };
    return fechaChile.toLocaleDateString('es-CL', opciones);
}

function getFechaHoyChile() {
    const ahora = new Date();
    const offset = -3;
    const fechaChile = new Date(ahora.getTime() + offset * 60 * 60 * 1000);
    const año = fechaChile.getFullYear();
    const mes = (fechaChile.getMonth() + 1).toString().padStart(2, '0');
    const dia = fechaChile.getDate().toString().padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

function getStockBadge(cantidad) {
    if (cantidad <= 5) return { class: 'stock-low', text: 'Muy Bajo' };
    if (cantidad <= 10) return { class: 'stock-medium', text: 'Bajo' };
    return { class: 'stock-good', text: 'Disponible' };
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (tabName === 'ventas') {
        document.getElementById('tab-ventas-btn').classList.add('active');
    } else {
        document.getElementById('tab-inventario-btn').classList.add('active');
    }
}

function filtrarTabla(termino) {
    const tabActiva = document.querySelector('.tab-btn.active').textContent.toLowerCase();
    if (tabActiva.includes('inventario')) {
        const filtrados = inventario.filter(item =>
            item.codigo_barras.toLowerCase().includes(termino.toLowerCase()) ||
            (item.descripcion && item.descripcion.toLowerCase().includes(termino.toLowerCase()))
        );
        mostrarInventario(filtrados);
    } else {
        const filtrados = ventas.filter(item =>
            item.codigo_barras.toLowerCase().includes(termino.toLowerCase()) ||
            (item.descripcion && item.descripcion.toLowerCase().includes(termino.toLowerCase()))
        );
        mostrarVentas(filtrados);
    }
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    productoEditando = null;
    ventaEditando = null;
    productoSeleccionado = null;
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 3000);
}

function actualizarEstadoSistema() {
    const estadoElemento = document.getElementById('estado-sistema');
    if (navigator.onLine) {
        estadoElemento.textContent = 'Online';
        estadoElemento.style.color = '#10b981';
    } else {
        estadoElemento.textContent = 'Offline';
        estadoElemento.style.color = '#f59e0b';
    }
}

function actualizarFechaHoyCorta() {
    const hoy = new Date();
    const dia = hoy.getDate().toString().padStart(2, '0');
    const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
    document.getElementById('fecha-hoy-corta').textContent = `${dia}/${mes}`;
}
