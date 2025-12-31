/* ============================================
   APLICACIÓN PRINCIPAL - VERSIÓN COMPLETA CSP-SEGURA
   ============================================
   Punto de entrada principal de la aplicación
   Versión corregida para evitar problemas de CSP
   ============================================ */

// ============================================
// CONFIGURACIÓN GLOBAL DE LA APLICACIÓN
// ============================================

let veterinariaAppInstance = null;

class VeterinariaApp {
    constructor() {
        this.appName = 'Sistema de Inventario Veterinaria - MEJORAS';
        this.version = '1.0.0';
        this.modules = {};
        this.isInitialized = false;
        
        // Variables globales compartidas
        this.globals = {
            inventario: [],
            ventas: [],
            productoEditando: null,
            ventaEditando: null,
            productoSeleccionado: null
        };
    }

    /**
     * Inicializa la aplicación completa
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('⚠️ La aplicación ya está inicializada');
            return;
        }
        
        console.log(`🚀 Iniciando ${this.appName} v${this.version}...`);
        
        try {
            // 1. Inicializar módulos en orden
            await this.initializeModules();
            
            // 2. Configurar event listeners globales
            this.setupGlobalEventListeners();
            
            // 3. Configurar manejo de errores global
            this.setupErrorHandling();
            
            // 4. Verificar estado inicial
            await this.checkInitialState();
            
            // 5. Configurar actualizaciones automáticas
            this.setupAutoUpdates();
            
            this.isInitialized = true;
            console.log('✅ Aplicación inicializada correctamente');
            
            // Mostrar mensaje de bienvenida
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('❌ Error al inicializar la aplicación:', error);
            this.handleFatalError(error);
        }
    }

    // ============================================
    // INICIALIZACIÓN DE MÓDULOS
    // ============================================

    /**
     * Inicializa todos los módulos en orden
     */
    async initializeModules() {
        console.log('🔧 Inicializando módulos...');
        
        // 1. Configuración de Supabase (ya está auto-inicializado)
        console.log('✅ Supabase configurado');
        
        // 2. Utils (ya está disponible globalmente)
        console.log('✅ Utils disponibles');
        
        // 3. Sistema de notificaciones
        this.modules.notifications = window.notifications?.initialize();
        console.log('🔔 Notificaciones inicializadas');
        
        // 4. Autenticación
        this.modules.auth = window.auth;
        await this.waitForAuth();
        console.log('🔐 Autenticación verificada');
        
        // 5. Manager de modales
        this.modules.modalManager = window.modalManager?.initialize();
        console.log('🎪 Manager de modales inicializado');
        
        // 6. Renderizador de tablas
        this.modules.tableRenderer = window.tableRenderer?.initialize();
        console.log('📊 Renderizador de tablas inicializado');
        
        // 7. Manager de búsqueda
        this.modules.searchManager = window.searchManager?.initialize();
        console.log('🔍 Manager de búsqueda inicializado');
        
        // 8. Módulo de inventario
        this.modules.inventory = window.inventory;
        console.log('📦 Módulo de inventario listo');
        
        // 9. Módulo de ventas
        this.modules.sales = window.sales;
        console.log('💰 Módulo de ventas listo');
        
        // 10. Módulo de sincronización
        this.modules.sync = window.sync;
        console.log('🔄 Módulo de sincronización listo');
        
        console.log('✅ Todos los módulos inicializados');
    }

    /**
     * Espera a que la autenticación esté lista
     */
    async waitForAuth() {
        return new Promise((resolve) => {
            const checkAuth = () => {
                if (window.auth && window.auth.isAuthenticated) {
                    resolve();
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            checkAuth();
        });
    }

    // ============================================
    // CONFIGURACIÓN DE EVENT LISTENERS
    // ============================================

    /**
     * Configura event listeners globales
     */
    setupGlobalEventListeners() {
        console.log('🎮 Configurando event listeners globales...');
        
        // ========== LOGIN ==========
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', () => {
                this.handleLogin();
            });
        }
        
        const loginPassword = document.getElementById('login-password');
        if (loginPassword) {
            loginPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
        
        // ========== LOGOUT ==========
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // ========== TABS ==========
        const tabInventarioBtn = document.getElementById('tab-inventario-btn');
        const tabVentasBtn = document.getElementById('tab-ventas-btn');
        
        if (tabInventarioBtn) {
            tabInventarioBtn.addEventListener('click', () => {
                this.switchTab('inventario');
            });
        }
        
        if (tabVentasBtn) {
            tabVentasBtn.addEventListener('click', () => {
                this.switchTab('ventas');
            });
        }
        
        // ========== BOTONES PRINCIPALES ==========
        const agregarVentaBtn = document.getElementById('agregar-venta-btn');
        if (agregarVentaBtn) {
            agregarVentaBtn.addEventListener('click', () => {
                this.handleAgregarVenta();
            });
        }
        
        const exportarExcelBtn = document.getElementById('exportar-excel-btn');
        if (exportarExcelBtn) {
            exportarExcelBtn.addEventListener('click', () => {
                this.handleExportExcel();
            });
        }
        
        const reporteEncargosBtn = document.getElementById('reporte-encargos-btn');
        if (reporteEncargosBtn) {
            reporteEncargosBtn.addEventListener('click', () => {
                this.handleReporteEncargos();
            });
        }
        
        // ========== BÚSQUEDA ==========
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e);
            });
        }
        
        // ========== MODALES ==========
        this.setupModalEventListeners();
        
        // ========== CONEXIÓN ==========
        window.addEventListener('online', () => {
            this.handleOnlineStatus();
        });
        
        window.addEventListener('offline', () => {
            this.handleOfflineStatus();
        });
        
        // ========== ATAJOS DE TECLADO ==========
        this.setupKeyboardShortcuts();
        
        console.log('✅ Event listeners configurados');
    }

    /**
     * Configura event listeners para modales
     */
    setupModalEventListeners() {
        // Modal Inventario
        const closeModalInventario = document.getElementById('close-modal-inventario');
        const cancelInventario = document.getElementById('cancel-inventario');
        const saveInventario = document.getElementById('save-inventario');
        
        if (closeModalInventario) {
            closeModalInventario.addEventListener('click', () => {
                this.closeModal('modalInventario');
            });
        }
        if (cancelInventario) {
            cancelInventario.addEventListener('click', () => {
                this.closeModal('modalInventario');
            });
        }
        if (saveInventario) {
            saveInventario.addEventListener('click', () => {
                this.handleSaveInventario();
            });
        }
        
        // Modal Venta
        const closeModalVenta = document.getElementById('close-modal-venta');
        const cancelVenta = document.getElementById('cancel-venta');
        const saveVenta = document.getElementById('save-venta');
        
        if (closeModalVenta) {
            closeModalVenta.addEventListener('click', () => {
                this.closeModal('modalVenta');
            });
        }
        if (cancelVenta) {
            cancelVenta.addEventListener('click', () => {
                this.closeModal('modalVenta');
            });
        }
        if (saveVenta) {
            saveVenta.addEventListener('click', () => {
                this.handleSaveVenta();
            });
        }
        
        // Modal Agregar Venta
        const closeModalAgregarVenta = document.getElementById('close-modal-agregar-venta');
        const cancelAgregarVenta = document.getElementById('cancel-agregar-venta');
        const saveAgregarVenta = document.getElementById('save-agregar-venta');
        
        if (closeModalAgregarVenta) {
            closeModalAgregarVenta.addEventListener('click', () => {
                this.closeModal('modalAgregarVenta');
            });
        }
        if (cancelAgregarVenta) {
            cancelAgregarVenta.addEventListener('click', () => {
                this.closeModal('modalAgregarVenta');
            });
        }
        if (saveAgregarVenta) {
            saveAgregarVenta.addEventListener('click', () => {
                this.handleSaveNuevaVenta();
            });
        }
        
        // Modal Encargos
        const closeModalEncargos = document.getElementById('close-modal-encargos');
        const cancelEncargos = document.getElementById('cancel-encargos');
        
        if (closeModalEncargos) {
            closeModalEncargos.addEventListener('click', () => {
                this.closeModal('modalEncargos');
            });
        }
        if (cancelEncargos) {
            cancelEncargos.addEventListener('click', () => {
                this.closeModal('modalEncargos');
            });
        }
        
        // Eventos en tiempo real para modales
        this.setupModalRealTimeEvents();
    }

    /**
     * Configura eventos en tiempo real para modales
     */
    setupModalRealTimeEvents() {
        // Actualizar total en modal de editar venta
        const editVentaCantidad = document.getElementById('editVentaCantidad');
        const editVentaDescuento = document.getElementById('editVentaDescuento');
        
        if (editVentaCantidad) {
            editVentaCantidad.addEventListener('input', () => {
                this.calcularTotalVentaEdicion();
            });
        }
        if (editVentaDescuento) {
            editVentaDescuento.addEventListener('input', () => {
                this.calcularTotalVentaEdicion();
            });
        }
        
        // Actualizar total en modal de nueva venta
        const ventaCantidad = document.getElementById('ventaCantidad');
        const ventaPrecio = document.getElementById('ventaPrecio');
        const ventaDescuento = document.getElementById('ventaDescuento');
        
        if (ventaCantidad) {
            ventaCantidad.addEventListener('input', () => {
                this.calcularTotalNuevaVenta();
            });
        }
        if (ventaPrecio) {
            ventaPrecio.addEventListener('input', () => {
                this.calcularTotalNuevaVenta();
            });
        }
        if (ventaDescuento) {
            ventaDescuento.addEventListener('input', () => {
                this.calcularTotalNuevaVenta();
            });
        }
        
        // Búsqueda en modal de agregar venta
        const buscarProducto = document.getElementById('buscarProducto');
        if (buscarProducto) {
            buscarProducto.addEventListener('input', () => {
                this.handleBuscarProducto();
            });
        }
    }

    /**
     * Configura atajos de teclado
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Solo si no estamos en un input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Ctrl/Cmd + N: Nueva venta
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.handleAgregarVenta();
            }
            
            // Ctrl/Cmd + E: Exportar
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.handleExportExcel();
            }
            
            // Ctrl/Cmd + F: Buscar
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.focusSearch();
            }
            
            // Ctrl/Cmd + R: Recargar
            if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey) {
                e.preventDefault();
                this.refreshData();
            }
            
            // Ctrl/Cmd + L: Logout
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.handleLogout();
            }
            
            // Escape: Cerrar modales
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // F1: Ayuda
            if (e.key === 'F1') {
                e.preventDefault();
                this.showHelp();
            }
        });
    }

    // ============================================
    // MANEJO DE EVENTOS PRINCIPALES
    // ============================================

    /**
     * Maneja el login
     */
    async handleLogin() {
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        
        if (!email || !password) {
            this.showNotification('Por favor ingresa email y contraseña', 'error');
            return;
        }
        
        if (window.auth && window.auth.loginUser) {
            const success = await window.auth.loginUser(email, password);
            if (success) {
                await this.loadApplicationData();
            }
        }
    }

    /**
     * Maneja el logout
     */
    async handleLogout() {
        const confirmar = window.confirm('¿Estás seguro de que quieres cerrar sesión?');
        if (!confirmar) return;
        
        if (window.auth && window.auth.logoutUser) {
            await window.auth.logoutUser();
        }
    }

    /**
     * Cambia entre pestañas
     * @param {string} tabName - Nombre de la pestaña
     */
    switchTab(tabName) {
        console.log(`📑 Cambiando a pestaña: ${tabName}`);
        
        // Actualizar clases activas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Activar nueva pestaña
        const tabBtn = document.getElementById(`tab-${tabName}-btn`);
        const tabContent = document.getElementById(`tab-${tabName}`);
        
        if (tabBtn) tabBtn.classList.add('active');
        if (tabContent) tabContent.classList.add('active');
        
        // Actualizar búsqueda si hay término
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            // Disparar evento de búsqueda para la nueva pestaña
            setTimeout(() => {
                if (window.searchManager) {
                    window.searchManager.executeMainSearch(searchInput.value.trim());
                }
            }, 100);
        }
        
        // Actualizar título de página
        document.title = `${this.appName} - ${tabName === 'inventario' ? 'Inventario' : 'Ventas'}`;
    }

    /**
     * Maneja agregar nueva venta
     */
    handleAgregarVenta() {
        if (window.sales && window.sales.abrirAgregarVenta) {
            window.sales.abrirAgregarVenta();
        }
    }

    /**
     * Maneja exportar a Excel
     */
    async handleExportExcel() {
        try {
            console.log('📤 Exportando datos...');
            
            // Determinar qué pestaña está activa
            const activeTab = this.getActiveTab();
            let data, filename;
            
            if (activeTab === 'inventario') {
                data = window.inventory?.getInventario();
                filename = `inventario_mejoras_${this.getFechaHoyChile()}.csv`;
            } else {
                data = window.sales?.getVentas();
                filename = `ventas_mejoras_${this.getFechaHoyChile()}.csv`;
            }
            
            if (!data || data.length === 0) {
                this.showNotification('No hay datos para exportar', 'warning');
                return;
            }
            
            // Usar TableRenderer para exportar si está disponible
            if (window.tableRenderer && window.tableRenderer.exportToCSV) {
                const tableId = activeTab === 'inventario' ? 'tablaInventario' : 'tablaVentas';
                window.tableRenderer.exportToCSV(tableId, filename);
            } else {
                // Fallback a exportación simple
                this.exportToCSV(data, filename);
            }
            
        } catch (error) {
            console.error('❌ Error exportando:', error);
            this.showNotification('Error al exportar los datos', 'error');
        }
    }

    /**
     * Exporta datos a CSV (fallback)
     */
    exportToCSV(data, filename) {
        if (!data || data.length === 0) return;
        
        // Preparar encabezados
        const headers = Object.keys(data[0]);
        
        // Crear contenido CSV
        let csv = headers.join(',') + '\n';
        
        data.forEach(item => {
            const row = headers.map(header => {
                let value = item[header];
                if (value === null || value === undefined) {
                    value = '';
                } else if (typeof value === 'string' && value.includes(',')) {
                    value = `"${value}"`;
                }
                return value;
            });
            csv += row.join(',') + '\n';
        });
        
        // Crear blob y descargar
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
        
        this.showNotification(`Exportado: ${data.length} registros`, 'success');
    }

    /**
     * Maneja reporte de encargos
     */
    handleReporteEncargos() {
        console.log('📋 Generando reporte de encargos...');
        
        const inventario = window.inventory?.getInventario();
        if (!inventario || inventario.length === 0) {
            this.showNotification('No hay datos de inventario', 'warning');
            return;
        }
        
        // Filtrar productos con stock negativo
        const encargos = inventario.filter(p => p.cantidad < 0);
        
        if (encargos.length === 0) {
            this.showNotification('No hay encargos pendientes', 'info');
            return;
        }
        
        // Actualizar contador
        document.getElementById('total-encargos').textContent = encargos.length;
        
        // Mostrar lista de encargos
        const tbody = document.getElementById('lista-encargos');
        if (tbody) {
            tbody.innerHTML = '';
            
            let totalUnidades = 0;
            let inversionTotal = 0;
            
            encargos.forEach(producto => {
                const cantidadPendiente = Math.abs(producto.cantidad);
                const costoUnitario = parseFloat(producto.costo || 0);
                const costoProducto = cantidadPendiente * costoUnitario;
                
                totalUnidades += cantidadPendiente;
                inversionTotal += costoProducto;
                
                const row = document.createElement('tr');
                row.style.cssText = 'border-bottom: 1px solid #e2e8f0;';
                row.innerHTML = `
                    <td style="padding: 12px;"><strong>${producto.codigo_barras}</strong></td>
                    <td style="padding: 12px;">${producto.descripcion || '<span style="color: #94a3b8;">Sin descripción</span>'}</td>
                    <td style="padding: 12px;">
                        <span style="padding: 4px 10px; background: #fee2e2; color: #dc2626; border-radius: 20px; font-weight: bold;">
                            ${cantidadPendiente} unidades
                        </span>
                    </td>
                    <td style="padding: 12px;">
                        <div>$${costoUnitario.toFixed(2)} c/u</div>
                        <div style="font-size: 12px; color: #64748b;">Total: $${costoProducto.toFixed(2)}</div>
                    </td>
                `;
                tbody.appendChild(row);
            });
            
            // Agregar fila de totales
            const totalRow = document.createElement('tr');
            totalRow.style.cssText = 'background: #f8fafc; font-weight: bold;';
            totalRow.innerHTML = `
                <td style="padding: 12px; color: #475569;" colspan="2">TOTAL GENERAL</td>
                <td style="padding: 12px; color: #dc2626;">${totalUnidades} unidades</td>
                <td style="padding: 12px; color: #dc2626;">
                    <div>Inversión total:</div>
                    <div style="font-size: 18px;">$${inversionTotal.toFixed(2)}</div>
                </td>
            `;
            tbody.appendChild(totalRow);
        }
        
        // Abrir modal
        this.openModal('modalEncargos');
        
        this.showNotification(`💰 Inversión requerida: $${inversionTotal.toFixed(2)} para ${encargos.length} productos`, 'success');
    }

    /**
     * Maneja búsqueda en input
     */
    handleSearchInput(e) {
        const searchTerm = e.target.value.trim();
        const activeTab = this.getActiveTab();
        
        if (activeTab === 'inventario' && window.inventory) {
            window.inventory.aplicarFiltro({ texto: searchTerm });
        } else if (activeTab === 'ventas' && window.sales) {
            window.sales.aplicarFiltroVentas({ texto: searchTerm });
        }
    }

    /**
     * Maneja búsqueda en modal de producto
     */
    handleBuscarProducto() {
        if (window.searchManager) {
            const searchTerm = document.getElementById('buscarProducto')?.value || '';
            if (searchTerm.length >= 2) {
                window.searchManager.executeVentaSearch(searchTerm);
            }
        }
    }

    /**
     * Maneja guardar inventario
     */
    async handleSaveInventario() {
        if (window.inventory && window.inventory.guardarInventario) {
            await window.inventory.guardarInventario();
        }
    }

    /**
     * Maneja guardar venta
     */
    async handleSaveVenta() {
        if (window.sales && window.sales.guardarVenta) {
            await window.sales.guardarVenta();
        }
    }

    /**
     * Maneja guardar nueva venta
     */
    async handleSaveNuevaVenta() {
        if (window.sales && window.sales.guardarNuevaVenta) {
            await window.sales.guardarNuevaVenta();
        }
    }

    // ============================================
    // MANEJO DE ESTADO DE LA APLICACIÓN
    // ============================================

    /**
     * Verifica estado inicial de la aplicación
     */
    async checkInitialState() {
        console.log('🔍 Verificando estado inicial...');
        
        // Verificar autenticación
        const isAuthenticated = window.auth?.isAuthenticated();
        
        if (isAuthenticated) {
            await this.loadApplicationData();
        } else {
            console.log('👤 Usuario no autenticado, mostrando login');
        }
        
        // Verificar conexión a internet
        if (!navigator.onLine) {
            this.handleOfflineStatus();
        }
        
        // Verificar ventas pendientes de sincronizar
        this.checkPendingSync();
    }

    /**
     * Carga los datos de la aplicación
     */
    async loadApplicationData() {
        console.log('📥 Cargando datos de la aplicación...');
        
        try {
            // Mostrar indicador de carga
            this.showLoading(true);
            
            // Cargar inventario
            if (window.inventory && window.inventory.cargarInventario) {
                await window.inventory.cargarInventario();
            }
            
            // Cargar ventas
            if (window.sales && window.sales.cargarVentas) {
                await window.sales.cargarVentas();
            }
            
            // Configurar real-time updates
            this.setupRealTimeUpdates();
            
            // Actualizar estadísticas
            this.updateStats();
            
            // Forzar mostrar pestaña de ventas al cargar
            this.switchTab('ventas');
            
            console.log('✅ Datos cargados correctamente');
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.showNotification('Error al cargar los datos', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Configura actualizaciones en tiempo real
     */
    setupRealTimeUpdates() {
        console.log('📡 Configurando actualizaciones en tiempo real...');
        
        // Inventario
        if (window.inventory && window.inventory.setupRealtimeUpdates) {
            window.inventory.setupRealtimeUpdates();
        }
        
        // Ventas
        if (window.sales && window.sales.setupSalesRealtime) {
            window.sales.setupSalesRealtime();
        }
    }

    /**
     * Actualiza estadísticas
     */
    updateStats() {
        console.log('📊 Actualizando estadísticas...');
        
        // Actualizar fecha en header
        const fechaHoyElement = document.getElementById('fecha-hoy');
        if (fechaHoyElement) {
            fechaHoyElement.textContent = this.getFechaActualChile();
        }
        
        // Actualizar ventas de hoy
        if (window.sales && window.sales.actualizarEstadisticasVentas) {
            window.sales.actualizarEstadisticasVentas();
        }
        
        // Actualizar inventario
        if (window.inventory && window.inventory.actualizarEstadisticasInventario) {
            window.inventory.actualizarEstadisticasInventario();
        }
    }

    /**
     * Configura actualizaciones automáticas
     */
    setupAutoUpdates() {
        // Actualizar estadísticas cada minuto
        setInterval(() => {
            this.updateStats();
        }, 60000);
        
        // Actualizar fecha en modal de venta cada minuto
        setInterval(() => {
            const fechaVentaActual = document.getElementById('fechaVentaActual');
            if (fechaVentaActual) {
                fechaVentaActual.textContent = this.getFechaActualChile();
            }
        }, 60000);
        
        // Verificar sincronización cada 30 segundos
        setInterval(() => {
            this.checkPendingSync();
        }, 30000);
    }

    /**
     * Verifica ventas pendientes de sincronizar
     */
    checkPendingSync() {
        if (window.sync && window.sync.actualizarBadgeOffline) {
            window.sync.actualizarBadgeOffline();
        }
    }

    // ============================================
    // MANEJO DE CONEXIÓN
    // ============================================

    /**
     * Maneja estado online
     */
    handleOnlineStatus() {
        console.log('🌐 Conexión a internet restablecida');
        
        this.showNotification('Conexión a internet restablecida', 'success', 3000);
        
        // Intentar sincronizar ventas pendientes
        setTimeout(() => {
            if (window.sync && window.sync.sincronizarVentasPendientes) {
                window.sync.sincronizarVentasPendientes();
            }
        }, 2000);
    }

    /**
     * Maneja estado offline
     */
    handleOfflineStatus() {
        console.warn('📴 Sin conexión a internet');
        
        this.showNotification(
            'Modo offline activado. Las ventas se guardarán localmente',
            'warning',
            5000
        );
    }

    // ============================================
    // MANEJO DE ERRORES
    // ============================================

    /**
     * Configura manejo global de errores
     */
    setupErrorHandling() {
        // Capturar errores no manejados
        window.addEventListener('error', (event) => {
            console.error('❌ Error no manejado:', event.error);
            this.handleError(event.error);
        });
        
        // Capturar promesas rechazadas no manejadas
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Promesa rechazada no manejada:', event.reason);
            this.handleError(event.reason);
        });
    }

    /**
     * Maneja errores de la aplicación
     * @param {Error} error - Error a manejar
     */
    handleError(error) {
        console.error('🛑 Error de aplicación:', error);
        
        // Mostrar notificación al usuario
        const errorMessage = error.message || 'Error desconocido';
        this.showNotification(`Error: ${errorMessage}`, 'error');
    }

    /**
     * Maneja errores fatales
     * @param {Error} error - Error fatal
     */
    handleFatalError(error) {
        console.error('💀 Error fatal:', error);
        
        // Mostrar pantalla de error
        const appContainer = document.getElementById('app-container');
        const loginContainer = document.getElementById('login-container');
        
        if (appContainer) appContainer.style.display = 'none';
        if (loginContainer) loginContainer.style.display = 'none';
        
        // Crear pantalla de error
        const errorScreen = document.createElement('div');
        errorScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
            text-align: center;
            font-family: sans-serif;
        `;
        
        errorScreen.innerHTML = `
            <div style="max-width: 500px;">
                <h1 style="color: #ef4444; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle"></i> Error del Sistema
                </h1>
                <p style="color: #4b5563; margin-bottom: 20px;">
                    Ha ocurrido un error grave en la aplicación. Por favor, recarga la página.
                </p>
                <pre style="background: #f3f4f6; padding: 15px; border-radius: 6px; font-size: 12px; text-align: left; max-height: 200px; overflow: auto; margin-bottom: 20px;">
${error.stack || error.message || 'Error desconocido'}
                </pre>
                <button onclick="location.reload()" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 5px;
                ">
                    <i class="fas fa-redo"></i> Recargar Aplicación
                </button>
                <button onclick="window.veterinariaApp.showDebugInfo()" style="
                    background: #6b7280;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 5px;
                ">
                    <i class="fas fa-bug"></i> Información de Depuración
                </button>
            </div>
        `;
        
        document.body.appendChild(errorScreen);
    }

    // ============================================
    // UTILIDADES DE LA APLICACIÓN
    // ============================================

    /**
     * Muestra/oculta indicador de carga
     * @param {boolean} show - True para mostrar
     */
    showLoading(show) {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;
        
        let loadingElement = appContainer.querySelector('.app-loading');
        
        if (show) {
            if (!loadingElement) {
                loadingElement = document.createElement('div');
                loadingElement.className = 'app-loading';
                loadingElement.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    backdrop-filter: blur(3px);
                `;
                loadingElement.innerHTML = `
                    <div style="text-align: center;">
                        <div class="spinner" style="
                            width: 50px;
                            height: 50px;
                            border: 4px solid #e5e7eb;
                            border-top-color: #3b82f6;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 15px;
                        "></div>
                        <p style="color: #4b5563; font-size: 14px;">Cargando...</p>
                    </div>
                `;
                appContainer.appendChild(loadingElement);
            }
        } else if (loadingElement) {
            loadingElement.remove();
        }
    }

    /**
     * Enfoca el campo de búsqueda
     */
    focusSearch() {
        if (window.searchManager) {
            window.searchManager.focusMainSearch();
        }
    }

    /**
     * Refresca los datos
     */
    async refreshData() {
        console.log('🔄 Refrescando datos...');
        
        this.showNotification('Actualizando datos...', 'info', 2000);
        
        await this.loadApplicationData();
    }

    /**
     * Obtiene la pestaña activa
     * @returns {string} 'inventario' o 'ventas'
     */
    getActiveTab() {
        const inventarioTab = document.getElementById('tab-inventario');
        if (inventarioTab && inventarioTab.classList.contains('active')) {
            return 'inventario';
        }
        
        const ventasTab = document.getElementById('tab-ventas');
        if (ventasTab && ventasTab.classList.contains('active')) {
            return 'ventas';
        }
        
        return 'inventario'; // Por defecto
    }

    /**
     * Abre un modal
     * @param {string} modalId - ID del modal
     */
    openModal(modalId) {
        if (window.modalManager && window.modalManager.openModal) {
            window.modalManager.openModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'flex';
            }
        }
    }

    /**
     * Cierra un modal
     * @param {string} modalId - ID del modal
     */
    closeModal(modalId) {
        if (window.modalManager && window.modalManager.closeModal) {
            window.modalManager.closeModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        }
        
        // Limpiar variables globales
        if (modalId === 'modalInventario') {
            this.globals.productoEditando = null;
        } else if (modalId === 'modalVenta') {
            this.globals.ventaEditando = null;
        } else if (modalId === 'modalAgregarVenta') {
            this.globals.productoSeleccionado = null;
        }
    }

    /**
     * Cierra todos los modales
     */
    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Limpiar todas las variables globales
        this.globals.productoEditando = null;
        this.globals.ventaEditando = null;
        this.globals.productoSeleccionado = null;
    }

    /**
     * Calcula total en modal de edición de venta
     */
    calcularTotalVentaEdicion() {
        if (window.sales && window.sales.calcularNuevoTotalConDescuento) {
            window.sales.calcularNuevoTotalConDescuento();
        }
    }

    /**
     * Calcula total en modal de nueva venta
     */
    calcularTotalNuevaVenta() {
        if (window.sales && window.sales.calcularTotalVenta) {
            window.sales.calcularTotalVenta();
        }
    }

    /**
     * Muestra notificación
     */
    showNotification(message, type = 'info', duration = 3000) {
        if (window.notifications && window.notifications.showNotification) {
            window.notifications.showNotification(message, type, duration);
        } else {
            // Fallback básico
            console.log(`[${type.toUpperCase()}] ${message}`);
            const notification = document.getElementById('notification');
            if (notification) {
                notification.textContent = message;
                notification.className = `notification ${type}`;
                notification.style.display = 'block';
                
                setTimeout(() => {
                    notification.style.display = 'none';
                }, duration);
            }
        }
    }

    /**
     * Muestra mensaje de bienvenida
     */
    showWelcomeMessage() {
        setTimeout(() => {
            if (window.auth?.isAuthenticated()) {
                this.showNotification(
                    `Bienvenido al ${this.appName}`,
                    'info',
                    3000
                );
            }
        }, 1000);
    }

    /**
     * Muestra ayuda
     */
    showHelp() {
        const helpText = `🆘 AYUDA - Atajos de Teclado:
        
Ctrl/Cmd + N: Nueva venta
Ctrl/Cmd + E: Exportar datos
Ctrl/Cmd + F: Buscar
Ctrl/Cmd + R: Recargar datos
Ctrl/Cmd + L: Cerrar sesión
Escape: Cerrar modales
F1: Mostrar esta ayuda

📱 Funcionalidades:
- Escáner de código de barras automático
- Modo offline para ventas
- Reporte de encargos pendientes
- Estadísticas en tiempo real`;
        
        window.alert(helpText);
    }

    /**
     * Muestra información de depuración
     */
    showDebugInfo() {
        const debugInfo = {
            appName: this.appName,
            version: this.version,
            isInitialized: this.isInitialized,
            authenticated: window.auth?.isAuthenticated(),
            userEmail: window.auth?.getCurrentUserEmail(),
            online: navigator.onLine,
            userAgent: navigator.userAgent,
            screenSize: `${window.screen.width}x${window.screen.height}`,
            timestamp: new Date().toISOString()
        };
        
        console.log('🔍 Información de depuración:', debugInfo);
        window.alert(JSON.stringify(debugInfo, null, 2));
    }

    /**
     * Verifica autenticación
     */
    async checkAuth() {
        if (window.auth && window.auth.checkAuth) {
            return await window.auth.checkAuth();
        }
        return false;
    }

    /**
     * Obtiene fecha actual en Chile
     */
    getFechaActualChile() {
        if (window.utils && window.utils.getFechaActualChile) {
            return window.utils.getFechaActualChile();
        }
        
        const ahora = new Date();
        const offset = -3;
        const fechaChile = new Date(ahora.getTime() + offset * 60 * 60 * 1000);
        
        const opciones = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        };
        
        return fechaChile.toLocaleDateString('es-CL', opciones);
    }

    /**
     * Obtiene fecha hoy en formato YYYY-MM-DD
     */
    getFechaHoyChile() {
        if (window.utils && window.utils.getFechaHoyChile) {
            return window.utils.getFechaHoyChile();
        }
        
        const ahora = new Date();
        const offset = -3;
        const fechaChile = new Date(ahora.getTime() + offset * 60 * 60 * 1000);
        
        const año = fechaChile.getFullYear();
        const mes = (fechaChile.getMonth() + 1).toString().padStart(2, '0');
        const dia = fechaChile.getDate().toString().padStart(2, '0');
        
        return `${año}-${mes}-${dia}`;
    }
}

// ============================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ============================================

/**
 * Inicializa la aplicación principal
 */
async function initializeApp() {
    if (veterinariaAppInstance) {
        console.warn('⚠️ La aplicación ya está inicializada');
        return veterinariaAppInstance;
    }
    
    console.log('🚀 Iniciando aplicación principal...');
    
    try {
        veterinariaAppInstance = new VeterinariaApp();
        await veterinariaAppInstance.initialize();
        return veterinariaAppInstance;
        
    } catch (error) {
        console.error('❌ Error al inicializar la aplicación:', error);
        
        // Mostrar error básico si falla la inicialización
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
            text-align: center;
            font-family: sans-serif;
        `;
        errorDiv.innerHTML = `
            <div>
                <h1 style="color: #ef4444;">Error al cargar la aplicación</h1>
                <p style="color: #4b5563; margin-bottom: 20px;">Por favor, recarga la página o contacta al administrador.</p>
                <button onclick="location.reload()" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                ">Recargar</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
        
        return null;
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            initializeApp();
        }, 100);
    });
} else {
    setTimeout(() => {
        initializeApp();
    }, 100);
}

// Exportar al ámbito global
window.veterinariaApp = {
    initialize: initializeApp,
    getInstance: () => veterinariaAppInstance,
    
    // Métodos de conveniencia
    refreshData: () => {
        if (veterinariaAppInstance) {
            return veterinariaAppInstance.refreshData();
        }
        return null;
    },
    
    showHelp: () => {
        if (veterinariaAppInstance) {
            return veterinariaAppInstance.showHelp();
        }
        return null;
    },
    
    showDebugInfo: () => {
        if (veterinariaAppInstance) {
            return veterinariaAppInstance.showDebugInfo();
        }
        return null;
    },
    
    // Variables globales
    get globals() {
        return veterinariaAppInstance ? veterinariaAppInstance.globals : {
            inventario: [],
            ventas: [],
            productoEditando: null,
            ventaEditando: null,
            productoSeleccionado: null
        };
    }
};

console.log('🚀 Aplicación principal lista para iniciar');
