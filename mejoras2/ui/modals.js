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
        const closeButtons = document.querySelectorAll('[id^="close-modal-"], [class*="modal-close"]');
        
        closeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = this.findParentModalId(button);
                if (modalId) {
                    this.close(modalId);
                }
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.closeCurrent();
            }
        });
        
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
        return null;
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
