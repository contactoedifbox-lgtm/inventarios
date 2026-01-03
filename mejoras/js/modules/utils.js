// mejoras/js/modules/utils.js - VERSIÓN SIMPLIFICADA
import { StateManager, Constants } from '../config/supabase-config.js';

const DateTimeUtils = {
    getCurrentChileISO() {
        // Simplemente devuelve la hora actual en ISO
        return new Date().toISOString();
    },
    
    formatToChileTime(dateString) {
        if (!dateString) return 'Sin fecha';
        
        try {
            // La fecha viene en UTC desde Supabase
            const fecha = new Date(dateString);
            if (isNaN(fecha.getTime())) return 'Fecha inválida';
            
            // Usar la hora local del navegador (que debería estar en Chile)
            // No aplicar ningún offset manual
            const fechaLocal = new Date(fecha);
            
            const dia = fechaLocal.getDate().toString().padStart(2, '0');
            const mes = (fechaLocal.getMonth() + 1).toString().padStart(2, '0');
            const año = fechaLocal.getFullYear();
            const hora = fechaLocal.getHours().toString().padStart(2, '0');
            const minutos = fechaLocal.getMinutes().toString().padStart(2, '0');
            const segundos = fechaLocal.getSeconds().toString().padStart(2, '0');
            
            return `${dia}/${mes}/${año} ${hora}:${minutos}:${segundos}`;
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return dateString || 'Sin fecha';
        }
    },
    
    formatShortChileTime(dateString) {
        if (!dateString) return '--:--';
        
        try {
            const fecha = new Date(dateString);
            if (isNaN(fecha.getTime())) return '--:--';
            
            const fechaLocal = new Date(fecha);
            return `${fechaLocal.getHours().toString().padStart(2, '0')}:${fechaLocal.getMinutes().toString().padStart(2, '0')}`;
        } catch (error) {
            return '--:--';
        }
    },
    
    getCurrentChileDate() {
        // Usar fecha local del navegador
        const fecha = new Date();
        
        const opciones = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'America/Santiago' // Especificar zona horaria explícitamente
        };
        
        return fecha.toLocaleDateString('es-CL', opciones);
    },
    
    getTodayChileDate() {
        const fecha = new Date();
        
        // Especificar zona horaria de Chile
        const fechaChile = new Date(fecha.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
        
        const año = fechaChile.getFullYear();
        const mes = (fechaChile.getMonth() + 1).toString().padStart(2, '0');
        const dia = fechaChile.getDate().toString().padStart(2, '0');
        
        return `${año}-${mes}-${dia}`;
    },
    
    // Función para debug: muestra las horas en diferentes formatos
    debugTime(dateString) {
        const fecha = new Date(dateString);
        const ahora = new Date();
        
        console.log('=== DEBUG HORA ===');
        console.log('Hora PC actual:', ahora.toLocaleString('es-CL', { timeZone: 'America/Santiago' }));
        console.log('Fecha de Supabase (UTC):', fecha.toISOString());
        console.log('Fecha de Supabase (Chile):', fecha.toLocaleString('es-CL', { timeZone: 'America/Santiago' }));
        console.log('Diferencia minutos:', (fecha.getTime() - ahora.getTime()) / 60000);
        console.log('=== FIN DEBUG ===');
        
        return fecha.toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    }
};

// ... el resto del archivo se mantiene igual
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

// ========== FUNCIÓN COMPARTIDA PARA ACTUALIZACIÓN INCREMENTAL ==========

/**
 * Actualiza una fila específica en la tabla de inventario
 * Usada por ventas múltiples, eliminación individual y eliminación agrupada
 */
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
                
                // Actualizar solo la fila afectada
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
    
    /**
     * Actualiza múltiples productos en inventario después de eliminar venta agrupada
     */
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
