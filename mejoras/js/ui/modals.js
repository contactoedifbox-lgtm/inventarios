import { Constants } from '../config/supabase-config.js';
import { StringUtils } from '../modules/utils.js';

class ModalManager {
    constructor() {
        this.currentModal = null;
        this.modalStack = [];
    }
    
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal ${modalId} no encontrado`);
            return;
        }
        
        if (this.currentModal) {
            this.modalStack.push(this.currentModal);
            this.hide(this.currentModal);
        }
        
        modal.style.display = 'flex';
        this.currentModal = modal;
        
        document.body.style.overflow = 'hidden';
        
        // Enfocar el primer campo input del modal
        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput && !firstInput.readOnly) {
                firstInput.focus();
            }
        }, 100);
        
        // Para el modal de venta múltiple, ajustar el scroll
        if (modalId === Constants.MODAL_IDS.MULTIPLE_SALE) {
            setTimeout(() => {
                const lineasContainer = modal.querySelector('#lineas-venta-container');
                if (lineasContainer) {
                    lineasContainer.scrollTop = 0;
                }
            }, 200);
        }
    }
    
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.style.display = 'none';
        
        if (this.currentModal === modal) {
            this.currentModal = null;
        }
        
        if (this.modalStack.length > 0) {
            const previousModal = this.modalStack.pop();
            this.open(previousModal.id);
        } else {
            document.body.style.overflow = '';
        }
        
        // Limpiar búsquedas pendientes si es el modal de venta múltiple
        if (modalId === Constants.MODAL_IDS.MULTIPLE_SALE) {
            const searchResults = modal.querySelectorAll('.search-results-linea');
            searchResults.forEach(result => {
                result.style.display = 'none';
                result.innerHTML = '';
            });
        }
    }
    
    hide(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    closeCurrent() {
        if (this.currentModal) {
            this.close(this.currentModal.id);
        }
    }
    
    setupModalCloseEvents() {
        // Botones con clase modal-close
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = this.findParentModalId(button);
                if (modalId) {
                    this.close(modalId);
                }
            });
        });
        
        // Botones con clase btn-cancel
        document.querySelectorAll('.btn-cancel').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = this.findParentModalId(button);
                if (modalId) {
                    this.close(modalId);
                }
            });
        });
        
        // Botones con id que empieza con close-modal-
        document.querySelectorAll('[id^="close-modal-"]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = this.findParentModalId(button);
                if (modalId) {
                    this.close(modalId);
                }
            });
        });
        
        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.closeCurrent();
            }
        });
        
        // Cerrar haciendo clic fuera del modal
        document.addEventListener('click', (e) => {
            if (this.currentModal && e.target === this.currentModal) {
                this.closeCurrent();
            }
        });
    }
    
    findParentModalId(element) {
        let currentElement = element;
        while (currentElement) {
            if (currentElement.id && currentElement.id.startsWith('modal')) {
                return currentElement.id;
            }
            currentElement = currentElement.parentElement;
        }
        
        // Si no encuentra por ID, buscar por data-modal-id
        const modalId = element.closest('[data-modal-id]')?.getAttribute('data-modal-id');
        if (modalId) return modalId;
        
        // Buscar el modal más cercano
        const modal = element.closest('.modal');
        return modal ? modal.id : null;
    }
    
    setModalContent(modalId, content) {
        const modal = document.getElementById(modalId);
        if (modal) {
            StringUtils.safeInnerHTML(modal, content);
        }
    }
    
    isOpen(modalId) {
        const modal = document.getElementById(modalId);
        return modal && modal.style.display === 'flex';
    }
}

const modalManager = new ModalManager();
export default modalManager;
