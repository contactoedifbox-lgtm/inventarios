// ========== UTILIDADES ESENCIALES ==========

export const CHILE_TIMEZONE = 'America/Santiago';
export const STOCK_LOW = 10;
export const STOCK_VERY_LOW = 5;

// ========== FECHAS (¡SIMPLIFICADO!) ==========
export function formatChileTime(dateString) {
    if (!dateString) return 'Sin fecha';
    
    try {
        return new Date(dateString).toLocaleString('es-CL', {
            timeZone: CHILE_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');
    } catch (error) {
        return dateString;
    }
}

export function formatShortTime(dateString) {
    if (!dateString) return '--:--';
    
    try {
        return new Date(dateString).toLocaleTimeString('es-CL', {
            timeZone: CHILE_TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (error) {
        return '--:--';
    }
}

export function getTodayDate() {
    return new Date().toLocaleDateString('es-CL', {
        timeZone: CHILE_TIMEZONE,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ========== VALIDACIONES ==========
export function validateSale(cantidad, precio, descuento = 0) {
    const errors = [];
    
    if (cantidad <= 0) errors.push('Cantidad debe ser mayor a 0');
    if (precio <= 0) errors.push('Precio debe ser mayor a 0');
    if (descuento < 0) errors.push('Descuento no puede ser negativo');
    
    const subtotal = cantidad * precio;
    if (descuento > subtotal) errors.push('Descuento mayor al subtotal');
    
    return {
        valid: errors.length === 0,
        errors
    };
}

export function calculateTotal(cantidad, precio, descuento = 0) {
    const subtotal = cantidad * precio;
    return Math.max(subtotal - descuento, 0);
}

// ========== STOCK STATUS ==========
export function getStockStatus(cantidad) {
    if (cantidad <= STOCK_VERY_LOW) {
        return { class: 'stock-low', text: 'Muy Bajo' };
    }
    if (cantidad <= STOCK_LOW) {
        return { class: 'stock-medium', text: 'Bajo' };
    }
    return { class: 'stock-good', text: 'Disponible' };
}

// ========== SEGURIDAD HTML ==========
export function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== GENERADOR ID ==========
export function generateSaleId() {
    return `VET-${Date.now()}${Math.floor(Math.random() * 1000)}`;
}
