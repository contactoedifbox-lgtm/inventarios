// mejoras/js/modules/utils.js - CORRECCIÓN FINAL
import { StateManager, Constants } from '../config/supabase-config.js';

const DateTimeUtils = {
    getCurrentChileISO() {
        // Devuelve la hora actual de Chile en formato ISO
        const ahora = new Date();
        return ahora.toISOString();
    },
    
    formatToChileTime(dateString) {
        if (!dateString) return 'Sin fecha';
        
        try {
            // La fecha viene en UTC desde Supabase
            const fechaUTC = new Date(dateString);
            if (isNaN(fechaUTC.getTime())) return 'Fecha inválida';
            
            // IMPORTANTE: Supabase devuelve en UTC
            // Chile está en UTC-3, así que para convertir UTC a hora Chile
            // necesitamos RESTAR 3 horas: UTC - 3 = Hora Chile
            // Pero JavaScript Date interpreta la fecha UTC como si fuera local
            // así que necesitamos AJUSTAR LA DIFERENCIA
            
            // Opción 1: Sumar 3 horas para compensar
            // UTC 13:00 → Chile 10:00 (UTC-3)
            // Si queremos mostrar 13:00 en Chile, sumamos 3
            const offsetChile = 3; // IMPORTANTE: POSITIVO para sumar
            const fechaChile = new Date(fechaUTC.getTime() + (offsetChile * 60 * 60 * 1000));
            
            // Opción 2: Formatear directamente con zona horaria de Chile
            // Esta es más precisa
            try {
                const fechaFormateada = new Date(dateString).toLocaleString('es-CL', {
                    timeZone: 'America/Santiago',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
                return fechaFormateada.replace(',', '');
            } catch (e) {
                // Fallback a cálculo manual
                const dia = fechaChile.getDate().toString().padStart(2, '0');
                const mes = (fechaChile.getMonth() + 1).toString().padStart(2, '0');
                const año = fechaChile.getFullYear();
                const hora = fechaChile.getHours().toString().padStart(2, '0');
                const minutos = fechaChile.getMinutes().toString().padStart(2, '0');
                const segundos = fechaChile.getSeconds().toString().padStart(2, '0');
                
                return `${dia}/${mes}/${año} ${hora}:${minutos}:${segundos}`;
            }
            
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
            
            try {
                return new Date(dateString).toLocaleTimeString('es-CL', {
                    timeZone: 'America/Santiago',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            } catch (e) {
                // Fallback
                const fechaChile = new Date(fecha.getTime() + (3 * 60 * 60 * 1000));
                return `${fechaChile.getHours().toString().padStart(2, '0')}:${fechaChile.getMinutes().toString().padStart(2, '0')}`;
            }
        } catch (error) {
            return '--:--';
        }
    },
    
    getCurrentChileDate() {
        const opciones = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'America/Santiago'
        };
        
        return new Date().toLocaleDateString('es-CL', opciones);
    },
    
    getTodayChileDate() {
        try {
            const fechaChile = new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' });
            const fecha = new Date(fechaChile);
            
            const año = fecha.getFullYear();
            const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
            const dia = fecha.getDate().toString().padStart(2, '0');
            
            return `${año}-${mes}-${dia}`;
        } catch (e) {
            // Fallback
            const fecha = new Date();
            const año = fecha.getFullYear();
            const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
            const dia = fecha.getDate().toString().padStart(2, '0');
            return `${año}-${mes}-${dia}`;
        }
    },
    
    // Función para diagnóstico
    getTimeDetails(dateString) {
        const fechaUTC = new Date(dateString);
        const fechaLocal = new Date();
        
        console.log('=== DIAGNÓSTICO HORA ===');
        console.log('Fecha UTC de Supabase:', fechaUTC.toISOString());
        console.log('Hora UTC:', fechaUTC.getUTCHours() + ':' + fechaUTC.getUTCMinutes());
        console.log('Hora local navegador:', fechaLocal.getHours() + ':' + fechaLocal.getMinutes());
        console.log('toLocaleString (Chile):', fechaUTC.toLocaleString('es-CL', { timeZone: 'America/Santiago' }));
        console.log('Diferencia UTC-Chile (horas):', (fechaUTC.getTime() - fechaLocal.getTime()) / 3600000);
        console.log('=== FIN DIAGNÓSTICO ===');
        
        return {
            utc: fechaUTC.toISOString(),
            chile: fechaUTC.toLocaleString('es-CL', { timeZone: 'America/Santiago' })
        };
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
