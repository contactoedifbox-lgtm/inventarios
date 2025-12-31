/* ============================================
   UTILIDADES GENERALES
   ============================================
   Funciones de uso común en toda la aplicación:
   - Manejo de fechas y horas (Chile)
   - Formateo de datos
   - Validaciones
   - Funciones de ayuda
   ============================================ */

// ============================================
// MANEJO DE FECHAS Y HORAS (ZONA CHILE)
// ============================================

/**
 * Obtiene la fecha y hora actual en formato ISO para Chile (UTC-3)
 * @returns {string} Fecha en formato ISO (ej: "2024-01-15T14:30:45.123Z")
 */
function getHoraChileISO() {
    try {
        const ahora = new Date();
        
        // Chile está en UTC-3 (considerando horario estándar)
        // NOTA: Esta función no considera horario de verano
        // Para producción, usar librería como date-fns-tz
        const offset = -3; // UTC-3 para Chile continental
        const horaChile = new Date(ahora.getTime() + offset * 60 * 60 * 1000);
        
        return horaChile.toISOString();
    } catch (error) {
        console.error('Error al obtener hora Chile:', error);
        return new Date().toISOString(); // Fallback a hora local
    }
}

/**
 * Formatea una fecha string a formato legible para Chile
 * @param {string} fechaString - Fecha en formato ISO o string válido
 * @returns {string} Fecha formateada (ej: "15/01/2024 14:30:45")
 */
function formatoHoraChile(fechaString) {
    if (!fechaString) return 'Sin fecha';
    
    try {
        let fecha = new Date(fechaString);
        
        // Validar que sea una fecha válida
        if (isNaN(fecha.getTime())) {
            return 'Fecha inválida';
        }
        
        // Ajustar a zona Chile (UTC-3)
        const offset = 0; // Ya viene ajustada desde Supabase
        fecha = new Date(fecha.getTime() + offset * 60 * 60 * 1000);
        
        // Extraer componentes
        const dia = fecha.getDate().toString().padStart(2, '0');
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const año = fecha.getFullYear();
        const hora = fecha.getHours().toString().padStart(2, '0');
        const minutos = fecha.getMinutes().toString().padStart(2, '0');
        const segundos = fecha.getSeconds().toString().padStart(2, '0');
        
        return `${dia}/${mes}/${año} ${hora}:${minutos}:${segundos}`;
    } catch (error) {
        console.error('Error formateando fecha:', error, fechaString);
        return fechaString || 'Sin fecha';
    }
}

/**
 * Formato corto de hora (solo hora:minutos)
 * @param {string} fechaString - Fecha en formato ISO
 * @returns {string} Hora formateada (ej: "14:30")
 */
function formatoHoraCortaChile(fechaString) {
    if (!fechaString) return '--:--';
    
    try {
        let fecha = new Date(fechaString);
        if (isNaN(fecha.getTime())) return '--:--';
        
        const offset = 0;
        fecha = new Date(fecha.getTime() + offset * 60 * 60 * 1000);
        
        return `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
    } catch (error) {
        console.error('Error formateando hora corta:', error);
        return '--:--';
    }
}

/**
 * Obtiene la fecha actual de Chile en formato legible
 * @returns {string} Fecha formateada (ej: "Lunes, 15 de enero de 2024")
 */
function getFechaActualChile() {
    try {
        const ahora = new Date();
        const offset = -3;
        const fechaChile = new Date(ahora.getTime() + offset * 60 * 60 * 1000);
        
        const opciones = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'America/Santiago'
        };
        
        return fechaChile.toLocaleDateString('es-CL', opciones);
    } catch (error) {
        console.error('Error obteniendo fecha actual:', error);
        return new Date().toLocaleDateString('es-CL');
    }
}

/**
 * Obtiene la fecha de hoy en formato YYYY-MM-DD (para comparaciones)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function getFechaHoyChile() {
    try {
        const ahora = new Date();
        const offset = -3;
        const fechaChile = new Date(ahora.getTime() + offset * 60 * 60 * 1000);
        
        const año = fechaChile.getFullYear();
        const mes = (fechaChile.getMonth() + 1).toString().padStart(2, '0');
        const dia = fechaChile.getDate().toString().padStart(2, '0');
        
        return `${año}-${mes}-${dia}`;
    } catch (error) {
        console.error('Error obteniendo fecha hoy:', error);
        // Fallback a fecha local
        const ahora = new Date();
        return `${ahora.getFullYear()}-${(ahora.getMonth() + 1).toString().padStart(2, '0')}-${ahora.getDate().toString().padStart(2, '0')}`;
    }
}

/**
 * Calcula la diferencia en días entre dos fechas
 * @param {string} fecha1 - Primera fecha (ISO)
 * @param {string} fecha2 - Segunda fecha (ISO), usa hoy por defecto
 * @returns {number} Diferencia en días
 */
function diferenciaEnDias(fecha1, fecha2 = new Date().toISOString()) {
    try {
        const date1 = new Date(fecha1);
        const date2 = new Date(fecha2);
        
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    } catch (error) {
        console.error('Error calculando diferencia de días:', error);
        return 0;
    }
}

// ============================================
// FORMATEO DE DATOS
// ============================================

/**
 * Formatea un número como moneda chilena (CLP)
 * @param {number|string} valor - Valor a formatear
 * @param {boolean} incluirSimbolo - Incluir el símbolo $
 * @returns {string} Valor formateado (ej: "$1.234" o "1.234")
 */
function formatoMoneda(valor, incluirSimbolo = true) {
    try {
        const num = typeof valor === 'string' ? parseFloat(valor) : valor;
        
        if (isNaN(num)) {
            return incluirSimbolo ? '$0' : '0';
        }
        
        // Formato chileno: puntos para miles, coma para decimales
        const formateado = new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(num);
        
        return incluirSimbolo ? `$${formateado}` : formateado;
    } catch (error) {
        console.error('Error formateando moneda:', error, valor);
        return incluirSimbolo ? '$0' : '0';
    }
}

/**
 * Formatea un número con separadores de miles
 * @param {number|string} valor - Valor a formatear
 * @returns {string} Número formateado
 */
function formatoNumero(valor) {
    try {
        const num = typeof valor === 'string' ? parseFloat(valor) : valor;
        
        if (isNaN(num)) {
            return '0';
        }
        
        return new Intl.NumberFormat('es-CL').format(num);
    } catch (error) {
        console.error('Error formateando número:', error, valor);
        return '0';
    }
}

/**
 * Trunca un texto a una longitud máxima
 * @param {string} texto - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @param {string} suffix - Sufijo a agregar (ej: "...")
 * @returns {string} Texto truncado
 */
function truncarTexto(texto, maxLength = 50, suffix = '...') {
    if (!texto || typeof texto !== 'string') return '';
    
    if (texto.length <= maxLength) return texto;
    
    return texto.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitaliza la primera letra de un texto
 * @param {string} texto - Texto a capitalizar
 * @returns {string} Texto capitalizado
 */
function capitalizar(texto) {
    if (!texto || typeof texto !== 'string') return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// ============================================
// VALIDACIONES
// ============================================

/**
 * Valida si un string es un email válido
 * @param {string} email - Email a validar
 * @returns {boolean} True si es válido
 */
function esEmailValido(email) {
    if (!email || typeof email !== 'string') return false;
    
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valida si un string es un código de barras válido
 * @param {string} codigo - Código a validar
 * @returns {boolean} True si es válido
 */
function esCodigoBarrasValido(codigo) {
    if (!codigo || typeof codigo !== 'string') return false;
    
    // Código de barras debe tener al menos 3 caracteres
    // y contener solo números y letras
    const regex = /^[a-zA-Z0-9]{3,}$/;
    return regex.test(codigo);
}

/**
 * Valida si un número es positivo
 * @param {number|string} valor - Valor a validar
 * @returns {boolean} True si es positivo
 */
function esPositivo(valor) {
    try {
        const num = typeof valor === 'string' ? parseFloat(valor) : valor;
        return !isNaN(num) && num >= 0;
    } catch (error) {
        return false;
    }
}

/**
 * Valida si un valor es un número válido
 * @param {any} valor - Valor a validar
 * @returns {boolean} True si es número válido
 */
function esNumeroValido(valor) {
    if (valor === null || valor === undefined || valor === '') return false;
    
    const num = typeof valor === 'string' ? parseFloat(valor) : valor;
    return !isNaN(num) && isFinite(num);
}

// ============================================
// MANEJO DE ARRAYS Y OBJETOS
// ============================================

/**
 * Ordena un array de objetos por una propiedad
 * @param {Array} array - Array a ordenar
 * @param {string} propiedad - Propiedad por la que ordenar
 * @param {boolean} ascendente - True para orden ascendente
 * @returns {Array} Array ordenado
 */
function ordenarArray(array, propiedad, ascendente = true) {
    if (!Array.isArray(array)) return [];
    
    return [...array].sort((a, b) => {
        let valorA = a[propiedad];
        let valorB = b[propiedad];
        
        // Manejar valores undefined/null
        if (valorA == null) valorA = ascendente ? Infinity : -Infinity;
        if (valorB == null) valorB = ascendente ? Infinity : -Infinity;
        
        // Comparar números
        if (typeof valorA === 'number' && typeof valorB === 'number') {
            return ascendente ? valorA - valorB : valorB - valorA;
        }
        
        // Comparar strings
        valorA = String(valorA).toLowerCase();
        valorB = String(valorB).toLowerCase();
        
        if (valorA < valorB) return ascendente ? -1 : 1;
        if (valorA > valorB) return ascendente ? 1 : -1;
        return 0;
    });
}

/**
 * Filtra un array eliminando duplicados por una propiedad
 * @param {Array} array - Array a filtrar
 * @param {string} propiedad - Propiedad para identificar duplicados
 * @returns {Array} Array sin duplicados
 */
function eliminarDuplicados(array, propiedad) {
    if (!Array.isArray(array)) return [];
    
    const seen = new Set();
    return array.filter(item => {
        const valor = item[propiedad];
        if (seen.has(valor)) {
            return false;
        }
        seen.add(valor);
        return true;
    });
}

/**
 * Agrupa un array de objetos por una propiedad
 * @param {Array} array - Array a agrupar
 * @param {string} propiedad - Propiedad para agrupar
 * @returns {Object} Objeto con los grupos
 */
function agruparPor(array, propiedad) {
    if (!Array.isArray(array)) return {};
    
    return array.reduce((grupos, item) => {
        const clave = item[propiedad];
        if (!grupos[clave]) {
            grupos[clave] = [];
        }
        grupos[clave].push(item);
        return grupos;
    }, {});
}

// ============================================
// FUNCIONES DE AYUDA
// ============================================

/**
 * Debounce: Ejecuta una función después de un delay, cancelando llamadas previas
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función debounced
 */
function debounce(func, wait = 300) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle: Ejecuta una función como máximo una vez cada X tiempo
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Límite de tiempo en ms
 * @returns {Function} Función throttled
 */
function throttle(func, limit = 300) {
    let inThrottle;
    
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} True si se copió exitosamente
 */
async function copiarAlPortapapeles(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            // Método moderno (requiere HTTPS)
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Método fallback
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const result = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            return result;
        }
    } catch (error) {
        console.error('Error copiando al portapapeles:', error);
        return false;
    }
}

/**
 * Descarga un archivo (CSV, JSON, etc.)
 * @param {string} contenido - Contenido del archivo
 * @param {string} nombre - Nombre del archivo
 * @param {string} tipo - Tipo MIME (ej: 'text/csv')
 */
function descargarArchivo(contenido, nombre = 'archivo', tipo = 'text/plain') {
    try {
        const blob = new Blob([contenido], { type: tipo });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = nombre;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        
    } catch (error) {
        console.error('Error descargando archivo:', error);
    }
}

// ============================================
// MANEJO DE STORAGE (LOCALSTORAGE)
// ============================================

/**
 * Guarda datos en localStorage con expiración
 * @param {string} clave - Clave para guardar
 * @param {any} valor - Valor a guardar
 * @param {number} expiracionMinutos - Minutos hasta expirar (0 = sin expiración)
 */
function guardarEnStorage(clave, valor, expiracionMinutos = 0) {
    try {
        const item = {
            valor: valor,
            timestamp: Date.now(),
            expiracion: expiracionMinutos > 0 ? expiracionMinutos * 60 * 1000 : 0
        };
        
        localStorage.setItem(clave, JSON.stringify(item));
    } catch (error) {
        console.error('Error guardando en localStorage:', error);
    }
}

/**
 * Obtiene datos de localStorage con expiración
 * @param {string} clave - Clave a obtener
 * @returns {any|null} Valor guardado o null si expiró/no existe
 */
function obtenerDeStorage(clave) {
    try {
        const itemStr = localStorage.getItem(clave);
        if (!itemStr) return null;
        
        const item = JSON.parse(itemStr);
        const ahora = Date.now();
        
        // Verificar expiración
        if (item.expiracion > 0 && (ahora - item.timestamp) > item.expiracion) {
            localStorage.removeItem(clave); // Limpiar expirado
            return null;
        }
        
        return item.valor;
    } catch (error) {
        console.error('Error obteniendo de localStorage:', error);
        return null;
    }
}

/**
 * Limpia datos expirados de localStorage
 */
function limpiarStorageExpirado() {
    try {
        const claves = Object.keys(localStorage);
        const ahora = Date.now();
        
        claves.forEach(clave => {
            if (clave.startsWith('cache_') || clave.includes('_timestamp')) {
                const itemStr = localStorage.getItem(clave);
                if (itemStr) {
                    try {
                        const item = JSON.parse(itemStr);
                        if (item.expiracion > 0 && (ahora - item.timestamp) > item.expiracion) {
                            localStorage.removeItem(clave);
                        }
                    } catch (e) {
                        // Ignorar items que no son JSON válido
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error limpiando storage expirado:', error);
    }
}

// ============================================
// GENERADORES DE ID ÚNICOS
// ============================================

/**
 * Genera un ID único simple
 * @returns {string} ID único
 */
function generarIdUnico() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Genera un ID para operaciones offline
 * @returns {string} ID offline
 */
function generarIdOffline() {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// MANEJO DE ERRORES Y LOGGING
// ============================================

/**
 * Registra un error de forma estructurada
 * @param {string} contexto - Dónde ocurrió el error
 * @param {Error|string} error - Error o mensaje
 * @param {Object} datosExtra - Datos adicionales para debugging
 */
function registrarError(contexto, error, datosExtra = {}) {
    const errorObj = {
        timestamp: new Date().toISOString(),
        contexto: contexto,
        mensaje: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        datosExtra: datosExtra,
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        url: window.location.href
    };
    
    console.error(`❌ [${contexto}]`, errorObj);
    
    // En producción, podrías enviar esto a un servicio de logging
    // Por ahora, solo lo guardamos en localStorage para debugging
    try {
        const errores = obtenerDeStorage('errores_log') || [];
        errores.unshift(errorObj);
        // Mantener solo los últimos 50 errores
        if (errores.length > 50) errores.pop();
        guardarEnStorage('errores_log', errores);
    } catch (e) {
        console.error('Error guardando log:', e);
    }
}

// ============================================
// INICIALIZACIÓN Y CONFIGURACIÓN
// ============================================

/**
 * Configura utilidades al cargar la aplicación
 */
function inicializarUtilidades() {
    console.log('🔧 Inicializando utilidades...');
    
    // Limpiar storage expirado al iniciar
    limpiarStorageExpirado();
    
    // Configurar limpieza periódica de storage
    setInterval(limpiarStorageExpirado, 5 * 60 * 1000); // Cada 5 minutos
    
    console.log('✅ Utilidades inicializadas');
}

// ============================================
// EXPORTACIÓN
// ============================================

// Inicializar al cargar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarUtilidades);
} else {
    inicializarUtilidades();
}

// Exportar todas las funciones al ámbito global
window.utils = {
    // Fechas y horas
    getHoraChileISO,
    formatoHoraChile,
    formatoHoraCortaChile,
    getFechaActualChile,
    getFechaHoyChile,
    diferenciaEnDias,
    
    // Formateo
    formatoMoneda,
    formatoNumero,
    truncarTexto,
    capitalizar,
    
    // Validaciones
    esEmailValido,
    esCodigoBarrasValido,
    esPositivo,
    esNumeroValido,
    
    // Arrays y objetos
    ordenarArray,
    eliminarDuplicados,
    agruparPor,
    
    // Funciones de ayuda
    debounce,
    throttle,
    copiarAlPortapapeles,
    descargarArchivo,
    
    // Storage
    guardarEnStorage,
    obtenerDeStorage,
    limpiarStorageExpirado,
    
    // IDs
    generarIdUnico,
    generarIdOffline,
    
    // Errores y logging
    registrarError,
    
    // Inicialización
    inicializarUtilidades
};

console.log('✅ Módulo de utilidades cargado');
