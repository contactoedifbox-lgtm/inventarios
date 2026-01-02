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

export { DateTimeUtils, InventoryUtils, StringUtils };
