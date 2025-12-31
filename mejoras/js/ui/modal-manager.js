/* ============================================
   GESTIÓN DE MODALES
   ============================================
   Sistema centralizado para manejar todos los modales:
   - Apertura y cierre de modales
   - Animaciones y transiciones
   - Manejo de teclado (Escape)
   - Gestión de foco para accesibilidad
   ============================================ */

// ============================================
// VARIABLES GLOBALES
// ============================================

/**
 * Estado de los modales
 * @type {Object}
 */
const modalState = {
    activeModal: null,
    previousFocus: null,
    isClosing: false,
    modalsStack: [],
    escHandler: null
};

/**
 * Configuración de modales
 * @constant {Object}
 */
const MODAL_CONFIG = {
    animationDuration: 300, // ms
    backdropOpacity: 0.5,
    enableEscClose: true,
    enableBackdropClose: true,
    focusTrap: true,
    autoFocus: true
};

// ============================================
// INICIALIZACIÓN DEL SISTEMA DE MODALES
// ============================================

/**
 * Inicializa el sistema de modales
 */
function initializeModalManager() {
    console.log('🪟 Inicializando gestor de modales...');
    
    try {
        // Configurar event listeners globales
        setupGlobalModalListeners();
        
        // Configurar modales existentes en el DOM
        setupExistingModals();
        
        console.log('✅ Gestor de modales inicializado');
        
    } catch (error) {
        console.error('❌ Error inicializando gestor de modales:', error);
        registrarError('modal_manager_init', error);
    }
}

/**
 * Configura event listeners globales para modales
 */
function setupGlobalModalListeners() {
    // Tecla Escape para cerrar modales
    if (MODAL_CONFIG.enableEscClose) {
        modalState.escHandler = (e) => {
            if (e.key === 'Escape' && modalState.activeModal) {
                closeActiveModal();
            }
        };
        document.addEventListener('keydown', modalState.escHandler);
    }
    
    // Clic en backdrop para cerrar
    if (MODAL_CONFIG.enableBackdropClose) {
        document.addEventListener('click', (e) => {
            if (modalState.activeModal && 
                e.target.classList.contains('modal') &&
                !modalState.isClosing) {
                closeActiveModal();
            }
        });
    }
    
    console.log('🎯 Listeners globales de modales configurados');
}

/**
 * Configura modales existentes en el DOM
 */
function setupExistingModals() {
    // Buscar todos los modales en la página
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        const modalId = modal.id;
        
        // Configurar botones de cerrar dentro del modal
        const closeButtons = modal.querySelectorAll('[data-close-modal]');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => closeModal(modalId));
        });
        
        // Configurar botón X específico
        const xButton = modal.querySelector(`#close-modal-${modalId.replace('modal', '').toLowerCase()}`);
        if (xButton) {
            xButton.addEventListener('click', () => closeModal(modalId));
        }
        
        // Prevenir que clics dentro del modal cierren el backdrop
        modal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        console.log(`🔧 Modal configurado: ${modalId}`);
    });
    
    console.log(`🔧 Total modales configurados: ${modals.length}`);
}

// ============================================
// FUNCIONES PRINCIPALES DE APERTURA Y CIERRE
// ============================================

/**
 * Abre un modal específico
 * @param {string} modalId - ID del modal a abrir
 * @param {Object} options - Opciones adicionales
 */
function openModal(modalId, options = {}) {
    try {
        // Validar que el modal exista
        const modal = document.getElementById(modalId);
        if (!modal) {
            throw new Error(`Modal no encontrado: ${modalId}`);
        }
        
        // Si ya hay un modal abierto, cerrarlo primero
        if (modalState.activeModal && modalState.activeModal !== modalId) {
            closeActiveModal(true); // Forzar cierre
        }
        
        // Guardar elemento que tenía el foco
        modalState.previousFocus = document.activeElement;
        
        // Agregar a la pila
        modalState.modalsStack.push(modalId);
        modalState.activeModal = modalId;
        
        // Bloquear scroll del body
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        // Aplicar opciones específicas si las hay
        applyModalOptions(modal, options);
        
        // Mostrar el modal
        modal.style.display = 'flex';
        
        // Forzar reflow para animación
        void modal.offsetWidth;
        
        // Agregar clase para animación de entrada
        modal.classList.remove('closing');
        modal.classList.add('opening');
        
        // Enfocar elemento dentro del modal
        if (MODAL_CONFIG.autoFocus) {
            setTimeout(() => {
                focusFirstFocusableElement(modal);
            }, MODAL_CONFIG.animationDuration);
        }
        
        // Atrapar foco si está habilitado
        if (MODAL_CONFIG.focusTrap) {
            setupFocusTrap(modal);
        }
        
        // Disparar evento personalizado
        dispatchModalEvent(modalId, 'modal:open');
        
        console.log(`🪟 Modal abierto: ${modalId}`);
        
        return true;
        
    } catch (error) {
        console.error(`❌ Error abriendo modal ${modalId}:`, error);
        registrarError('modal_open', error, { modalId, options });
        return false;
    }
}

/**
 * Cierra el modal activo
 * @param {boolean} force - Forzar cierre sin animación
 */
function closeActiveModal(force = false) {
    if (!modalState.activeModal) return;
    
    closeModal(modalState.activeModal, force);
}

/**
 * Cierra un modal específico
 * @param {string} modalId - ID del modal a cerrar
 * @param {boolean} force - Forzar cierre sin animación
 */
function closeModal(modalId, force = false) {
    try {
        const modal = document.getElementById(modalId);
        if (!modal) {
            throw new Error(`Modal no encontrado: ${modalId}`);
        }
        
        // Si ya se está cerrando, no hacer nada
        if (modalState.isClosing) return;
        
        modalState.isClosing = true;
        
        // Remover de la pila
        const index = modalState.modalsStack.indexOf(modalId);
        if (index !== -1) {
            modalState.modalsStack.splice(index, 1);
        }
        
        // Actualizar modal activo
        modalState.activeModal = modalState.modalsStack.length > 0 
            ? modalState.modalsStack[modalState.modalsStack.length - 1] 
            : null;
        
        // Disparar evento personalizado antes de cerrar
        dispatchModalEvent(modalId, 'modal:beforeClose');
        
        if (force) {
            // Cierre forzado sin animación
            modal.style.display = 'none';
            modal.classList.remove('opening', 'closing');
            completeModalClose(modalId);
            
        } else {
            // Animación de cierre
            modal.classList.remove('opening');
            modal.classList.add('closing');
            
            // Esperar a que termine la animación
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('closing');
                completeModalClose(modalId);
            }, MODAL_CONFIG.animationDuration);
        }
        
        console.log(`🪟 Modal cerrado: ${modalId}`);
        
    } catch (error) {
        console.error(`❌ Error cerrando modal ${modalId}:`, error);
        registrarError('modal_close', error, { modalId, force });
        modalState.isClosing = false;
    }
}

/**
 * Completa el proceso de cierre del modal
 * @param {string} modalId - ID del modal
 */
function completeModalClose(modalId) {
    // Si no hay más modales abiertos, restaurar scroll
    if (!modalState.activeModal) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        
        // Restaurar foco al elemento anterior
        if (modalState.previousFocus && modalState.previousFocus.focus) {
            setTimeout(() => {
                modalState.previousFocus.focus();
                modalState.previousFocus = null;
            }, 50);
        }
    }
    
    // Limpiar estado
    modalState.isClosing = false;
    
    // Disparar evento de cierre completado
    dispatchModalEvent(modalId, 'modal:closed');
}

/**
 * Cierra todos los modales abiertos
 * @param {boolean} force - Forzar cierre sin animación
 */
function closeAllModals(force = false) {
    console.log('🪟 Cerrando todos los modales...');
    
    // Cerrar en orden inverso (el último abierto primero)
    const modalsToClose = [...modalState.modalsStack].reverse();
    
    modalsToClose.forEach(modalId => {
        closeModal(modalId, force);
    });
}

// ============================================
## Continuación del archivo `modal-manager.js`:

```javascript
// ============================================
// MANEJO DE FOCO Y ACCESIBILIDAD
// ============================================

/**
 * Enfoca el primer elemento enfocable dentro del modal
 * @param {HTMLElement} modal - Elemento modal
 */
function focusFirstFocusableElement(modal) {
    try {
        // Elementos que pueden recibir foco
        const focusableSelectors = [
            'button:not([disabled])',
            '[href]',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');
        
        // Buscar elementos enfocables
        const focusableElements = modal.querySelectorAll(focusableSelectors);
        
        // Filtrar elementos visibles
        const visibleFocusableElements = Array.from(focusableElements).filter(
            element => element.offsetParent !== null
        );
        
        // Enfocar el primer elemento si existe
        if (visibleFocusableElements.length > 0) {
            const firstElement = visibleFocusableElements[0];
            firstElement.focus();
            
            // Si es un input, seleccionar texto si tiene valor
            if (firstElement.tagName === 'INPUT' && firstElement.value) {
                setTimeout(() => {
                    firstElement.select();
                }, 10);
            }
        }
        
    } catch (error) {
        console.error('Error enfocando elemento en modal:', error);
    }
}

/**
 * Configura el "focus trap" para el modal
 * @param {HTMLElement} modal - Elemento modal
 */
function setupFocusTrap(modal) {
    // Obtener elementos enfocables dentro del modal
    const focusableSelectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
    ].join(', ');
    
    const focusableElements = modal.querySelectorAll(focusableSelectors);
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];
    
    // Configurar listener para atrapar foco con Tab
    const trapFocusHandler = (e) => {
        if (e.key !== 'Tab') return;
        
        // Si shift+tab y estamos en el primer elemento, ir al último
        if (e.shiftKey && document.activeElement === firstFocusableElement) {
            e.preventDefault();
            lastFocusableElement.focus();
        }
        // Si tab y estamos en el último elemento, ir al primero
        else if (!e.shiftKey && document.activeElement === lastFocusableElement) {
            e.preventDefault();
            firstFocusableElement.focus();
        }
    };
    
    // Solo agregar handler si hay elementos enfocables
    if (focusableElements.length > 0) {
        modal.addEventListener('keydown', trapFocusHandler);
        
        // Guardar referencia para poder removerlo después
        modal.dataset.focusTrapHandler = 'true';
    }
}

/**
 * Remueve el "focus trap" del modal
 * @param {HTMLElement} modal - Elemento modal
 */
function removeFocusTrap(modal) {
    if (modal.dataset.focusTrapHandler === 'true') {
        modal.removeEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                // Handler genérico, se remueve por referencia
            }
        });
        delete modal.dataset.focusTrapHandler;
    }
}

// ============================================
// MANEJO DE ANIMACIONES Y TRANSICIONES
// ============================================

/**
 * Aplica opciones específicas al modal
 * @param {HTMLElement} modal - Elemento modal
 * @param {Object} options - Opciones a aplicar
 */
function applyModalOptions(modal, options) {
    // Tamaño personalizado
    if (options.width) {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.maxWidth = options.width;
        }
    }
    
    // Clases personalizadas
    if (options.className) {
        modal.classList.add(options.className);
    }
    
    // Callback al abrir
    if (typeof options.onOpen === 'function') {
        const openHandler = () => {
            options.onOpen();
            modal.removeEventListener('modal:open', openHandler);
        };
        modal.addEventListener('modal:open', openHandler);
    }
    
    // Callback al cerrar
    if (typeof options.onClose === 'function') {
        const closeHandler = () => {
            options.onClose();
            modal.removeEventListener('modal:closed', closeHandler);
        };
        modal.addEventListener('modal:closed', closeHandler);
    }
    
    // Deshabilitar cierre con backdrop
    if (options.disableBackdropClose) {
        modal.style.pointerEvents = 'auto';
        modal.querySelector('.modal-content').style.pointerEvents = 'auto';
    }
}

/**
 * Configura animaciones CSS personalizadas
 */
function setupModalAnimations() {
    // Agregar estilos dinámicos para animaciones
    const style = document.createElement('style');
    style.textContent = `
        .modal.opening .modal-content {
            animation: modalSlideIn ${MODAL_CONFIG.animationDuration}ms ease;
        }
        
        .modal.closing .modal-content {
            animation: modalSlideOut ${MODAL_CONFIG.animationDuration}ms ease;
        }
        
        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes modalSlideOut {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-20px);
            }
        }
        
        body.modal-open {
            overflow: hidden;
        }
    `;
    
    document.head.appendChild(style);
}

// ============================================
// UTILIDADES Y HELPERS
// ============================================

/**
 * Dispara un evento personalizado para el modal
 * @param {string} modalId - ID del modal
 * @param {string} eventName - Nombre del evento
 * @param {Object} detail - Datos adicionales
 */
function dispatchModalEvent(modalId, eventName, detail = {}) {
    try {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        const event = new CustomEvent(eventName, {
            detail: {
                modalId,
                timestamp: new Date().toISOString(),
                ...detail
            },
            bubbles: true,
            cancelable: true
        });
        
        modal.dispatchEvent(event);
        
    } catch (error) {
        console.error(`Error disparando evento ${eventName}:`, error);
    }
}

/**
 * Verifica si un modal está actualmente abierto
 * @param {string} [modalId] - ID opcional del modal a verificar
 * @returns {boolean} True si el modal está abierto
 */
function isModalOpen(modalId = null) {
    if (modalId) {
        return modalState.modalsStack.includes(modalId);
    }
    return modalState.activeModal !== null;
}

/**
 * Obtiene el ID del modal actualmente activo
 * @returns {string|null} ID del modal activo o null
 */
function getActiveModalId() {
    return modalState.activeModal;
}

/**
 * Obtiene la pila de modales abiertos
 * @returns {Array<string>} Array de IDs de modales
 */
function getModalStack() {
    return [...modalState.modalsStack];
}

/**
 * Actualiza la posición de un modal (centrado, etc.)
 * @param {string} modalId - ID del modal
 */
function updateModalPosition(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const modalContent = modal.querySelector('.modal-content');
    if (!modalContent) return;
    
    // Centrar verticalmente si es necesario
    const windowHeight = window.innerHeight;
    const modalHeight = modalContent.offsetHeight;
    
    if (modalHeight > windowHeight * 0.9) {
        modalContent.style.marginTop = '20px';
        modalContent.style.marginBottom = '20px';
    } else {
        modalContent.style.marginTop = '';
        modalContent.style.marginBottom = '';
    }
}

// ============================================
## Continuación final del archivo `modal-manager.js`:

```javascript
// ============================================
// MANEJO DE FORMULARIOS EN MODALES
// ============================================

/**
 * Configura un formulario dentro de un modal
 * @param {string} modalId - ID del modal
 * @param {string} formId - ID del formulario
 * @param {Object} options - Opciones del formulario
 */
function setupModalForm(modalId, formId, options = {}) {
    try {
        const modal = document.getElementById(modalId);
        if (!modal) {
            throw new Error(`Modal no encontrado: ${modalId}`);
        }
        
        const form = document.getElementById(formId);
        if (!form) {
            throw new Error(`Formulario no encontrado: ${formId}`);
        }
        
        // Configurar submit del formulario
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (options.onSubmit) {
                try {
                    // Mostrar estado de carga si hay botón de submit
                    const submitButton = form.querySelector('[type="submit"]');
                    const originalButtonText = submitButton?.innerHTML;
                    
                    if (submitButton && options.showLoading) {
                        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
                        submitButton.disabled = true;
                    }
                    
                    // Ejecutar callback de submit
                    const result = await options.onSubmit(e, form);
                    
                    // Restaurar botón
                    if (submitButton && options.showLoading) {
                        submitButton.innerHTML = originalButtonText;
                        submitButton.disabled = false;
                    }
                    
                    // Cerrar modal si el submit fue exitoso
                    if (result !== false && options.autoClose !== false) {
                        setTimeout(() => {
                            closeModal(modalId);
                        }, options.closeDelay || 500);
                    }
                    
                } catch (error) {
                    console.error('Error en submit de formulario:', error);
                    
                    // Restaurar botón
                    const submitButton = form.querySelector('[type="submit"]');
                    if (submitButton && options.showLoading) {
                        submitButton.innerHTML = 'Guardar';
                        submitButton.disabled = false;
                    }
                    
                    // Mostrar error
                    if (options.onError) {
                        options.onError(error);
                    }
                }
            }
        });
        
        // Configurar reset al abrir/cerrar
        if (options.resetOnOpen) {
            const resetHandler = () => {
                form.reset();
                
                // Limpiar mensajes de error
                const errorElements = form.querySelectorAll('.error-message, .is-invalid');
                errorElements.forEach(el => {
                    el.classList.remove('is-invalid');
                    if (el.classList.contains('error-message')) {
                        el.remove();
                    }
                });
            };
            
            modal.addEventListener('modal:open', resetHandler);
        }
        
        // Configurar validación en tiempo real
        if (options.realTimeValidation) {
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('blur', () => {
                    validateFormField(input, form, options);
                });
                
                input.addEventListener('input', () => {
                    // Remover estado de error mientras se escribe
                    if (input.classList.contains('is-invalid')) {
                        input.classList.remove('is-invalid');
                        const errorMsg = input.nextElementSibling;
                        if (errorMsg && errorMsg.classList.contains('error-message')) {
                            errorMsg.remove();
                        }
                    }
                });
            });
        }
        
        console.log(`📝 Formulario configurado en modal: ${formId} -> ${modalId}`);
        
    } catch (error) {
        console.error('Error configurando formulario en modal:', error);
        registrarError('modal_form_setup', error, { modalId, formId });
    }
}

/**
 * Valida un campo del formulario
 * @param {HTMLElement} field - Campo a validar
 * @param {HTMLFormElement} form - Formulario contenedor
 * @param {Object} options - Opciones de validación
 */
function validateFormField(field, form, options = {}) {
    // Validaciones básicas
    let isValid = true;
    let errorMessage = '';
    
    // Validar required
    if (field.required && !field.value.trim()) {
        isValid = false;
        errorMessage = options.messages?.required || 'Este campo es requerido';
    }
    
    // Validar email
    if (field.type === 'email' && field.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value)) {
            isValid = false;
            errorMessage = options.messages?.email || 'Email inválido';
        }
    }
    
    // Validar número
    if ((field.type === 'number' || field.dataset.type === 'number') && field.value.trim()) {
        const numValue = parseFloat(field.value);
        if (isNaN(numValue)) {
            isValid = false;
            errorMessage = options.messages?.number || 'Debe ser un número válido';
        } else if (field.min && numValue < parseFloat(field.min)) {
            isValid = false;
            errorMessage = options.messages?.min || `El valor mínimo es ${field.min}`;
        } else if (field.max && numValue > parseFloat(field.max)) {
            isValid = false;
            errorMessage = options.messages?.max || `El valor máximo es ${field.max}`;
        }
    }
    
    // Actualizar UI
    if (!isValid) {
        field.classList.add('is-invalid');
        
        // Mostrar mensaje de error
        const existingError = field.nextElementSibling;
        if (existingError && existingError.classList.contains('error-message')) {
            existingError.textContent = errorMessage;
        } else {
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.style.color = 'var(--danger)';
            errorElement.style.fontSize = '12px';
            errorElement.style.marginTop = '5px';
            errorElement.textContent = errorMessage;
            field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
    } else {
        field.classList.remove('is-invalid');
        
        // Remover mensaje de error si existe
        const errorElement = field.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
            errorElement.remove();
        }
    }
    
    return isValid;
}

// ============================================
// MODALES ESPECÍFICOS DE LA APLICACIÓN
// ============================================

/**
 * Configura el modal de inventario
 */
function setupInventarioModal() {
    const modalId = 'modalInventario';
    const formId = 'formInventario';
    
    setupModalForm(modalId, formId, {
        showLoading: true,
        resetOnOpen: true,
        realTimeValidation: true,
        autoClose: true,
        closeDelay: 1000,
        
        messages: {
            required: 'Este campo es requerido',
            number: 'Debe ser un número válido',
            min: 'El valor no puede ser negativo'
        },
        
        onSubmit: async (e, form) => {
            // La lógica específica se maneja en inventory.js
            // Esta función solo valida el formulario básico
            
            // Validar todos los campos
            const fields = form.querySelectorAll('input[required], textarea[required]');
            let allValid = true;
            
            fields.forEach(field => {
                if (!validateFormField(field, form, this)) {
                    allValid = false;
                }
            });
            
            if (!allValid) {
                // Enfocar el primer campo con error
                const firstError = form.querySelector('.is-invalid');
                if (firstError) {
                    firstError.focus();
                }
                return false;
            }
            
            // Dejar que inventory.js maneje el guardado
            return true;
        },
        
        onError: (error) => {
            console.error('Error en formulario de inventario:', error);
            if (window.notifications) {
                window.notifications.showNotification(
                    'Error al procesar el formulario',
                    'error'
                );
            }
        }
    });
}

/**
 * Configura el modal de venta
 */
function setupVentaModal() {
    const modalId = 'modalVenta';
    const formId = 'formVenta';
    
    setupModalForm(modalId, formId, {
        showLoading: true,
        resetOnOpen: true,
        realTimeValidation: true,
        autoClose: true,
        closeDelay: 1000,
        
        messages: {
            required: 'Este campo es requerido',
            number: 'Debe ser un número válido',
            min: 'El valor no puede ser negativo'
        }
    });
}

/**
 * Configura el modal de agregar venta
 */
function setupAgregarVentaModal() {
    const modalId = 'modalAgregarVenta';
    const formId = 'formAgregarVenta';
    
    setupModalForm(modalId, formId, {
        showLoading: true,
        resetOnOpen: true,
        realTimeValidation: true,
        autoClose: true,
        closeDelay: 1000,
        
        messages: {
            required: 'Este campo es requerido',
            number: 'Debe ser un número válido',
            min: 'El valor no puede ser negativo'
        }
    });
}

// ============================================
// EVENT LISTENERS ESPECÍFICOS
// ============================================

/**
 * Configura event listeners para botones de modales
 */
function setupModalButtonListeners() {
    // Botón para abrir modal de agregar venta
    const agregarVentaBtn = document.getElementById('agregar-venta-btn');
    if (agregarVentaBtn) {
        agregarVentaBtn.addEventListener('click', () => {
            openModal('modalAgregarVenta');
        });
    }
    
    // Botón para reporte de encargos
    const reporteEncargosBtn = document.getElementById('reporte-encargos-btn');
    if (reporteEncargosBtn) {
        reporteEncargosBtn.addEventListener('click', () => {
            openModal('modalEncargos');
        });
    }
    
    // Botones de cerrar específicos
    const closeButtons = [
        'close-modal-inventario',
        'close-modal-venta',
        'close-modal-agregar-venta',
        'close-modal-encargos',
        'cancel-inventario',
        'cancel-venta',
        'cancel-agregar-venta',
        'cancel-encargos'
    ];
    
    closeButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            const modalId = buttonId.replace('close-modal-', '')
                                   .replace('cancel-', '')
                                   .replace('inventario', 'Inventario')
                                   .replace('venta', 'Venta')
                                   .replace('agregar-venta', 'AgregarVenta')
                                   .replace('encargos', 'Encargos');
            
            button.addEventListener('click', () => {
                closeModal(`modal${modalId.charAt(0).toUpperCase() + modalId.slice(1)}`);
            });
        }
    });
}

// ============================================
// INICIALIZACIÓN COMPLETA
// ============================================

/**
 * Inicialización completa del sistema de modales
 */
function completeModalManagerSetup() {
    // Configurar animaciones
    setupModalAnimations();
    
    // Configurar modales específicos
    setupInventarioModal();
    setupVentaModal();
    setupAgregarVentaModal();
    
    // Configurar listeners de botones
    setupModalButtonListeners();
    
    // Configurar resize listener para reposicionar modales
    window.addEventListener('resize', () => {
        if (modalState.activeModal) {
            updateModalPosition(modalState.activeModal);
        }
    });
    
    console.log('🎨 Configuración completa de modales finalizada');
}

// ============================================
// EXPORTACIÓN
// ============================================

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeModalManager();
        completeModalManagerSetup();
    });
} else {
    initializeModalManager();
    completeModalManagerSetup();
}

// Exportar funciones al ámbito global
window.modalManager = {
    // Funciones principales
    openModal,
    closeModal,
    closeActiveModal,
    closeAllModals,
    
    // Utilidades
    isModalOpen,
    getActiveModalId,
    getModalStack,
    updateModalPosition,
    
    // Formularios en modales
    setupModalForm,
    validateFormField,
    
    // Configuración
    setupInventarioModal,
    setupVentaModal,
    setupAgregarVentaModal,
    
    // Getters
    get config() { return { ...MODAL_CONFIG }; },
    get state() { return { ...modalState }; }
};

console.log('✅ Gestor de modales cargado y listo');
