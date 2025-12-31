/* ============================================
   RENDERIZADO DE TABLAS
   ============================================
   Sistema centralizado para renderizado de tablas:
   - Renderizado optimizado de tablas grandes
   - Virtual scrolling para mejor performance
   - Ordenamiento por columnas
   - Paginación opcional
   ============================================ */

// ============================================
// CONFIGURACIÓN DEL RENDERIZADOR
// ============================================

class TableRenderer {
    constructor() {
        this.tables = new Map();
        this.virtualScrollEnabled = true;
        this.itemsPerPage = 50;
        this.currentPage = 1;
        
        this.initialize();
    }

    /**
     * Inicializa el renderizador de tablas
     */
    initialize() {
        console.log('📊 Inicializando TableRenderer...');
        
        // Configurar estilos dinámicos
        this.setupStyles();
        
        console.log('✅ TableRenderer inicializado');
    }

    /**
     * Configura estilos CSS dinámicos
     */
    setupStyles() {
        const styleId = 'table-renderer-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* Estilos para tablas optimizadas */
                .table-container {
                    position: relative;
                    overflow: hidden;
                }
                
                .table-scroll-viewport {
                    height: 500px;
                    overflow-y: auto;
                    position: relative;
                }
                
                .table-virtual-content {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                }
                
                /* Indicador de carga de más datos */
                .table-load-more {
                    text-align: center;
                    padding: 20px;
                    color: var(--gray-500);
                    font-size: 14px;
                }
                
                .table-load-more button {
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: opacity 0.2s;
                }
                
                .table-load-more button:hover {
                    opacity: 0.9;
                }
                
                /* Indicador de carga */
                .table-loading {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    backdrop-filter: blur(2px);
                }
                
                .table-loading .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--gray-200);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: table-spin 1s linear infinite;
                }
                
                @keyframes table-spin {
                    to { transform: rotate(360deg); }
                }
                
                /* Ordenamiento de columnas */
                .sortable-header {
                    cursor: pointer;
                    user-select: none;
                    position: relative;
                    padding-right: 24px !important;
                }
                
                .sortable-header:hover {
                    background: var(--gray-100);
                }
                
                .sortable-header .sort-indicator {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--gray-400);
                }
                
                .sortable-header.asc .sort-indicator,
                .sortable-header.desc .sort-indicator {
                    color: var(--primary);
                }
                
                .sortable-header.asc .sort-indicator:after {
                    content: "\\f0de";
                }
                
                .sortable-header.desc .sort-indicator:after {
                    content: "\\f0dd";
                }
                
                /* Estados de filas */
                .table-row-selected {
                    background: var(--blue-50) !important;
                }
                
                .table-row-low-stock {
                    border-left: 3px solid var(--warning) !important;
                }
                
                .table-row-out-of-stock {
                    border-left: 3px solid var(--danger) !important;
                }
                
                /* Paginación */
                .table-pagination {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 15px;
                    border-top: 1px solid var(--gray-200);
                    background: var(--gray-50);
                    gap: 8px;
                }
                
                .pagination-btn {
                    padding: 6px 12px;
                    border: 1px solid var(--gray-300);
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                }
                
                .pagination-btn:hover:not(:disabled) {
                    background: var(--gray-100);
                    border-color: var(--gray-400);
                }
                
                .pagination-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .pagination-btn.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }
                
                .pagination-info {
                    margin: 0 15px;
                    font-size: 13px;
                    color: var(--gray-600);
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ============================================
    // REGISTRO Y GESTIÓN DE TABLAS
    // ============================================

    /**
     * Registra una tabla para ser manejada por el renderizador
     * @param {string} tableId - ID de la tabla
     * @param {Object} config - Configuración de la tabla
     */
    registerTable(tableId, config) {
        console.log(`📊 Registrando tabla: ${tableId}`);
        
        const tableConfig = {
            id: tableId,
            data: [],
            filteredData: [],
            columns: config.columns || [],
            sortColumn: config.defaultSort || null,
            sortDirection: config.defaultSortDirection || 'asc',
            pageSize: config.pageSize || this.itemsPerPage,
            currentPage: 1,
            virtualScroll: config.virtualScroll !== false,
            selectable: config.selectable || false,
            onRowClick: config.onRowClick,
            onSort: config.onSort,
            ...config
        };
        
        this.tables.set(tableId, tableConfig);
        
        // Configurar la tabla en el DOM
        this.setupTableDOM(tableId, config);
        
        return tableConfig;
    }

    /**
     * Configura el DOM de una tabla
     * @param {string} tableId - ID de la tabla
     * @param {Object} config - Configuración
     */
    setupTableDOM(tableId, config) {
        const tableElement = document.getElementById(tableId);
        if (!tableElement) {
            console.error(`❌ Tabla no encontrada: ${tableId}`);
            return;
        }
        
        // Agregar clases CSS
        tableElement.classList.add('renderer-table');
        
        // Configurar encabezados sortables
        if (config.sortable !== false) {
            this.setupSortableHeaders(tableId);
        }
        
        // Configurar scroll virtual si está habilitado
        if (config.virtualScroll !== false && config.data && config.data.length > 100) {
            this.setupVirtualScroll(tableId);
        }
        
        // Configurar selección de filas si está habilitado
        if (config.selectable) {
            this.setupRowSelection(tableId);
        }
    }

    /**
     * Configura encabezados sortables
     * @param {string} tableId - ID de la tabla
     */
    setupSortableHeaders(tableId) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig || !tableConfig.sortable) return;
        
        const tableElement = document.getElementById(tableId);
        const headers = tableElement.querySelectorAll('thead th');
        
        headers.forEach((header, index) => {
            const column = tableConfig.columns[index];
            if (column && column.sortable !== false) {
                header.classList.add('sortable-header');
                
                // Agregar indicador de ordenamiento
                const indicator = document.createElement('span');
                indicator.className = 'sort-indicator';
                indicator.innerHTML = '<i class="fas fa-sort"></i>';
                header.appendChild(indicator);
                
                // Configurar evento de clic
                header.addEventListener('click', () => {
                    this.sortTable(tableId, column.key);
                });
            }
        });
    }

    /**
     * Configura scroll virtual para tablas grandes
     * @param {string} tableId - ID de la tabla
     */
    setupVirtualScroll(tableId) {
        const tableElement = document.getElementById(tableId);
        const tableContainer = tableElement.closest('.table-container');
        
        if (!tableContainer) {
            console.warn(`⚠️ No se encontró contenedor para tabla ${tableId}`);
            return;
        }
        
        // Crear viewport para scroll virtual
        const viewport = document.createElement('div');
        viewport.className = 'table-scroll-viewport';
        viewport.style.height = '500px'; // Altura por defecto
        
        // Mover la tabla al viewport
        const tableParent = tableElement.parentNode;
        tableParent.insertBefore(viewport, tableElement);
        viewport.appendChild(tableElement);
        
        // Crear contenido virtual
        const virtualContent = document.createElement('div');
        virtualContent.className = 'table-virtual-content';
        virtualContent.style.height = '0px'; // Se actualizará dinámicamente
        
        // Mover tbody al contenido virtual
        const tbody = tableElement.querySelector('tbody');
        if (tbody) {
            virtualContent.appendChild(tbody);
            tableElement.appendChild(virtualContent);
        }
        
        // Configurar scroll
        this.setupViewportScroll(tableId, viewport, virtualContent);
    }

    /**
     * Configura el evento de scroll para viewport
     * @param {string} tableId - ID de la tabla
     * @param {HTMLElement} viewport - Elemento viewport
     * @param {HTMLElement} virtualContent - Contenido virtual
     */
    setupViewportScroll(tableId, viewport, virtualContent) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig) return;
        
        let isScrolling = false;
        
        viewport.addEventListener('scroll', () => {
            if (isScrolling) return;
            
            isScrolling = true;
            requestAnimationFrame(() => {
                this.updateVirtualContent(tableId, viewport, virtualContent);
                isScrolling = false;
            });
        });
        
        // Actualizar inicialmente
        setTimeout(() => {
            this.updateVirtualContent(tableId, viewport, virtualContent);
        }, 100);
    }

    /**
     * Actualiza el contenido virtual basado en la posición del scroll
     */
    updateVirtualContent(tableId, viewport, virtualContent) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig || !tableConfig.virtualScroll) return;
        
        const rowHeight = 50; // Altura aproximada de una fila
        const scrollTop = viewport.scrollTop;
        const viewportHeight = viewport.clientHeight;
        
        // Calcular índices visibles
        const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
        const visibleCount = Math.ceil(viewportHeight / rowHeight) + 10;
        const endIndex = Math.min(tableConfig.filteredData.length, startIndex + visibleCount);
        
        // Actualizar altura del contenido virtual
        virtualContent.style.height = `${tableConfig.filteredData.length * rowHeight}px`;
        
        // Renderizar solo las filas visibles
        this.renderVisibleRows(tableId, startIndex, endIndex);
        
        // Actualizar posición del contenido virtual
        virtualContent.style.transform = `translateY(${startIndex * rowHeight}px)`;
    }

    /**
     * Renderiza solo las filas visibles
     */
    renderVisibleRows(tableId, startIndex, endIndex) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig) return;
        
        const visibleData = tableConfig.filteredData.slice(startIndex, endIndex);
        const tbody = document.querySelector(`#${tableId} tbody`);
        
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        visibleData.forEach((item, index) => {
            const globalIndex = startIndex + index;
            const row = this.createTableRow(tableId, item, globalIndex);
            tbody.appendChild(row);
        });
    }

    /**
     * Configura selección de filas
     * @param {string} tableId - ID de la tabla
     */
    setupRowSelection(tableId) {
        // La selección se maneja en createTableRow
    }

    // ============================================
    // RENDERIZADO DE DATOS
    // ============================================

    /**
     * Actualiza los datos de una tabla
     * @param {string} tableId - ID de la tabla
     * @param {Array} data - Nuevos datos
     * @param {boolean} preserveSort - Preservar ordenamiento actual
     */
    updateTableData(tableId, data, preserveSort = true) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig) {
            console.error(`❌ Tabla no registrada: ${tableId}`);
            return;
        }
        
        console.log(`📊 Actualizando tabla ${tableId}: ${data.length} registros`);
        
        // Actualizar datos
        tableConfig.data = data;
        
        // Aplicar filtros actuales
        this.applyTableFilters(tableId);
        
        // Aplicar ordenamiento si existe
        if (preserveSort && tableConfig.sortColumn) {
            this.sortTable(tableId, tableConfig.sortColumn, tableConfig.sortDirection);
        } else {
            // Renderizar sin reordenar
            tableConfig.filteredData = [...tableConfig.data];
            this.renderTable(tableId);
        }
        
        // Actualizar paginación
        this.updatePagination(tableId);
    }

    /**
     * Aplica filtros a la tabla
     * @param {string} tableId - ID de la tabla
     * @param {Object} filters - Filtros a aplicar
     */
    applyTableFilters(tableId, filters = null) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig) return;
        
        // Actualizar filtros si se proporcionan
        if (filters) {
            tableConfig.filters = { ...tableConfig.filters, ...filters };
        }
        
        // Aplicar filtros
        let filteredData = tableConfig.data;
        
        if (tableConfig.filters) {
            filteredData = this.filterData(tableConfig.data, tableConfig.filters);
        }
        
        tableConfig.filteredData = filteredData;
        tableConfig.currentPage = 1; // Resetear a primera página
        
        // Renderizar
        this.renderTable(tableId);
        this.updatePagination(tableId);
    }

    /**
     * Filtra datos según criterios
     * @param {Array} data - Datos a filtrar
     * @param {Object} filters - Filtros a aplicar
     * @returns {Array} Datos filtrados
     */
    filterData(data, filters) {
        if (!filters || !data) return data;
        
        return data.filter(item => {
            // Filtro de texto
            if (filters.text && filters.text.trim()) {
                const searchTerm = filters.text.toLowerCase().trim();
                let matches = false;
                
                // Buscar en todas las propiedades del item
                for (const key in item) {
                    if (item[key] && item[key].toString().toLowerCase().includes(searchTerm)) {
                        matches = true;
                        break;
                    }
                }
                
                if (!matches) return false;
            }
            
            // Filtro de stock bajo
            if (filters.stockBajo && item.cantidad !== undefined) {
                if (item.cantidad >= 10 || item.cantidad < 0) return false;
            }
            
            // Filtro de encargos (stock negativo)
            if (filters.conEncargos && item.cantidad !== undefined) {
                if (item.cantidad >= 0) return false;
            }
            
            // Filtro por rango de fechas
            if (filters.fechaDesde && item.fecha_venta) {
                const fechaItem = new Date(item.fecha_venta);
                const fechaDesde = new Date(filters.fechaDesde + 'T00:00:00');
                if (fechaItem < fechaDesde) return false;
            }
            
            if (filters.fechaHasta && item.fecha_venta) {
                const fechaItem = new Date(item.fecha_venta);
                const fechaHasta = new Date(filters.fechaHasta + 'T23:59:59');
                if (fechaItem > fechaHasta) return false;
            }
            
            return true;
        });
    }

    /**
     * Ordena una tabla por columna
     * @param {string} tableId - ID de la tabla
     * @param {string} columnKey - Clave de la columna
     * @param {string} direction - Dirección (asc/desc)
     */
    sortTable(tableId, columnKey, direction = null) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig) return;
        
        // Determinar dirección
        if (direction) {
            tableConfig.sortDirection = direction;
        } else if (tableConfig.sortColumn === columnKey) {
            // Alternar dirección si es la misma columna
            tableConfig.sortDirection = tableConfig.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            tableConfig.sortDirection = 'asc';
        }
        
        tableConfig.sortColumn = columnKey;
        
        // Ordenar datos
        tableConfig.filteredData.sort((a, b) => {
            let valueA = a[columnKey];
            let valueB = b[columnKey];
            
            // Manejar valores undefined/null
            if (valueA == null) valueA = '';
            if (valueB == null) valueB = '';
            
            // Ordenar números
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return tableConfig.sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
            }
            
            // Ordenar strings
            valueA = valueA.toString().toLowerCase();
            valueB = valueB.toString().toLowerCase();
            
            if (valueA < valueB) return tableConfig.sortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return tableConfig.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Actualizar indicadores visuales
        this.updateSortIndicators(tableId);
        
        // Renderizar tabla
        this.renderTable(tableId);
        
        // Ejecutar callback si existe
        if (tableConfig.onSort) {
            tableConfig.onSort(columnKey, tableConfig.sortDirection);
        }
    }

    /**
     * Actualiza indicadores visuales de ordenamiento
     * @param {string} tableId - ID de la tabla
     */
    updateSortIndicators(tableId) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig || !tableConfig.sortable) return;
        
        const tableElement = document.getElementById(tableId);
        const headers = tableElement.querySelectorAll('thead th');
        
        headers.forEach(header => {
            header.classList.remove('asc', 'desc');
            
            const columnKey = header.getAttribute('data-column');
            if (columnKey === tableConfig.sortColumn) {
                header.classList.add(tableConfig.sortDirection);
            }
        });
    }

    // ============================================
    // RENDERIZADO DE TABLAS
    // ============================================

    /**
     * Renderiza una tabla completa
     * @param {string} tableId - ID de la tabla
     */
    renderTable(tableId) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig) return;
        
        // Mostrar estado de carga si no hay datos
        if (tableConfig.filteredData.length === 0) {
            this.renderEmptyState(tableId);
            return;
        }
        
        // Renderizar con scroll virtual o normal
        if (tableConfig.virtualScroll && tableConfig.filteredData.length > 100) {
            this.renderVirtualTable(tableId);
        } else {
            this.renderNormalTable(tableId);
        }
    }

    /**
     * Renderiza tabla normal (sin scroll virtual)
     * @param {string} tableId - ID de la tabla
     */
    renderNormalTable(tableId) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig) return;
        
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Calcular índices para paginación
        const startIndex = (tableConfig.currentPage - 1) * tableConfig.pageSize;
        const endIndex = Math.min(startIndex + tableConfig.pageSize, tableConfig.filteredData.length);
        const pageData = tableConfig.filteredData.slice(startIndex, endIndex);
        
        // Renderizar filas
        pageData.forEach((item, index) => {
            const globalIndex = startIndex + index;
            const row = this.createTableRow(tableId, item, globalIndex);
            tbody.appendChild(row);
        });
        
        // Mostrar mensaje si hay más datos
        if (tableConfig.filteredData.length > tableConfig.pageSize) {
            this.renderLoadMore(tableId, tbody, tableConfig.filteredData.length - endIndex);
        }
    }

    /**
     * Renderiza tabla con scroll virtual
     * @param {string} tableId - ID de la tabla
     */
    renderVirtualTable(tableId) {
        // El scroll virtual se maneja en updateVirtualContent
        // Solo necesitamos asegurarnos de que el viewport esté actualizado
        const viewport = document.querySelector(`#${tableId}`)?.closest('.table-scroll-viewport');
        if (viewport) {
            this.updateVirtualContent(tableId, viewport, viewport.querySelector('.table-virtual-content'));
        }
    }

    /**
     * Crea una fila de tabla
     * @param {string} tableId - ID de la tabla
     * @param {Object} item - Datos del item
     * @param {number} index - Índice global
     * @returns {HTMLTableRowElement} Fila creada
     */
    createTableRow(tableId, item, index) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="10">Error: Configuración de tabla no encontrada</td>';
            return row;
        }
        
        const row = document.createElement('tr');
        row.dataset.index = index;
        row.dataset.id = item.id || item.codigo_barras || index;
        
        // Aplicar clases especiales según estado
        if (item.cantidad !== undefined) {
            if (item.cantidad < 0) {
                row.classList.add('table-row-out-of-stock');
            } else if (item.cantidad < 10) {
                row.classList.add('table-row-low-stock');
            }
        }
        
        // Configurar click si hay callback
        if (tableConfig.onRowClick) {
            row.style.cursor = 'pointer';
            row.addEventListener('click', (e) => {
                // Evitar trigger en botones dentro de la fila
                if (!e.target.closest('button')) {
                    tableConfig.onRowClick(item, index, row);
                }
            });
        }
        
        // Crear celdas según columnas configuradas
        tableConfig.columns.forEach(column => {
            const cell = document.createElement('td');
            
            // Formatear valor según tipo de columna
            const value = this.formatCellValue(item[column.key], column);
            
            // Asignar contenido
            if (column.render) {
                // Renderizado personalizado
                cell.innerHTML = column.render(item, index);
            } else {
                cell.innerHTML = value;
            }
            
            // Aplicar clases adicionales
            if (column.className) {
                cell.className = column.className;
            }
            
            // Aplicar estilos adicionales
            if (column.style) {
                Object.assign(cell.style, column.style);
            }
            
            row.appendChild(cell);
        });
        
        return row;
    }

    /**
     * Formatea el valor de una celda
     * @param {*} value - Valor a formatear
     * @param {Object} column - Configuración de la columna
     * @returns {string} Valor formateado
     */
    formatCellValue(value, column) {
        if (value === null || value === undefined || value === '') {
            return column.emptyValue || '<span class="text-muted">-</span>';
        }
        
        // Formatear según tipo
        switch (column.type) {
            case 'currency':
                return window.utils.formatoMoneda(parseFloat(value));
                
            case 'number':
                return new Intl.NumberFormat('es-CL').format(value);
                
            case 'date':
                return window.utils.formatoHoraChile(value);
                
            case 'date-short':
                return window.utils.formatoHoraCortaChile(value);
                
            case 'stock':
                const cantidad = parseFloat(value);
                const badge = this.getStockBadge(cantidad);
                return `<span class="stock-badge ${badge.class}">${cantidad} unidades</span>`;
                
            case 'boolean':
                return value ? 
                    '<span class="text-success"><i class="fas fa-check"></i> Sí</span>' :
                    '<span class="text-muted"><i class="fas fa-times"></i> No</span>';
                    
            default:
                return value.toString();
        }
    }

    /**
     * Obtiene badge de stock
     * @param {number} cantidad - Cantidad en stock
     * @returns {Object} Badge con clase y texto
     */
    getStockBadge(cantidad) {
        if (cantidad < 0) {
            return { 
                class: 'stock-low', 
                text: `Encargo: ${Math.abs(cantidad)}` 
            };
        }
        if (cantidad <= 5) {
            return { class: 'stock-low', text: 'Muy Bajo' };
        }
        if (cantidad <= 10) {
            return { class: 'stock-medium', text: 'Bajo' };
        }
        return { class: 'stock-good', text: 'Disponible' };
    }

    /**
     * Renderiza estado vacío
     * @param {string} tableId - ID de la tabla
     */
    renderEmptyState(tableId) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (!tbody) return;
        
        const colCount = document.querySelector(`#${tableId} thead th`).length || 1;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="${colCount}" class="text-center py-8">
                    <div class="empty-state">
                        <i class="fas fa-inbox fa-3x text-gray-300 mb-4"></i>
                        <h4 class="text-gray-500 font-medium mb-2">No hay datos para mostrar</h4>
                        <p class="text-gray-400 text-sm">Intenta cambiar los filtros o agregar nuevos datos</p>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Renderiza botón "Cargar más"
     * @param {string} tableId - ID de la tabla
     * @param {HTMLElement} tbody - Elemento tbody
     * @param {number} remaining - Número de elementos restantes
     */
    renderLoadMore(tableId, tbody, remaining) {
        const loadMoreRow = document.createElement('tr');
        loadMoreRow.innerHTML = `
            <td colspan="10" class="table-load-more">
                <button onclick="window.tableRenderer.loadMore('${tableId}')">
                    Cargar ${remaining} más <i class="fas fa-chevron-down ml-2"></i>
                </button>
            </td>
        `;
        tbody.appendChild(loadMoreRow);
    }

    /**
     * Carga más elementos en la tabla
     * @param {string} tableId - ID de la tabla
     */
    loadMore(tableId) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig) return;
        
        tableConfig.pageSize += 50; // Aumentar tamaño de página
        this.renderNormalTable(tableId);
    }

    // ============================================
    // PAGINACIÓN
    // ============================================

    /**
     * Actualiza la paginación de una tabla
     * @param {string} tableId - ID de la tabla
     */
    updatePagination(tableId) {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig || tableConfig.virtualScroll) return;
        
        const tableContainer = document.getElementById(tableId)?.closest('.table-container');
        if (!tableContainer) return;
        
        // Remover paginación existente
        const oldPagination = tableContainer.querySelector('.table-pagination');
        if (oldPagination) {
            oldPagination.remove();
        }
        
        // Si no hay muchos datos, no mostrar paginación
        if (tableConfig.filteredData.length <= tableConfig.pageSize) {
            return;
        }
        
        // Crear paginación
        const totalPages = Math.ceil(tableConfig.filteredData.length / tableConfig.pageSize);
        const pagination = document.createElement('div');
        pagination.className = 'table-pagination';
        
        // Botón anterior
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-btn';
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = tableConfig.currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (tableConfig.currentPage > 1) {
                tableConfig.currentPage--;
                this.renderNormalTable(tableId);
                this.updatePagination(tableId);
            }
        });
        
        // Botón siguiente
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-btn';
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = tableConfig.currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (tableConfig.currentPage < totalPages) {
                tableConfig.currentPage++;
                this.renderNormalTable(tableId);
                this.updatePagination(tableId);
            }
        });
        
        // Información de página
        const pageInfo = document.createElement('span');
        pageInfo.className = 'pagination-info';
        pageInfo.textContent = `Página ${tableConfig.currentPage} de ${totalPages}`;
        
        // Números de página
        const pageNumbers = document.createElement('div');
        pageNumbers.className = 'pagination-numbers';
        pageNumbers.style.display = 'flex';
        pageNumbers.style.gap = '4px';
        
        // Mostrar números de página (máximo 5)
        const startPage = Math.max(1, tableConfig.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `pagination-btn ${i === tableConfig.currentPage ? 'active' : ''}`;
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                tableConfig.currentPage = i;
                this.renderNormalTable(tableId);
                this.updatePagination(tableId);
            });
            pageNumbers.appendChild(pageButton);
        }
        
        // Ensamblar paginación
        pagination.appendChild(prevButton);
        pagination.appendChild(pageNumbers);
        pagination.appendChild(pageInfo);
        pagination.appendChild(nextButton);
        
        // Agregar al contenedor
        tableContainer.appendChild(pagination);
    }

    // ============================================
    // UTILIDADES
    // ============================================

    /**
     * Muestra estado de carga en una tabla
     * @param {string} tableId - ID de la tabla
     * @param {boolean} show - True para mostrar
     */
    showLoading(tableId, show = true) {
        const tableElement = document.getElementById(tableId);
        if (!tableElement) return;
        
        let loadingElement = tableElement.querySelector('.table-loading');
        
        if (show) {
            if (!loadingElement) {
                loadingElement = document.createElement('div');
                loadingElement.className = 'table-loading';
                loadingElement.innerHTML = '<div class="spinner"></div>';
                tableElement.appendChild(loadingElement);
            }
        } else if (loadingElement) {
            loadingElement.remove();
        }
    }

    /**
     * Exporta datos de la tabla a CSV
     * @param {string} tableId - ID de la tabla
     * @param {string} filename - Nombre del archivo
     */
    exportToCSV(tableId, filename = 'export.csv') {
        const tableConfig = this.tables.get(tableId);
        if (!tableConfig || tableConfig.filteredData.length === 0) {
            window.notifications?.error('No hay datos para exportar');
            return;
        }
        
        console.log(`📤 Exportando tabla ${tableId} a CSV...`);
        
        // Preparar encabezados
        const headers = tableConfig.columns.map(col => col.title || col.key);
        
        // Preparar filas
        const rows = tableConfig.filteredData.map(item => {
            return tableConfig.columns.map(col => {
                let value = item[col.key];
                
                // Formatear valores especiales
                if (col.type === 'currency' && value) {
                    value = parseFloat(value).toFixed(2);
                } else if (value === null || value === undefined) {
                    value = '';
                } else if (typeof value === 'string' && value.includes(',')) {
                    value = `"${value}"`;
                }
                
                return value;
            });
        });
        
        // Crear contenido CSV
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        // Crear blob y descargar
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        // Limpiar
        URL.revokeObjectURL(url);
        
        window.notifications?.success(`Exportado: ${tableConfig.filteredData.length} registros`);
    }

    /**
     * Obtiene los datos filtrados de una tabla
     * @param {string} tableId - ID de la tabla
     * @returns {Array} Datos filtrados
     */
    getTableData(tableId) {
        const tableConfig = this.tables.get(tableId);
        return tableConfig ? tableConfig.filteredData : [];
    }

    /**
     * Obtiene el elemento seleccionado de una tabla
     * @param {string} tableId - ID de la tabla
     * @returns {Array} Elementos seleccionados
     */
    getSelectedRows(tableId) {
        const tableElement = document.getElementById(tableId);
        if (!tableElement) return [];
        
        const selectedRows = tableElement.querySelectorAll('tr.table-row-selected');
        const tableConfig = this.tables.get(tableId);
        
        return Array.from(selectedRows).map(row => {
            const index = parseInt(row.dataset.index);
            return tableConfig?.filteredData[index];
        }).filter(Boolean);
    }
}

// ============================================
// INICIALIZACIÓN Y EXPORTACIÓN
// ============================================

// Crear instancia global
let tableRendererInstance = null;

/**
 * Inicializa el TableRenderer
 */
function initializeTableRenderer() {
    if (tableRendererInstance) {
        console.warn('⚠️ TableRenderer ya está inicializado');
        return tableRendererInstance;
    }
    
    console.log('🚀 Inicializando TableRenderer...');
    
    try {
        tableRendererInstance = new TableRenderer();
        console.log('✅ TableRenderer inicializado correctamente');
        return tableRendererInstance;
        
    } catch (error) {
        console.error('❌ Error inicializando TableRenderer:', error);
        return null;
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTableRenderer);
} else {
    initializeTableRenderer();
}

// Exportar al ámbito global
window.tableRenderer = {
    // Inicialización
    initialize: initializeTableRenderer,
    getInstance: () => tableRendererInstance,
    
    // Métodos principales
    registerTable: (tableId, config) => {
        if (tableRendererInstance) {
            return tableRendererInstance.registerTable(tableId, config);
        }
        return null;
    },
    
    updateTableData: (tableId, data, preserveSort) => {
        if (tableRendererInstance) {
            return tableRendererInstance.updateTableData(tableId, data, preserveSort);
        }
        return null;
    },
    
    applyFilters: (tableId, filters) => {
        if (tableRendererInstance) {
            return tableRendererInstance.applyTableFilters(tableId, filters);
        }
        return null;
    },
    
    sortTable: (tableId, columnKey, direction) => {
        if (tableRendererInstance) {
            return tableRendererInstance.sortTable(tableId, columnKey, direction);
        }
        return null;
    },
    
    // Utilidades
    exportToCSV: (tableId, filename) => {
        if (tableRendererInstance) {
            return tableRendererInstance.exportToCSV(tableId, filename);
        }
        return null;
    },
    
    getTableData: (tableId) => {
        if (tableRendererInstance) {
            return tableRendererInstance.getTableData(tableId);
        }
        return [];
    },
    
    showLoading: (tableId, show) => {
        if (tableRendererInstance) {
            return tableRendererInstance.showLoading(tableId, show);
        }
        return null;
    },
    
    // Métodos de conveniencia para las tablas específicas
    setupInventoryTable: () => {
        if (!tableRendererInstance) return null;
        
        return tableRendererInstance.registerTable('tablaInventario', {
            columns: [
                { key: 'codigo_barras', title: 'Código de Barras', sortable: true },
                { key: 'descripcion', title: 'Descripción', sortable: true },
                { key: 'cantidad', title: 'Cantidad', type: 'stock', sortable: true },
                { key: 'costo', title: 'Costo', type: 'currency', sortable: true },
                { key: 'precio', title: 'Precio Venta', type: 'currency', sortable: true },
                { key: 'fecha_actualizacion', title: 'Última Actualización', type: 'date', sortable: true },
                { 
                    key: 'actions', 
                    title: 'Acciones',
                    render: (item) => `
                        <button class="action-btn btn-edit" onclick="window.inventory.editarInventario('${item.codigo_barras}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    `
                }
            ],
            defaultSort: 'fecha_actualizacion',
            defaultSortDirection: 'desc',
            pageSize: 50,
            virtualScroll: true,
            onRowClick: (item) => {
                window.inventory.editarInventario(item.codigo_barras);
            }
        });
    },
    
    setupSalesTable: () => {
        if (!tableRendererInstance) return null;
        
        return tableRendererInstance.registerTable('tablaVentas', {
            columns: [
                { key: 'codigo_barras', title: 'Código de Barras', sortable: true },
                { key: 'cantidad', title: 'Cantidad', sortable: true, className: 'text-right' },
                { key: 'precio_unitario', title: 'Precio Unitario', type: 'currency', sortable: true, className: 'text-right' },
                { 
                    key: 'descuento', 
                    title: 'Descuento', 
                    type: 'currency', 
                    sortable: true, 
                    className: 'text-right',
                    render: (item) => {
                        const descuento = parseFloat(item.descuento || 0);
                        return descuento > 0 ? `-$${descuento.toFixed(2)}` : '$0.00';
                    }
                },
                { key: 'total', title: 'Total', type: 'currency', sortable: true, className: 'text-right' },
                { key: 'descripcion', title: 'Descripción', sortable: true },
                { key: 'fecha_venta', title: 'Fecha Venta', type: 'date', sortable: true },
                { 
                    key: 'actions', 
                    title: 'Acciones',
                    render: (item) => `
                        <button class="action-btn btn-edit" 
                                onclick="window.sales.editarVenta('${item.codigo_barras}', '${item.fecha_venta}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    `
                }
            ],
            defaultSort: 'fecha_venta',
            defaultSortDirection: 'desc',
            pageSize: 50,
            virtualScroll: true
        });
    }
};

console.log('📊 Módulo TableRenderer cargado');
