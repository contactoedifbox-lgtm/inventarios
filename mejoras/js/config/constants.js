const Constants = {
    TIMEZONE_OFFSET: -3,
    
    STOCK_LEVELS: {
        VERY_LOW: 5,
        LOW: 10
    },
    
    LOCAL_STORAGE_KEYS: {
        OFFLINE_SALES: 'ventas_offline_cliente',
        OFFLINE_INVENTORY: 'inventario_offline_cliente',
        OFFLINE_MULTIPLE_SALES: 'ventas_multiple_offline_cliente' // NUEVO
    },
    
    API_ENDPOINTS: {
        INVENTORY_VIEW: 'vista_inventario_cliente',
        SALES_VIEW: 'vista_ventas_cliente',
        SALES_TABLE: 'ventas',
        INVENTORY_TABLE: 'inventario'
    },
    
    RPC_FUNCTIONS: {
        EDIT_INVENTORY: 'editar_inventario_cliente',
        EDIT_SALE: 'editar_cantidad_venta'
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
        ORDERS: 'modalEncargos',
        MULTIPLE_SALE: 'modalVentaMultiple' // NUEVO
    },
    
    // NUEVAS CONSTANTES PARA VENTAS MÚLTIPLES
    MULTIPLE_SALE: {
        PREFIX: 'VET-',
        NEXT_ID_KEY: 'next_venta_id_cliente',
        MAX_LINES: 20,
        DEFAULT_CANTIDAD: 1,
        DEFAULT_DESCUENTO: 0
    },
    
    // FORMATOS DE FECHA
    DATE_FORMATS: {
        DISPLAY: 'DD/MM/YYYY HH:mm:ss',
        DATE_ONLY: 'DD/MM/YYYY',
        TIME_ONLY: 'HH:mm:ss',
        ISO: 'YYYY-MM-DDTHH:mm:ss'
    }
};

export default Constants;
