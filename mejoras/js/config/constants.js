const Constants = {
    TIMEZONE_OFFSET: -6,
    
    STOCK_LEVELS: {
        VERY_LOW: 5,
        LOW: 10
    },
    
    LOCAL_STORAGE_KEYS: {
        OFFLINE_SALES: 'ventas_offline_cliente',
        OFFLINE_INVENTORY: 'inventario_offline_cliente',
        OFFLINE_MULTIPLE_SALES: 'ventas_multiples_offline_cliente' // NUEVO
    },
    
    API_ENDPOINTS: {
        INVENTORY_VIEW: 'vista_inventario_cliente',
        SALES_VIEW: 'vista_ventas_cliente',
        SALES_TABLE: 'ventas',
        INVENTORY_TABLE: 'inventario'
    },
    
    RPC_FUNCTIONS: {
        EDIT_INVENTORY: 'editar_inventario_cliente',
        EDIT_SALE: 'editar_cantidad_venta_cliente'
    },
    
    NOTIFICATION_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },
    
    MODAL_IDS: {
        INVENTORY: 'modalInventario',
        SALE: 'modalVenta',
        ADD_SALE: 'modalAgregarVenta',
        MULTIPLE_SALE: 'modalVentaMultiple', // NUEVO
        ORDERS: 'modalEncargos'
    },
    
    // ========== NUEVAS CONSTANTES PARA VENTAS MÚLTIPLES ==========
    
    VENTA_PREFIX: 'VET-', // Prefijo para IDs de venta agrupada
    
    DEFAULT_VENTA_LINEA: {
        producto: null,
        cantidad: 1,
        precio: 0,
        descuento: 0,
        subtotal: 0
    },
    
    // Configuración de columnas para exportación
    EXPORT_COLUMNS: {
        VENTAS: [
            'id_venta_agrupada',
            'numero_linea',
            'codigo_barras',
            'descripcion',
            'cantidad',
            'precio_unitario',
            'descuento',
            'total',
            'fecha_venta'
        ],
        INVENTARIO: [
            'codigo_barras',
            'descripcion',
            'cantidad',
            'costo',
            'precio',
            'fecha_actualizacion'
        ]
    },
    
    // Límites de la aplicación
    LIMITS: {
        MAX_LINEAS_POR_VENTA: 20, // Máximo 20 productos por venta
        MAX_VENTAS_POR_CARGA: 200 // Máximo 200 ventas en tabla
    },
    
    // Formato de fecha/hora
    DATE_FORMATS: {
        DISPLAY: 'DD/MM/YYYY HH:mm:ss',
        DATABASE: 'YYYY-MM-DD HH:mm:ss.SSSSSS',
        CSV: 'DD/MM/YYYY HH:mm:ss'
    }
};

export default Constants;
