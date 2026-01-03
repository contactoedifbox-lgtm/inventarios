import { StateManager, Constants } from '../config/supabase-config.js';

const DateTimeUtils = {
    getCurrentChileISO() {
        return new Date().toISOString();
    },
    
    formatToChileTime(dateString) {
        if (!dateString) return 'Sin fecha';
        
        try {
            console.log('📅 Fecha recibida de Supabase:', dateString);
            
            // Convertir a objeto Date
            let fecha;
            
            // Formato Supabase: "2026-01-02 13:00:08.443"
            if (dateString.includes(' ') && dateString.includes(':')) {
                // Supabase NO incluye info de zona horaria, asumimos que es UTC
                const isoString = dateString.replace(' ', 'T') + 'Z';
                fecha = new Date(isoString);
                console.log('Convertido a Date (UTC):', fecha.toISOString());
            } 
            // Formato ISO con Z
            else if (dateString.includes('T') && dateString.includes('Z')) {
                fecha = new Date(dateString);
            }
            // Otro formato
            else {
                fecha = new Date(dateString);
            }
            
            if (isNaN(fecha.getTime())) {
                console.error('Fecha inválida:', dateString);
                return 'Fecha inválida';
            }
            
            // ⚠️⚠️⚠️ PROBLEMA IDENTIFICADO ⚠️⚠️⚠️
            // La fecha viene como "13:00" (hora Chile) pero sin zona horaria
            // JavaScript la interpreta como UTC, y al convertir a hora Chile
            // le suma 3 horas -> 16:00
            
            // SOLUCIÓN: RESTAR 3 horas para compensar
            const offsetChile = -3; // ⬅️ NEGATIVO para RESTAR
            const fechaCorregida = new Date(fecha.getTime() + (offsetChile * 60 * 60 * 1000));
            
            console.log('Fecha corregida (restando 3h):', fechaCorregida.toISOString());
            
            // Formatear
            const dia = fechaCorregida.getDate().toString().padStart(2, '0');
            const mes = (fechaCorregida.getMonth() + 1).toString().padStart(2, '0');
            const año = fechaCorregida.getFullYear();
            const hora = fechaCorregida.getHours().toString().padStart(2, '0');
            const minutos = fechaCorregida.getMinutes().toString().padStart(2, '0');
            const segundos = fechaCorregida.getSeconds().toString().padStart(2, '0');
            
            const resultado = `${dia}/${mes}/${año} ${hora}:${minutos}:${segundos}`;
            console.log('Resultado final:', resultado);
            
            return resultado;
            
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
            
            // Misma corrección
            const offsetChile = -3;
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
