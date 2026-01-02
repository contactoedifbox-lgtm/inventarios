const Constants = {
    TIMEZONE_OFFSET: -3,
    
    STOCK_LEVELS: {
        VERY_LOW: 5,
        LOW: 10
    },
    
    LOCAL_STORAGE_KEYS: {
        OFFLINE_SALES: 'ventas_offline_mejoras',
        OFFLINE_INVENTORY: 'inventario_offline_mejoras'
    },
    
    API_ENDPOINTS: {
        INVENTORY_VIEW: 'vista_inventario_mejoras',
        SALES_VIEW: 'vista_ventas_mejoras',
        SALES_TABLE: 'ventas_mejoras',
        INVENTORY_TABLE: 'inventario_mejoras'
    },
    
    RPC_FUNCTIONS: {
        EDIT_INVENTORY: 'editar_inventario_mejoras',
        EDIT_SALE: 'editar_cantidad_venta_mejoras'
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
        ORDERS: 'modalEncargos'
    }
};

export default Constants;
