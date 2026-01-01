document.addEventListener('DOMContentLoaded', function() {
    // Cargar última sincronización al iniciar
    const ultimaSync = localStorage.getItem('ultimaSincronizacion');
    if (ultimaSync) {
        const hora = formatoHoraCortaChile(ultimaSync);
        const elemento = document.getElementById('last-sync-time');
        if (elemento) {
            elemento.textContent = `Última sinc.: ${hora}`;
        }
    }
    
    document.getElementById('searchInput').addEventListener('input', function(e) {
        filtrarTabla(e.target.value);
    });
    document.getElementById('login-button').addEventListener('click', loginUser);
    document.getElementById('login-password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') loginUser();
    });
    document.getElementById('logout-button').addEventListener('click', logoutUser);
    document.getElementById('tab-inventario-btn').addEventListener('click', () => showTab('inventario'));
    document.getElementById('tab-ventas-btn').addEventListener('click', () => showTab('ventas'));
    document.getElementById('agregar-venta-btn').addEventListener('click', abrirAgregarVenta);
    document.getElementById('exportar-excel-btn').addEventListener('click', exportToExcel);
    document.getElementById('reporte-encargos-btn').addEventListener('click', mostrarReporteEncargos);
    document.getElementById('close-modal-inventario').addEventListener('click', () => closeModal('modalInventario'));
    document.getElementById('close-modal-venta').addEventListener('click', () => closeModal('modalVenta'));
    document.getElementById('close-modal-agregar-venta').addEventListener('click', () => closeModal('modalAgregarVenta'));
    document.getElementById('cancel-inventario').addEventListener('click', () => closeModal('modalInventario'));
    document.getElementById('cancel-venta').addEventListener('click', () => closeModal('modalVenta'));
    document.getElementById('cancel-agregar-venta').addEventListener('click', () => closeModal('modalAgregarVenta'));
    document.getElementById('close-modal-encargos').addEventListener('click', () => closeModal('modalEncargos'));
    document.getElementById('cancel-encargos').addEventListener('click', () => closeModal('modalEncargos'));
    document.getElementById('save-inventario').addEventListener('click', guardarInventario);
    document.getElementById('save-venta').addEventListener('click', guardarVenta);
    document.getElementById('save-agregar-venta').addEventListener('click', guardarNuevaVenta);
    document.getElementById('ventaCantidad').addEventListener('input', calcularTotalVenta);
    document.getElementById('ventaPrecio').addEventListener('input', calcularTotalVenta);
    document.getElementById('ventaDescuento').addEventListener('input', calcularTotalVenta);
    document.getElementById('buscarProducto').addEventListener('input', buscarProductos);
    document.getElementById('editVentaCantidad').addEventListener('input', calcularNuevoTotalConDescuento);
    document.getElementById('editVentaDescuento').addEventListener('input', calcularNuevoTotalConDescuento);
    window.addEventListener('online', function() {
        showNotification('🌐 Conexión a internet restablecida', 'success');
        setTimeout(sincronizarVentasPendientes, 3000);
    });
    window.addEventListener('offline', function() {
        showNotification('📴 Modo offline activado. Las ventas se guardarán localmente', 'warning');
    });
    document.getElementById('offlineBadge').addEventListener('click', sincronizarVentasPendientes);
    actualizarBadgeOffline();
    if (navigator.onLine) {
        setTimeout(sincronizarVentasPendientes, 2000);
    }
    setInterval(function() {
        if (document.getElementById('modalAgregarVenta').style.display === 'flex') {
            document.getElementById('fechaVentaActual').textContent = getFechaActualChile();
        }
    }, 60000);
    checkAuth();
});
