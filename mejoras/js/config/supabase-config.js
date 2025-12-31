/* ============================================
   CONFIGURACIÓN DE SUPABASE
   ============================================
   Configuración inicial del cliente Supabase
   y funciones de inicialización globales
   ============================================ */

// ============================================
// VARIABLES DE CONFIGURACIÓN
// ============================================

/**
 * URL de tu proyecto Supabase
 * @constant {string}
 */
const SUPABASE_URL = 'https://qnhmfvtqgwtlckcvzbhq.supabase.co';

/**
 * Clave pública (publishable) de Supabase
 * ⚠️ IMPORTANTE: Esta es una clave pública, NO la secret key
 * @constant {string}
 */
const SUPABASE_KEY = 'sb_publishable_791W4BHb07AeA_DX2EWZCQ_Fxlzv30o';

/**
 * Nombre del proyecto para identificación en logs
 * @constant {string}
 */
const PROJECT_NAME = 'Inventario Veterinaria - MEJORAS';

// ============================================
// VALIDACIÓN DE CONFIGURACIÓN
// ============================================

/**
 * Valida que la configuración sea correcta
 * @throws {Error} Si la configuración es inválida
 */
function validateSupabaseConfig() {
    console.log(`🔧 ${PROJECT_NAME} - Validando configuración...`);
    
    // Verificar que la URL sea válida
    if (!SUPABASE_URL || !SUPABASE_URL.startsWith('https://')) {
        throw new Error('❌ URL de Supabase inválida. Debe comenzar con https://');
    }
    
    // Verificar que la KEY exista
    if (!SUPABASE_KEY) {
        throw new Error('❌ Clave de Supabase no configurada');
    }
    
    // Verificar que no sea una secret key (seguridad básica)
    if (SUPABASE_KEY.includes('secret') || SUPABASE_KEY.length > 100) {
        console.warn('⚠️ ADVERTENCIA: Parece que estás usando una SECRET KEY en el frontend');
        console.warn('   Esto es INSEGURO. Usa siempre la publishable key en el frontend');
        // No lanzamos error porque podría ser intencional en desarrollo
    }
    
    console.log('✅ Configuración de Supabase validada correctamente');
}

// ============================================
// INICIALIZACIÓN DE SUPABASE
// ============================================

/**
 * Cliente global de Supabase
 * @type {SupabaseClient}
 */
let supabaseClient = null;

/**
 * Inicializa el cliente Supabase
 * @returns {SupabaseClient} Cliente configurado
 * @throws {Error} Si falla la inicialización
 */
function initializeSupabase() {
    try {
        console.log(`🚀 ${PROJECT_NAME} - Inicializando Supabase...`);
        
        // Validar configuración primero
        validateSupabaseConfig();
        
        // Crear el cliente Supabase
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                persistSession: true, // Mantener sesión entre recargas
                autoRefreshToken: true, // Refrescar token automáticamente
                detectSessionInUrl: true, // Detectar sesión en URL (para OAuth)
                storage: window.localStorage // Usar localStorage para la sesión
            },
            db: {
                schema: 'public' // Esquema por defecto
            },
            realtime: {
                params: {
                    eventsPerSecond: 10 // Límite de eventos por segundo
                }
            },
            global: {
                headers: {
                    'x-application-name': PROJECT_NAME, // Identificar la aplicación
                    'x-application-version': '1.0.0' // Versión de la aplicación
                }
            }
        });
        
        // Configurar manejo de errores global
        setupSupabaseErrorHandling();
        
        console.log('✅ Supabase inicializado correctamente');
        console.log(`📊 URL: ${SUPABASE_URL}`);
        console.log(`🔑 Key: ${SUPABASE_KEY.substring(0, 10)}...`);
        
        return supabaseClient;
        
    } catch (error) {
        console.error('❌ Error al inicializar Supabase:', error);
        showFatalError('Error de configuración', 'No se pudo conectar con la base de datos. Por favor, recarga la página o contacta al administrador.');
        throw error;
    }
}

// ============================================
// MANEJO DE ERRORES
// ============================================

/**
 * Configura el manejo global de errores de Supabase
 */
function setupSupabaseErrorHandling() {
    if (!supabaseClient) return;
    
    // Interceptar errores de autenticación
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log(`🔐 Evento de autenticación: ${event}`);
        
        if (event === 'SIGNED_OUT') {
            console.log('👋 Usuario cerró sesión');
            // Limpiar datos sensibles si es necesario
        }
        
        if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 Token refrescado');
        }
        
        if (event === 'USER_UPDATED') {
            console.log('👤 Datos de usuario actualizados');
        }
    });
    
    // Manejar errores de red
    window.addEventListener('online', handleNetworkStatusChange);
    window.addEventListener('offline', handleNetworkStatusChange);
}

/**
 * Maneja cambios en el estado de la red
 */
function handleNetworkStatusChange() {
    if (navigator.onLine) {
        console.log('🌐 Conexión a internet restablecida');
        // Podríamos intentar sincronizar datos pendientes aquí
    } else {
        console.warn('📴 Sin conexión a internet - Modo offline activado');
    }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Verifica si Supabase está inicializado
 * @returns {boolean} True si está inicializado
 */
function isSupabaseInitialized() {
    return supabaseClient !== null;
}

/**
 * Obtiene el cliente Supabase (inicializa si es necesario)
 * @returns {SupabaseClient} Cliente de Supabase
 */
function getSupabaseClient() {
    if (!supabaseClient) {
        return initializeSupabase();
    }
    return supabaseClient;
}

/**
 * Reinicia el cliente Supabase (útil para cambios de configuración)
 * @returns {SupabaseClient} Nuevo cliente
 */
function resetSupabaseClient() {
    console.log('🔄 Reiniciando cliente Supabase...');
    supabaseClient = null;
    return initializeSupabase();
}

// ============================================
// MANEJO DE ERRORES FATALES
// ============================================

/**
 * Muestra un error fatal en la interfaz
 * @param {string} title - Título del error
 * @param {string} message - Mensaje detallado
 */
function showFatalError(title, message) {
    // Crear elemento de error
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: sans-serif;
        padding: 20px;
    `;
    
    errorDiv.innerHTML = `
        <div style="max-width: 500px; text-align: center;">
            <h1 style="color: #ef4444; margin-bottom: 20px;">⚠️ ${title}</h1>
            <p style="color: #4b5563; margin-bottom: 30px; line-height: 1.6;">${message}</p>
            <button onclick="location.reload()" style="
                background: #3b82f6;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                margin: 5px;
            ">Reintentar</button>
            <button onclick="showDebugInfo()" style="
                background: #6b7280;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                margin: 5px;
            ">Información de Depuración</button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
}

/**
 * Muestra información de depuración
 */
function showDebugInfo() {
    const debugInfo = {
        url: SUPABASE_URL,
        keyLength: SUPABASE_KEY?.length || 0,
        keyPrefix: SUPABASE_KEY?.substring(0, 10) + '...',
        online: navigator.onLine,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        supabaseInitialized: isSupabaseInitialized(),
        localStorageKeys: Object.keys(localStorage).filter(k => k.includes('supabase'))
    };
    
    alert(`Información de depuración:\n\n${JSON.stringify(debugInfo, null, 2)}`);
}

// ============================================
// CONFIGURACIÓN DE REAL-TIME (WebSockets)
// ============================================

/**
 * Configura suscripciones a cambios en tiempo real
 * @param {string} table - Nombre de la tabla a suscribirse
 * @param {Function} callback - Función a ejecutar cuando haya cambios
 * @returns {RealtimeChannel} Canal de real-time
 */
function setupRealtimeSubscription(table, callback) {
    if (!supabaseClient) {
        console.warn('Supabase no inicializado para real-time');
        return null;
    }
    
    try {
        console.log(`📡 Suscribiéndose a cambios en tabla: ${table}`);
        
        const channel = supabaseClient
            .channel(`table-changes-${table}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: table
                },
                (payload) => {
                    console.log(`🔄 Cambio en ${table}:`, payload);
                    if (callback && typeof callback === 'function') {
                        callback(payload);
                    }
                }
            )
            .subscribe((status) => {
                console.log(`📡 Estado de suscripción a ${table}:`, status);
                
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Suscrito correctamente a ${table}`);
                }
                
                if (status === 'CHANNEL_ERROR') {
                    console.error(`❌ Error en suscripción a ${table}`);
                    // Intentar reconectar después de un tiempo
                    setTimeout(() => {
                        console.log(`🔄 Reintentando suscripción a ${table}...`);
                        channel.subscribe();
                    }, 5000);
                }
                
                if (status === 'TIMED_OUT') {
                    console.warn(`⏰ Timeout en suscripción a ${table}`);
                }
            });
        
        return channel;
        
    } catch (error) {
        console.error(`❌ Error al suscribirse a ${table}:`, error);
        return null;
    }
}

// ============================================
// FUNCIONES DE DEPURACIÓN
// ============================================

/**
 * Muestra información de diagnóstico de Supabase
 */
function showSupabaseDiagnostics() {
    if (!supabaseClient) {
        console.warn('Supabase no inicializado');
        return;
    }
    
    const diagnostics = {
        url: SUPABASE_URL,
        isInitialized: true,
        authState: supabaseClient.auth.getSession() ? 'Authenticated' : 'Not Authenticated',
        timestamp: new Date().toISOString(),
        localStorage: {
            authToken: localStorage.getItem('supabase.auth.token') ? 'Present' : 'Not present',
            count: Object.keys(localStorage).filter(k => k.includes('supabase')).length
        }
    };
    
    console.log('🔍 Diagnóstico de Supabase:', diagnostics);
    return diagnostics;
}

// ============================================
// EXPORTACIÓN
// ============================================

// Inicializar automáticamente al cargar el script
(function autoInitialize() {
    console.log(`📦 ${PROJECT_NAME} - Cargando configuración...`);
    
    // Pequeño delay para asegurar que Supabase JS está cargado
    setTimeout(() => {
        try {
            if (typeof window.supabase !== 'undefined') {
                initializeSupabase();
            } else {
                console.error('❌ Biblioteca Supabase no cargada');
                showFatalError(
                    'Error de dependencia', 
                    'La biblioteca Supabase no se cargó correctamente. Verifica tu conexión a internet.'
                );
            }
        } catch (error) {
            console.error('❌ Error en auto-inicialización:', error);
        }
    }, 100);
})();

// Exportar funciones al ámbito global
window.supabaseConfig = {
    // Cliente principal
    getClient: getSupabaseClient,
    resetClient: resetSupabaseClient,
    isInitialized: isSupabaseInitialized,
    
    // Real-time
    subscribe: setupRealtimeSubscription,
    
    // Utilidades
    diagnostics: showSupabaseDiagnostics,
    
    // Configuración (solo lectura)
    get url() { return SUPABASE_URL; },
    get projectName() { return PROJECT_NAME; },
    
    // Constantes
    CONSTANTS: {
        SUPABASE_URL,
        PROJECT_NAME
    }
};

// También exportar el cliente directamente para compatibilidad
window.supabaseClient = getSupabaseClient();

console.log('✅ Módulo de configuración de Supabase cargado');
