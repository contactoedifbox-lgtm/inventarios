import { StateManager, Constants } from '../config/supabase-config.js';

const DateTimeUtils = {
    getCurrentChileISO() {
        return new Date().toISOString();
    },
    
    // mejoras/js/modules/utils.js - VERSIÓN LIMPIA
formatToChileTime(dateString) {
    if (!dateString) return 'Sin fecha';
    
    try {
        // Convertir a objeto Date
        let fecha;
        
        if (dateString.includes('T')) {
            // Es formato ISO
            fecha = new Date(dateString);
        } 
        else {
            fecha = new Date(dateString);
        }
        
        if (isNaN(fecha.getTime())) {
            return 'Fecha inválida';
        }
        
        // Convertir a fecha Chile (UTC-3)
        const fechaUTC = new Date(dateString.trim());
        const offsetChile = 0; // Horas a restar para Chile
        const fechaChile = new Date(fechaUTC.getTime() + (offsetChile * 60 * 60 * 1000));
        
        // Formatear
        const dia = fechaChile.getDate().toString().padStart(2, '0');
        const mes = (fechaChile.getMonth() + 1).toString().padStart(2, '0');
        const año = fechaChile.getFullYear();
        const hora = fechaChile.getHours().toString().padStart(2, '0');
        const minutos = fechaChile.getMinutes().toString().padStart(2, '0');
        const segundos = fechaChile.getSeconds().toString().padStart(2, '0');
        
        return `${dia}/${mes}/${año} ${hora}:${minutos}:${segundos}`;
        
    } catch (error) {
        return dateString || 'Sin fecha';
    }
},
    
    formatShortChileTime(dateString) {
        if (!dateString) return '--:--';
        
        try {
            const fecha = new Date(dateString);
            if (isNaN(fecha.getTime())) return '--:--';
            
            // Misma corrección
            const offsetChile = 0;
            const fechaCorregida = new Date(fecha.getTime() + (offsetChile * 60 * 60 * 1000));
            
            return `${fechaCorregida.getHours().toString().padStart(2, '0')}:${fechaCorregida.getMinutes().toString().padStart(2, '0')}`;
        } catch (error) {
            return '--:--';
        }
    },
    
    getCurrentChileDate() {
        const ahora = new Date();
        
        // Para mostrar fecha actual, usar hora local
        const opciones = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        };
        
        return ahora.toLocaleDateString('es-CL', opciones);
    },
    
    getTodayChileDate() {
        const ahora = new Date();
        const año = ahora.getFullYear();
        const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
        const dia = ahora.getDate().toString().padStart(2, '0');
        
        return `${año}-${mes}-${dia}`;
    },
    
    // Función para diagnóstico
    debugFecha(dateString) {
        const fecha = new Date(dateString);
        
        console.log('=== DEBUG FECHA ===');
        console.log('Original:', dateString);
        console.log('Date object:', fecha);
        console.log('toISOString():', fecha.toISOString());
        console.log('getHours():', fecha.getHours());
        console.log('getUTCHours():', fecha.getUTCHours());
        console.log('toLocaleString (CL):', fecha.toLocaleString('es-CL'));
        console.log('Diferencia getHours vs getUTCHours:', fecha.getHours() - fecha.getUTCHours());
        console.log('=== FIN DEBUG ===');
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

const SalesUtils = {
    generateGroupedSaleId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `${Constants.VENTA_PREFIX}${timestamp}${random}`;
    },
    
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
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },
    
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

const InventoryUISync = {
    updateSingleInventoryRow(barcode, nuevoStock) {
        const producto = StateManager.getProducto(barcode);
        if (!producto) return;
        
        const tbody = document.getElementById('inventarioBody');
        if (!tbody) return;
        
        const filas = tbody.getElementsByTagName('tr');
        
        for (let fila of filas) {
            const codigoCelda = fila.cells[0].textContent.trim();
            if (codigoCelda === barcode) {
                const stockBadge = InventoryUtils.getStockStatus(nuevoStock);
                const fecha = DateTimeUtils.formatToChileTime(producto.fecha_actualizacion);
                
                fila.cells[1].innerHTML = producto.descripcion ? 
                    StringUtils.escapeHTML(producto.descripcion) : 
                    '<span style="color: #94a3b8;">Sin descripción</span>';
                
                fila.cells[2].innerHTML = `<span class="stock-badge ${stockBadge.class}">${nuevoStock} unidades</span>`;
                fila.cells[3].textContent = `$${parseFloat(producto.costo || 0).toFixed(2)}`;
                fila.cells[4].innerHTML = `<strong>$${parseFloat(producto.precio || 0).toFixed(2)}</strong>`;
                fila.cells[5].textContent = fecha;
                break;
            }
        }
    },
    
    updateMultipleInventoryRows(actualizaciones) {
        actualizaciones.forEach(({ barcode, nuevoStock }) => {
            this.updateSingleInventoryRow(barcode, nuevoStock);
        });
    }
};

export { 
    DateTimeUtils, 
    InventoryUtils, 
    StringUtils, 
    SalesUtils, 
    InventoryUISync 
};
