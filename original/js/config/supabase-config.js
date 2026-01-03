// Importar Supabase usando ES Modules
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import Constants from './constants.js';

const SUPABASE_URL = 'https://qnhmfvtqgwtlckcvzbhq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_791W4BHb07AeA_DX2EWZCQ_Fxlzv30o';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const StateManager = {
    inventario: [],
    ventas: [],
    ventasAgrupadas: [],
    productoEditando: null,
    ventaEditando: null,
    productoSeleccionado: null,
    currentUser: null,
    inventarioSincronizado: true,
    modoVisualizacionVentas: 'agrupado', // 'agrupado' o 'detallado'
    
    getInventario() {
        return [...this.inventario];
    },
    
    setInventario(nuevosDatos) {
        this.inventario = [...nuevosDatos];
    },
    
    getVentas() {
        return [...this.ventas];
    },
    
    setVentas(nuevasVentas) {
        this.ventas = [...nuevasVentas];
        this.actualizarVentasAgrupadas();
    },
    
    // NUEVO: Agrupar ventas para visualización
    actualizarVentasAgrupadas() {
        const agrupadas = {};
        
        this.ventas.forEach(venta => {
            const idVenta = venta.id_venta_agrupada || `IND-${venta.id}`;
            
            if (!agrupadas[idVenta]) {
                agrupadas[idVenta] = {
                    id_venta: idVenta,
                    fecha: venta.fecha_venta,
                    total: 0,
                    items: [],
                    expandida: false
                };
            }
            
            const subtotal = (venta.cantidad * venta.precio_unitario) - (venta.descuento || 0);
            agrupadas[idVenta].total += subtotal;
            agrupadas[idVenta].items.push(venta);
        });
        
        this.ventasAgrupadas = Object.values(agrupadas).sort((a, b) => 
            new Date(b.fecha) - new Date(a.fecha)
        );
    },
    
    getVentasAgrupadas() {
        return [...this.ventasAgrupadas];
    },
    
    toggleExpandirVenta(idVenta) {
        const venta = this.ventasAgrupadas.find(v => v.id_venta === idVenta);
        if (venta) {
            venta.expandida = !venta.expandida;
        }
    },
    
    updateInventoryItem(barcode, updates) {
        const index = this.inventario.findIndex(p => p.codigo_barras === barcode);
        if (index !== -1) {
            this.inventario[index] = { ...this.inventario[index], ...updates };
            return true;
        }
        return false;
    },
    
    getProducto(barcode) {
        return this.inventario.find(p => p.codigo_barras === barcode) || null;
    },
    
    getVenta(barcode, fechaVenta) {
        return this.ventas.find(v => v.barcode === barcode && v.fecha_venta === fechaVenta) || null;
    },
    
    clearState() {
        this.inventario = [];
        this.ventas = [];
        this.ventasAgrupadas = [];
        this.productoEditando = null;
        this.ventaEditando = null;
        this.productoSeleccionado = null;
    }
};

export { supabaseClient, StateManager, Constants };
