// ========== CLIENTE SUPABASE UNIFICADO ==========

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://qnhmfvtqgwtlckcvzbhq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_791W4BHb07AeA_DX2EWZCQ_Fxlzv30o';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class ApiClient {
    // ========== INVENTARIO ==========
    async loadInventory() {
        const { data, error } = await supabase
            .from('vista_inventario_cliente')
            .select('*')
            .order('fecha_actualizacion', { ascending: false });
            
        if (error) throw error;
        return data || [];
    }
    
    async updateInventory(barcode, updates) {
        const { data, error } = await supabase.rpc('editar_inventario_cliente', {
            p_barcode: barcode,
            p_descripcion: updates.descripcion,
            p_cantidad: updates.cantidad,
            p_costo: updates.costo,
            p_precio: updates.precio
        });
        
        if (error) throw error;
        return data;
    }
    
    // ========== VENTAS ==========
    async loadSales(limit = 200) {
        const { data, error } = await supabase
            .from('vista_ventas_cliente')
            .select('*')
            .order('fecha_venta', { ascending: false })
            .limit(limit);
            
        if (error) throw error;
        return data || [];
    }
    
    async createSale(saleData) {
        const { data, error } = await supabase
            .from('ventas')
            .insert([saleData])
            .select();
            
        if (error) throw error;
        return data?.[0] || null;
    }
    
    async updateSale(saleId, updates) {
        const { data, error } = await supabase
            .from('ventas')
            .update(updates)
            .eq('id', saleId)
            .select();
            
        if (error) throw error;
        return data?.[0] || null;
    }
    
    async deleteSale(saleId) {
        const { error } = await supabase
            .from('ventas')
            .delete()
            .eq('id', saleId);
            
        if (error) throw error;
        return true;
    }
    
    async updateStock(barcode, newStock) {
        const { error } = await supabase
            .from('inventario')
            .update({ 
                cantidad: newStock,
                fecha_actualizacion: new Date().toISOString()
            })
            .eq('barcode', barcode);
            
        if (error) throw error;
        return true;
    }
    
    // ========== AUTH ==========
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        return data;
    }
    
    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return true;
    }
    
    async getSession() {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
    }
}

export default new ApiClient();
