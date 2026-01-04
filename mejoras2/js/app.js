// ========== APLICACIÓN PRINCIPAL SIMPLIFICADA ==========

import store from './core/store.js';
import api from './core/api.js';
import { getTodayDate } from './core/utils.js';
import SalesManager from './features/sales.js';
import InventoryManager from './features/inventory.js';
import SyncManager from './features/sync.js';

class VetInventoryApp {
    constructor() {
        this.init();
    }
    
    async init() {
        // Setup básico
        this.setupAuth();
        this.setupUI();
        this.setupDate();
        
        // Verificar autenticación
        await this.checkAuth();
    }
    
    // ========== AUTH ==========
    async checkAuth() {
        try {
            const session = await api.getSession();
            
            if (session) {
                store.user = session.user;
                this.showApp();
                await this.loadDashboardData();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            this.showLogin();
        }
    }
    
    async login() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            this.showNotification('Ingresa email y contraseña', 'error');
            return;
        }
        
        try {
            const data = await api.login(email, password);
            store.user = data.user;
            
            this.showApp();
            await this.loadDashboardData();
            this.showNotification('Sesión iniciada', 'success');
            
        } catch (error) {
            console.error('Error de login:', error);
            this.showNotification('Credenciales incorrectas', 'error');
        }
    }
    
    async logout() {
        try {
            await api.logout();
            store.reset();
            this.showLogin();
            this.showNotification('Sesión cerrada', 'info');
        } catch (error) {
            console.error('Error cerrando sesión:', error);
        }
    }
    
    // ========== DASHBOARD ==========
    async loadDashboardData() {
        try {
            // Cargar inventario
            await InventoryManager.loadInventory();
            
            // Cargar ventas (a través de SalesManager)
            await SalesManager.refreshData();
            
            // Mostrar pestaña ventas por defecto
            InventoryManager.showSalesTab();
            
        } catch (error) {
            console.error('Error cargando dashboard:', error);
            this.showNotification('Error al cargar datos', 'error');
        }
    }
    
    // ========== UI SETUP ==========
    setupUI() {
        // Login
        const loginBtn = document.getElementById('login-button');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.login());
        }
        
        // Logout
        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Enter en password
        const passwordInput = document.getElementById('login-password');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.login();
            });
        }
        
        // Cerrar modales
        this.setupModalCloseEvents();
    }
    
    setupModalCloseEvents() {
        document.addEventListener('click', (e) => {
            // Cerrar con botón ×
            if (e.target.classList.contains('modal-close') || 
                e.target.classList.contains('btn-cancel')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            }
            
            // Cerrar haciendo click fuera
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
        
        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
                document.body.style.overflow = '';
            }
        });
    }
    
    setupDate() {
        // Fecha actual
        const fechaHoy = document.getElementById('fecha-hoy');
        if (fechaHoy) {
            fechaHoy.textContent = getTodayDate();
            
            // Actualizar cada minuto (solo la hora)
            setInterval(() => {
                const ahora = new Date();
                const hora = ahora.toLocaleTimeString('es-CL', { 
                    timeZone: 'America/Santiago',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                // Solo actualizar si el elemento existe
                if (fechaHoy) {
                    const partes = fechaHoy.textContent.split(',');
                    if (partes.length > 1) {
                        fechaHoy.textContent = `${partes[0]}, ${partes[1]} ${hora}`;
                    }
                }
            }, 60000);
        }
        
        // Información de usuario
        this.updateUserInfo();
    }
    
    updateUserInfo() {
        const currentUser = document.getElementById('current-user');
        const userEmail = document.getElementById('user-email');
        
        if (currentUser) {
            currentUser.textContent = store.user?.email || 'Cliente - MEJORAS';
        }
        
        if (userEmail) {
            userEmail.textContent = store.user?.email || 'Usuario';
        }
    }
    
    // ========== VIEW TOGGLES ==========
    showLogin() {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        
        // Limpiar campos
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
    }
    
    showApp() {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        this.updateUserInfo();
    }
    
    // ========== NOTIFICACIONES ==========
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

// Iniciar aplicación
new VetInventoryApp();
