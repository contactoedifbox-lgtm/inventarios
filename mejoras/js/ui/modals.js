import { Constants } from '../config/supabase-config.js';

class ModalManager {
    constructor() {
        this.currentModal = null;
        this.setupCloseEvents();
    }
    
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal ${modalId} no encontrado`);
            return;
        }
        
        modal.style.display = 'flex';
        this.currentModal = modal;
        document.body.style.overflow = 'hidden';
        
        console.log(`📂 Modal abierto: ${modalId}`);
    }
    
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.style.display = 'none';
        this.currentModal = null;
        document.body.style.overflow = '';
        
        console.log(`📂 Modal cerrado: ${modalId}`);
    }
    
    setupCloseEvents() {
        // Cerrar con botón X
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) {
                    this.close(modal.id);
                }
            });
        });
        
        // Cerrar con botón Cancelar
        document.querySelectorAll('.btn-cancel').forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) {
                    this.close(modal.id);
                }
            });
        });
        
        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.close(this.currentModal.id);
            }
        });
        
        // Cerrar haciendo clic fuera
        document.addEventListener('click', (e) => {
            if (this.currentModal && e.target === this.currentModal) {
                this.close(this.currentModal.id);
            }
        });
        
        console.log('✅ Event listeners de modales configurados');
    }
}

const modalManager = new ModalManager();
export default modalManager;
