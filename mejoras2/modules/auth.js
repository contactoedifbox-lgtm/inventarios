import { supabaseClient, StateManager } from '../config/supabase-config.js';
import NotificationManager from '../ui/notifications.js';
import { loadDashboardData } from './inventario.js';

export async function checkAuth() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
            StateManager.currentUser = session.user;
            showApp();
            await loadDashboardData();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        showLogin();
    }
}

export async function loginUser() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        NotificationManager.error('Por favor ingresa email y contraseña');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ 
            email, 
            password 
        });
        
        if (error) throw error;
        
        StateManager.currentUser = data.user;
        showApp();
        await loadDashboardData();
        
        NotificationManager.success('Sesión iniciada correctamente');
    } catch (error) {
        console.error('Error de login:', error);
        NotificationManager.error('Credenciales incorrectas o error de conexión');
    }
}

export async function logoutUser() {
    try {
        await supabaseClient.auth.signOut();
        StateManager.currentUser = null;
        StateManager.clearState();
        showLogin();
        NotificationManager.info('Sesión cerrada correctamente');
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        NotificationManager.error('Error al cerrar sesión');
    }
}

function showLogin() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    
    document.querySelectorAll('.login-error').forEach(el => {
        el.style.display = 'none';
    });
}

function showApp() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    
    const currentUserElement = document.getElementById('current-user');
    const userEmailElement = document.getElementById('user-email');
    
    if (currentUserElement) {
        currentUserElement.textContent = StateManager.currentUser?.email || 'Cliente - MEJORAS';
    }
    
    if (userEmailElement) {
        userEmailElement.textContent = StateManager.currentUser?.email || 'Usuario';
    }
}

export function setupAuthEventListeners() {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const passwordInput = document.getElementById('login-password');
    
    if (loginButton) {
        loginButton.addEventListener('click', loginUser);
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginUser();
            }
        });
    }
}
