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
        const mes = (fechaChile.getMonth() + 1).toString().padStart(2, '0');
        const dia = fechaChile.getDate().toString().padStart(2, '0');
        
        return `${año}-${mes}-${dia}`;
    }
};

const InventoryUtils = {
    getStockStatus(cantidad) {
        if (cantidad <= Constants.STOCK_LEVELS.VERY_LOW) {
            return { class: 'stock-low', text: 'Muy Bajo' };
        }
        if (cantidad <= Constants.STOCK_LEVELS.LOW) {
            return { class: 'stock-medium', text: 'Bajo' };
        }
        return { class: 'stock-good', text: 'Disponible' };
    },
    
    calculateSaleTotal(cantidad, precioUnitario, descuento = 0) {
        const subtotal = cantidad * precioUnitario;
        const total = Math.max(subtotal - descuento, 0);
        return {
            subtotal: subtotal,
            total: total,
            isValid: descuento <= subtotal && descuento >= 0
        };
    },
    
    validateSaleData(cantidad, precioUnitario, descuento = 0) {
        const errors = [];
        
        if (cantidad <= 0) errors.push('La cantidad debe ser mayor a 0');
        if (precioUnitario <= 0) errors.push('El precio debe ser mayor a 0');
        if (descuento < 0) errors.push('El descuento no puede ser negativo');
        
        const { isValid } = this.calculateSaleTotal(cantidad, precioUnitario, descuento);
        if (!isValid) errors.push('El descuento no puede ser mayor al subtotal');
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
};

const StringUtils = {
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    safeInnerHTML(element, html) {
        element.innerHTML = this.escapeHTML(html);
    }
};

// ========== FUNCIONES NUEVAS PARA VENTAS MÚLTIPLES ==========

const SalesUtils = {
    // Generar ID único para venta agrupada
    generateGroupedSaleId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `${Constants.VENTA_PREFIX}${timestamp}${random}`;
    },
    
    // Validar línea de venta
    validateSaleLine(linea) {
        const errors = [];
        
        if (!linea.producto) {
            errors.push('Producto no seleccionado');
        }
        
        if (linea.cantidad <= 0) {
            errors.push('La cantidad debe ser mayor a 0');
        }
        
        if (linea.precio <= 0) {
            errors.push('El precio debe ser mayor a 0');
        }
        
        if (linea.descuento < 0) {
            errors.push('El descuento no puede ser negativo');
        }
        
        if (linea.producto && linea.cantidad > linea.producto.cantidad) {
            errors.push(`Stock insuficiente. Disponible: ${linea.producto.cantidad}`);
        }
        
        const { isValid } = InventoryUtils.calculateSaleTotal(
            linea.cantidad, 
            linea.precio, 
            linea.descuento
        );
        
        if (!isValid) {
            errors.push('El descuento no puede ser mayor al subtotal');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },
    
    // Formatear número como moneda
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },
    
    // Obtener productos únicos de un array de líneas
    getUniqueProducts(lineas) {
        const productosUnicos = [];
        const codigosVistos = new Set();
        
        lineas.forEach(linea => {
            if (linea.producto && !codigosVistos.has(linea.producto.codigo_barras)) {
                codigosVistos.add(linea.producto.codigo_barras);
                productosUnicos.push(linea.producto);
            }
        });
        
        return productosUnicos;
    }
};

export { DateTimeUtils, InventoryUtils, StringUtils, SalesUtils };
