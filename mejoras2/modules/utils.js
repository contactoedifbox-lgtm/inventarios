import { Constants } from '../config/supabase-config.js';

const DateTimeUtils = {
    getCurrentChileISO() {
        const ahora = new Date();
        const horaChile = new Date(ahora.getTime() + Constants.TIMEZONE_OFFSET * 60 * 60 * 1000);
        return horaChile.toISOString();
    },
    
    formatToChileTime(dateString) {
        if (!dateString) return 'Sin fecha';
        
        try {
            let fecha = new Date(dateString);
            if (isNaN(fecha.getTime())) return 'Fecha inválida';
            
            fecha = new Date(fecha.getTime() + Constants.TIMEZONE_OFFSET * 60 * 60 * 1000);
            
            const dia = fecha.getDate().toString().padStart(2, '0');
            const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
            const año = fecha.getFullYear();
            const hora = fecha.getHours().toString().padStart(2, '0');
            const minutos = fecha.getMinutes().toString().padStart(2, '0');
            const segundos = fecha.getSeconds().toString().padStart(2, '0');
            
            return `${dia}/${mes}/${año} ${hora}:${minutos}:${segundos}`;
        } catch (error) {
            return dateString || 'Sin fecha';
        }
    },
    
    formatShortChileTime(dateString) {
        if (!dateString) return '--:--';
        
        try {
            let fecha = new Date(dateString);
            if (isNaN(fecha.getTime())) return '--:--';
            
            fecha = new Date(fecha.getTime() + Constants.TIMEZONE_OFFSET * 60 * 60 * 1000);
            return `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
        } catch (error) {
            return '--:--';
        }
    },
    
    getCurrentChileDate() {
        const ahora = new Date();
        const fechaChile = new Date(ahora.getTime() + Constants.TIMEZONE_OFFSET * 60 * 60 * 1000);
        
        const opciones = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        };
        
        return fechaChile.toLocaleDateString('es-CL', opciones);
    },
    
    getTodayChileDate() {
        const ahora = new Date();
        const fechaChile = new Date(ahora.getTime() + Constants.TIMEZONE_OFFSET * 60 * 60 * 1000);
        
        const año = fechaChile.getFullYear();
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const dia = fechaChile.getDate().toString().padStart(2, '0');
        
        return `${año}-${mes}-${dia}`;
    }
};

const InventoryUtils = {
    getStockStatus(cantidad) {
        if (cantidad <= Constants.STOCK_LEVELS.VERY_LOW) {
            return { class: 'stock-low', text: 'Muy
