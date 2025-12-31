/* ============================================
   SISTEMA DE AUTENTICACIÓN
   ============================================
   Manejo completo de autenticación de usuarios:
   - Login/Logout
   - Gestión de sesión
   - Protección de rutas
   ============================================ */

// ============================================
// VARIABLES GLOBALES DE AUTENTICACIÓN
// ============================================

/**
 * Usuario actual autenticado
 * @type {Object|null}
 */
let currentUser = null;

/**
 * Tiempo de expiración de la sesión (en minutos)
 * @constant {number}
 */
const SESSION_TIMEOUT_MINUTES = 120; // 2 horas

/**
 * Última actividad del usuario (timestamp)
 * @type {number}
 */
let lastActivityTime = Date.now();

/**
 * Intervalo para verificar inactividad
 * @type {number|null}
 */
let inactivityCheckInterval = null;

// ============================================
// INICIALIZACIÓN DEL SISTEMA DE AUTENTICACIÓN
// ============================================

/**
 * Inicializa el sistema de autenticación
 * @async
 */
async function initializeAuth() {
    console.log('🔐 Inicializando sistema de autenticación...');
    
    try {
        // Configurar listeners de inactividad
        setupActivityListeners();
        
        // Verificar sesión existente
        await checkAuth();
        
        console.log('✅ Sistema de autenticación inicializado');
    } catch (error) {
        console.error('❌ Error inicializando autenticación:', error);
        registrarError('auth_initialize', error);
    }
}

// ============================================
// FUNCIONES DE AUTENTICACIÓN PRINCIPALES
// ============================================

/**
 * Verifica si hay una sesión activa
 * @async
 * @returns {Promise<boolean>} True si hay sesión activa
 */
async function checkAuth() {
    try {
        console.log('🔍 Verificando autenticación...');
        
        // Obtener cliente Supabase
        const supabase = window.supabaseConfig?.getClient();
        if (!supabase) {
            console.error('❌ Cliente Supabase no disponible');
            return false;
        }
        
        // Verificar sesión
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Error verificando sesión:', error);
            showLogin();
            return false;
        }
        
        if (!session) {
            console.log('👤 No hay sesión activa');
            showLogin();
            return false;
        }
        
        // Actualizar usuario actual
        currentUser = session.user;
        lastActivityTime = Date.now();
        
        console.log('✅ Sesión activa para:', currentUser.email);
        console.log('📅 Sesión expira:', new Date(session.expires_at * 1000));
        
        // Mostrar aplicación
        showApp();
        
        // Iniciar verificación de inactividad
        startInactivityCheck();
        
        // Configurar real-time para cambios de autenticación
        setupAuthRealtime();
        
        return true;
        
    } catch (error) {
        console.error('❌ Error en checkAuth:', error);
        registrarError('auth_check', error);
        showLogin();
        return false;
    }
}

/**
 * Inicia sesión con email y contraseña
 * @async
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña
 * @returns {Promise<boolean>} True si el login fue exitoso
 */
async function loginUser(email, password) {
    try {
        // Validar inputs
        if (!email || !password) {
            showLoginError('Por favor ingresa email y contraseña');
            return false;
        }
        
        if (!window.utils.esEmailValido(email)) {
            showLoginError('Por favor ingresa un email válido');
            return false;
        }
        
        // Mostrar estado de carga
        const loginButton = document.getElementById('login-button');
        const originalText = loginButton.innerHTML;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        loginButton.disabled = true;
        
        console.log('🔐 Intentando login para:', email);
        
        // Obtener cliente Supabase
        const supabase = window.supabaseConfig?.getClient();
        if (!supabase) {
            showLoginError('Error de configuración del sistema');
            return false;
        }
        
        // Intentar login
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password
        });
        
        // Restaurar botón
        loginButton.innerHTML = originalText;
        loginButton.disabled = false;
        
        if (error) {
            console.error('❌ Error de login:', error);
            
            // Mensajes de error específicos
            let errorMessage = 'Credenciales incorrectas';
            if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'Email o contraseña incorrectos';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'Por favor confirma tu email primero';
            } else if (error.message.includes('Too many requests')) {
                errorMessage = 'Demasiados intentos. Espera unos minutos';
            }
            
            showLoginError(errorMessage);
            registrarError('auth_login', error, { email: email });
            return false;
        }
        
        if (!data.user) {
            showLoginError('Error desconocido al iniciar sesión');
            return false;
        }
        
        console.log('✅ Login exitoso para:', data.user.email);
        
        // Actualizar usuario
        currentUser = data.user;
        lastActivityTime = Date.now();
        
        // Mostrar aplicación
        showApp();
        
        // Iniciar verificación de inactividad
        startInactivityCheck();
        
        // Mostrar notificación de bienvenida
        if (window.notifications) {
            window.notifications.showNotification(`¡Bienvenido ${data.user.email}!`, 'success');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error inesperado en login:', error);
        showLoginError('Error inesperado. Por favor intenta nuevamente');
        registrarError('auth_login_unexpected', error, { email: email });
        return false;
    }
}

/**
 * Cierra la sesión del usuario
 * @async
 * @returns {Promise<boolean>} True si el logout fue exitoso
 */
async function logoutUser() {
    try {
        console.log('👋 Cerrando sesión para:', currentUser?.email);
        
        // Detener verificación de inactividad
        stopInactivityCheck();
        
        // Obtener cliente Supabase
        const supabase = window.supabaseConfig?.getClient();
        if (!supabase) {
            console.error('❌ Cliente Supabase no disponible para logout');
            showLogin();
            return false;
        }
        
        // Cerrar sesión en Supabase
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('❌ Error al cerrar sesión:', error);
            registrarError('auth_logout', error);
        }
        
        // Limpiar datos locales
        currentUser = null;
        lastActivityTime = Date.now();
        
        // Limpiar datos sensibles del localStorage
        cleanAuthStorage();
        
        // Mostrar pantalla de login
        showLogin();
        
        console.log('✅ Sesión cerrada exitosamente');
        
        // Mostrar notificación
        if (window.notifications) {
            window.notifications.showNotification('Sesión cerrada exitosamente', 'info');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error inesperado en logout:', error);
        registrarError('auth_logout_unexpected', error);
        
        // Forzar mostrar login aunque falle
        currentUser = null;
        showLogin();
        
        return false;
    }
}

// ============================================
// MANEJO DE INTERFAZ DE USUARIO
// ============================================

/**
 * Muestra la pantalla de login
 */
function showLogin() {
    console.log('🖥️ Mostrando pantalla de login');
    
    // Ocultar aplicación
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.style.display = 'none';
    }
    
    // Mostrar login
    const loginContainer = document.getElementById('login-container');
    if (loginContainer) {
        loginContainer.style.display = 'flex';
        
        // Enfocar el campo de email
        setTimeout(() => {
            const emailInput = document.getElementById('login-email');
            if (emailInput) emailInput.focus();
        }, 100);
    }
    
    // Limpiar campos
    clearLoginForm();
    
    // Actualizar título
    document.title = 'Login - Sistema de Inventario';
}

/**
 * Muestra la aplicación principal
 */
function showApp() {
    console.log('🖥️ Mostrando aplicación principal');
    
    // Ocultar login
    const loginContainer = document.getElementById('login-container');
    if (loginContainer) {
        loginContainer.style.display = 'none';
    }
    
    // Mostrar aplicación
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.style.display = 'block';
    }
    
    // Actualizar información del usuario
    updateUserInfo();
    
    // Actualizar título
    document.title = 'Panel de Control - Sistema de Inventario';
}

/**
 * Actualiza la información del usuario en la interfaz
 */
function updateUserInfo() {
    try {
        const userEmailElement = document.getElementById('user-email');
        const currentUserElement = document.getElementById('current-user');
        
        if (userEmailElement && currentUser) {
            userEmailElement.textContent = currentUser.email;
        }
        
        if (currentUserElement && currentUser) {
            // Mostrar solo el nombre antes del @
            const username = currentUser.email.split('@')[0];
            currentUserElement.textContent = username;
        }
        
    } catch (error) {
        console.error('Error actualizando info de usuario:', error);
    }
}

/**
 * Muestra un error en el formulario de login
 * @param {string} message - Mensaje de error
 */
function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

/**
 * Limpia el formulario de login
 */
function clearLoginForm() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const errorDiv = document.getElementById('login-error');
    
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (errorDiv) errorDiv.style.display = 'none';
}

// ============================================
// MANEJO DE INACTIVIDAD
// ============================================

/**
 * Configura listeners para detectar actividad del usuario
 */
function setupActivityListeners() {
    console.log('🖱️ Configurando listeners de actividad');
    
    // Eventos que indican actividad del usuario
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(eventName => {
        document.addEventListener(eventName, updateActivityTime, { passive: true });
    });
    
    // También detectar actividad en pestaña/ventana
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Actualiza el timestamp de última actividad
 */
function updateActivityTime() {
    lastActivityTime = Date.now();
}

/**
 * Maneja cambios de visibilidad de la pestaña
 */
function handleVisibilityChange() {
    if (!document.hidden) {
        // Pestaña vuelve a ser visible
        updateActivityTime();
    }
}

/**
 * Inicia la verificación periódica de inactividad
 */
function startInactivityCheck() {
    if (inactivityCheckInterval) {
        clearInterval(inactivityCheckInterval);
    }
    
    // Verificar cada minuto
    inactivityCheckInterval = setInterval(() => {
        checkInactivity();
    }, 60 * 1000); // 1 minuto
    
    console.log('⏰ Verificación de inactividad iniciada');
}

/**
 * Detiene la verificación de inactividad
 */
function stopInactivityCheck() {
    if (inactivityCheckInterval) {
        clearInterval(inactivityCheckInterval);
        inactivityCheckInterval = null;
        console.log('⏰ Verificación de inactividad detenida');
    }
}

/**
 * Verifica si el usuario ha estado inactivo por mucho tiempo
 */
function checkInactivity() {
    if (!currentUser) return;
    
    const now = Date.now();
    const inactiveMinutes = (now - lastActivityTime) / (1000 * 60);
    
    // Mostrar advertencia después de 1:50 horas (10 minutos antes de expirar)
    if (inactiveMinutes >= SESSION_TIMEOUT_MINUTES - 10 && inactiveMinutes < SESSION_TIMEOUT_MINUTES) {
        showSessionWarning(Math.ceil(SESSION_TIMEOUT_MINUTES - inactiveMinutes));
    }
    
    // Cerrar sesión después del tiempo límite
    if (inactiveMinutes >= SESSION_TIMEOUT_MINUTES) {
        console.log('⏰ Sesión expirada por inactividad');
        forceLogout('Tu sesión ha expirado por inactividad');
    }
}

/**
 * Muestra advertencia de sesión por expirar
 * @param {number} minutesLeft - Minutos restantes
 */
function showSessionWarning(minutesLeft) {
    if (window.notifications) {
        const message = minutesLeft === 1 
            ? 'Tu sesión expirará en 1 minuto. Realiza alguna acción para mantenerla activa.'
            : `Tu sesión expirará en ${minutesLeft} minutos. Realiza alguna acción para mantenerla activa.`;
        
        window.notifications.showNotification(message, 'warning', 10000); // 10 segundos
    }
}

/**
 * Forza el cierre de sesión
 * @param {string} reason - Razón del cierre
 */
function forceLogout(reason = 'Sesión expirada') {
    console.log(`🔒 Forzando logout: ${reason}`);
    
    if (window.notifications) {
        window.notifications.showNotification(reason, 'warning');
    }
    
    // Cerrar sesión
    logoutUser();
}

// ============================================
// REAL-TIME Y SUSCRIPCIONES
// ============================================

/**
 * Configura suscripciones real-time para autenticación
 */
function setupAuthRealtime() {
    try {
        const supabase = window.supabaseConfig?.getClient();
        if (!supabase) return;
        
        // Suscribirse a cambios de autenticación
        supabase.auth.onAuthStateChange((event, session) => {
            console.log(`🔐 Cambio de estado de autenticación: ${event}`);
            
            switch (event) {
                case 'SIGNED_IN':
                    console.log('✅ Usuario ha iniciado sesión');
                    currentUser = session.user;
                    updateUserInfo();
                    break;
                    
                case 'SIGNED_OUT':
                    console.log('👋 Usuario ha cerrado sesión');
                    forceLogout('Sesión cerrada en otro dispositivo');
                    break;
                    
                case 'USER_UPDATED':
                    console.log('👤 Información de usuario actualizada');
                    currentUser = session.user;
                    updateUserInfo();
                    break;
                    
                case 'TOKEN_REFRESHED':
                    console.log('🔄 Token de sesión refrescado');
                    break;
                    
                case 'PASSWORD_RECOVERY':
                    console.log('🔑 Recuperación de contraseña solicitada');
                    break;
            }
        });
        
    } catch (error) {
        console.error('Error configurando auth real-time:', error);
    }
}

// ============================================
// LIMPIEZA Y SEGURIDAD
// ============================================

/**
 * Limpia datos de autenticación del localStorage
 */
function cleanAuthStorage() {
    try {
        const keysToRemove = [];
        
        // Buscar keys relacionadas con auth
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.includes('supabase.auth') ||
                key.includes('auth_token') ||
                key.includes('session_')
            )) {
                keysToRemove.push(key);
            }
        }
        
        // Eliminar keys
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🗑️ Eliminado del storage: ${key}`);
        });
        
    } catch (error) {
        console.error('Error limpiando auth storage:', error);
    }
}

/**
 * Valida permisos del usuario actual
 * @param {Array<string>} requiredRoles - Roles requeridos
 * @returns {boolean} True si tiene permisos
 */
function hasPermission(requiredRoles = []) {
    if (!currentUser || !Array.isArray(requiredRoles)) {
        return false;
    }
    
    // Aquí puedes implementar lógica de roles
    // Por ahora, todos los usuarios autenticados tienen acceso
    return true;
}

// ============================================
// GETTERS Y UTILIDADES
// ============================================

/**
 * Obtiene el usuario actual
 * @returns {Object|null} Usuario actual
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Verifica si hay un usuario autenticado
 * @returns {boolean} True si está autenticado
 */
function isAuthenticated() {
    return currentUser !== null;
}

/**
 * Obtiene el email del usuario actual
 * @returns {string|null} Email o null
 */
function getCurrentUserEmail() {
    return currentUser?.email || null;
}

/**
 * Obtiene el ID del usuario actual
 * @returns {string|null} ID o null
 */
function getCurrentUserId() {
    return currentUser?.id || null;
}

// ============================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================

/**
 * Inicializa el módulo de autenticación
 */
function initAuthModule() {
    console.log('🔐 Módulo de autenticación cargado');
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAuth);
    } else {
        initializeAuth();
    }
}

// ============================================
// EXPORTACIÓN
// ============================================

// Inicializar módulo
initAuthModule();

// Exportar funciones al ámbito global
window.auth = {
    // Funciones principales
    checkAuth,
    loginUser,
    logoutUser,
    initializeAuth,
    
    // UI
    showLogin,
    showApp,
    updateUserInfo,
    showLoginError,
    clearLoginForm,
    
    // Inactividad
    startInactivityCheck,
    stopInactivityCheck,
    forceLogout,
    
    // Getters
    getCurrentUser,
    getCurrentUserEmail,
    getCurrentUserId,
    isAuthenticated,
    hasPermission,
    
    // Variables (solo lectura)
    get currentUser() { return currentUser; },
    get lastActivityTime() { return lastActivityTime; }
};

console.log('✅ Módulo de autenticación cargado y listo');
