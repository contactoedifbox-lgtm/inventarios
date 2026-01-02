const Constants = {
    TIMEZONE_OFFSET: -3,
    
    STOCK_LEVELS: {
        VERY_LOW: 5,
        LOW: 10
    },
    
    LOCAL_STORAGE_KEYS: {
        OFFLINE_SALES: 'ventas_offline_cliente',
        OFFLINE_INVENTORY: 'inventario_offline_cliente'
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
        ORDERS: 'modalEncargos'
    }
};

export default Constants;
