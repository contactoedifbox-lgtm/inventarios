// Importar Supabase usando ES Modules
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import Constants from './constants.js';

const SUPABASE_URL = 'https://qnhmfvtqgwtlckcvzbhq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_791W4BHb07AeA_DX2EWZCQ_Fxlzv30o';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const StateManager = {
    inventario: [],
    ventas: [],
    productoEditando: null,
    ventaEditando: null,
    productoSeleccionado: null,
    currentUser: null,
    inventarioSincronizado: true,
    
    getInventario() {
        return [...this.inventario];
    },
    
    setInventario(nuevosDatos) {
        this.inventario = [...nuevosDatos];
    },
    
    updateInventoryItem(codigoBarras, updates) {
        const index = this.inventario.findIndex(p => p.codigo_barras === codigoBarras);
        if (index !== -1) {
            this.inventario[index] = { ...this.inventario[index], ...updates };
            return true;
        }
        return false;
    },
    
    getProducto(codigoBarras) {
        return this.inventario.find(p => p.codigo_barras === codigoBarras) || null;
    },
    
    getVenta(codigoBarras, fechaVenta) {
        return this.ventas.find(v => v.codigo_barras === codigoBarras && v.fecha_venta === fechaVenta) || null;
    },
    
    setVentas(nuevasVentas) {
        this.ventas = [...nuevasVentas];
    },
    
    clearState() {
        this.inventario = [];
        this.ventas = [];
        this.productoEditando = null;
        this.ventaEditando = null;
        this.productoSeleccionado = null;
    }
};

export { supabaseClient, StateManager, Constants };
