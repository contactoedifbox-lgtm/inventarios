import { checkAuth, setupAuthEventListeners } from './modules/auth.js';
import modalManager from './ui/modals.js';
import notificationManager from './ui/notifications.js';
import { setupTabNavigation, setupSearch } from './ui/search.js';
import { setupSalesEventListeners } from './modules/ventas.js';
import { setupInventoryEventListeners } from './modules/inventario.js';
import { setupOfflineMonitoring } from './modules/offline.js';

class InventarioApp {
    constructor() {
        this.init();
    }
    
    async init() {
        this.setupGlobalEventListeners();
        this.setupUIComponents();
        
        await checkAuth();
    }
    
    setupGlobalEventListeners() {
        window.addEventListener('online', this.handleOnlineStatus.bind(this));
        window.addEventListener('offline', this.handleOfflineStatus.bind(this));
        
        document.addEventListener('DOMContentLoaded', () => {
            console.log('=== INICIANDO APLICACIÓN ===');
            
            setupAuthEventListeners();
            modalManager.setupModalCloseEvents();
            setupTabNavigation();
            setupSearch();
            setupSalesEventListeners();
            setupInventoryEventListeners();
            setupOfflineMonitoring();
            
            this.setupMultipleSalesButton();
            this.setupModalCancelButtons();
            
            console.log('=== APLICACIÓN INICIADA ===');
        });
    }
    
    setupMultipleSalesButton() {
        const ventaMultipleBtn = document.getElementById('agregar-venta-multiple-btn');
        if (ventaMultipleBtn) {
            ventaMultipleBtn.addEventListener('click', () => {
                console.log('🔘 Botón Venta Múltiple clickeado');
                
                import('./modules/ventas-multiples.js')
                    .then(module => {
                        console.log('✅ Módulo ventas-multiples cargado');
                        module.openMultipleSaleModal();
                    })
                    .catch(error => {
                        console.error('❌ Error cargando ventas-multiples.js:', error);
                        this.openModalWithBasicFunctionality();
                    });
            });
            console.log('✅ Botón Venta Múltiple configurado');
        } else {
            console.error('❌ Botón agregar-venta-multiple-btn no encontrado');
        }
    }
    
    openModalWithBasicFunctionality() {
        console.log('📱 Abriendo modal con funcionalidad básica');
        const modal = document.getElementById('modalVentaMultiple');
        if (!modal) {
            console.error('❌ Modal modalVentaMultiple no encontrado');
            return;
        }
        
        modal.style.display = 'flex';
        
        this.updateMultipleSaleDate();
        this.setupBasicMultipleSaleListeners();
        this.generateBasicSaleId();
    }
    
    updateMultipleSaleDate() {
        const fechaElement = document.getElementById('ventaMultipleFecha');
        if (fechaElement) {
            const now = new Date();
            const fechaChile = new Date(now.getTime() + (-3 * 60 * 60 * 1000));
            fechaElement.textContent = fechaChile.toLocaleDateString('es-CL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }
    
    generateBasicSaleId() {
        const idElement = document.getElementById('ventaMultipleId');
        if (idElement) {
            const today = new Date();
            const year = today.getFullYear().toString().slice(-2);
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            
            let nextId = localStorage.getItem('next_venta_id_basic') || '001';
            const saleId = `VET-${year}${month}${day}-${nextId}`;
            idElement.textContent = saleId;
        }
    }
    
    setupBasicMultipleSaleListeners() {
        const buscarInput = document.getElementById('buscarProductoMultiple');
        const saveButton = document.getElementById('save-multiple-sale');
        const cancelButton = document.getElementById('cancel-multiple-sale');
        
        if (buscarInput) {
            buscarInput.addEventListener('input', (e) => {
                console.log('🔍 Buscando:', e.target.value);
                this.showTestSearchResults();
            });
        }
        
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                alert('Funcionalidad de guardar venta múltiple - En desarrollo');
            });
        }
        
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                modalManager.close('modalVentaMultiple');
            });
        }
    }
    
    showTestSearchResults() {
        const resultadosDiv = document.getElementById('resultadosBusquedaMultiple');
        if (resultadosDiv) {
            resultadosDiv.innerHTML = `
                <div style="padding: 10px; border-bottom: 1px solid #e2e8f0; cursor: pointer;" class="test-product" data-code="TEST001">
                    <div><strong>TEST001</strong></div>
                    <div style="color: #475569; font-size: 14px;">Producto de Prueba 1</div>
                    <div style="color: #64748b; font-size: 12px;">Stock: 10 | Precio: $15.50</div>
                </div>
                <div style="padding: 10px; border-bottom: 1px solid #e2e8f0; cursor: pointer;" class="test-product" data-code="TEST002">
                    <div><strong>TEST002</strong></div>
                    <div style="color: #475569; font-size: 14px;">Producto de Prueba 2</div>
                    <div style="color: #64748b; font-size: 12px;">Stock: 5 | Precio: $25.00</div>
                </div>
                <div style="padding: 10px; cursor: pointer;" class="test-product" data-code="TEST003">
                    <div><strong>TEST003</strong></div>
                    <div style="color: #475569; font-size: 14px;">Producto de Prueba 3</div>
                    <div style="color: #64748b; font-size: 12px;">Stock: 20 | Precio: $8.75</div>
                </div>
            `;
            resultadosDiv.style.display = 'block';
            
            document.querySelectorAll('.test-product').forEach(div => {
                div.addEventListener('click', (e) => {
                    const code = e.currentTarget.getAttribute('data-code');
                    console.log('➕ Agregando producto:', code);
                    this.addTestProductToSale(code);
                    resultadosDiv.style.display = 'none';
                });
            });
        }
    }
    
    addTestProductToSale(code) {
        const itemsList = document.getElementById('itemsListContainer');
        
        const emptyMessage = itemsList.querySelector('.empty-items-message');
        if (emptyMessage) {
            itemsList.innerHTML = '';
        }
        
        const testProducts = {
            'TEST001': { nombre: 'Producto de Prueba 1', precio: 15.50, stock: 10 },
            'TEST002': { nombre: 'Producto de Prueba 2', precio: 25.00, stock: 5 },
            'TEST003': { nombre: 'Producto de Prueba 3', precio: 8.75, stock: 20 }
        };
        
        const product = testProducts[code] || { nombre: 'Producto Genérico', precio: 10.00, stock: 1 };
        const itemCount = document.querySelectorAll('.multiple-item-row').length + 1;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'multiple-item-row';
        itemElement.innerHTML = `
            <div class="item-number">${itemCount}</div>
            <div class="item-product-info">
                <div class="item-product-code">${code}</div>
                <div class="item-product-name">${product.nombre}</div>
                <div class="item-product-stock">Stock: ${product.stock}</div>
            </div>
            <div class="item-quantity">
                <input type="number" class="item-cantidad-input" value="1" min="1">
            </div>
            <div class="item-price">
                <input type="number" class="item-precio-input" value="${product.precio.toFixed(2)}" step="0.01" min="0">
            </div>
            <div class="item-discount">
                <input type="number" class="item-descuento-input" value="0.00" step="0.01" min="0">
            </div>
            <div class="item-subtotal">$${product.precio.toFixed(2)}</div>
            <div class="item-remove">
                <button class="remove-item-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        itemsList.appendChild(itemElement);
        
        this.setupItemListeners(itemElement);
        this.updateMultipleSaleTotals();
        
        document.getElementById('buscarProductoMultiple').value = '';
        document.getElementById('buscarProductoMultiple').focus();
    }
    
    setupItemListeners(itemElement) {
        const cantidadInput = itemElement.querySelector('.item-cantidad-input');
        const precioInput = itemElement.querySelector('.item-precio-input');
        const descuentoInput = itemElement.querySelector('.item-descuento-input');
        const removeButton = itemElement.querySelector('.remove-item-btn');
        
        if (cantidadInput) {
            cantidadInput.addEventListener('input', () => this.updateMultipleSaleTotals());
        }
        
        if (precioInput) {
            precioInput.addEventListener('input', () => this.updateMultipleSaleTotals());
        }
        
        if (descuentoInput) {
            descuentoInput.addEventListener('input', () => this.updateMultipleSaleTotals());
        }
        
        if (removeButton) {
            removeButton.addEventListener('click', () => {
                itemElement.remove();
                this.updateMultipleSaleTotals();
            });
        }
    }
    
    updateMultipleSaleTotals() {
        let subtotal = 0;
        let descuentoTotal = 0;
        
        document.querySelectorAll('.multiple-item-row').forEach(row => {
            const cantidad = parseFloat(row.querySelector('.item-cantidad-input').value) || 0;
            const precio = parseFloat(row.querySelector('.item-precio-input').value) || 0;
            const descuento = parseFloat(row.querySelector('.item-descuento-input').value) || 0;
            
            subtotal += cantidad * precio;
            descuentoTotal += descuento;
            
            const subtotalElement = row.querySelector('.item-subtotal');
            if (subtotalElement) {
                const itemSubtotal = (cantidad * precio) - descuento;
                subtotalElement.textContent = `$${itemSubtotal.toFixed(2)}`;
            }
        });
        
        const total = subtotal - descuentoTotal;
        
        const subtotalElement = document.getElementById('multipleSubtotal');
        const descuentoElement = document.getElementById('multipleDescuentoTotal');
        const totalElement = document.getElementById('multipleTotalVenta');
        
        if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
        if (descuentoElement) descuentoElement.textContent = `$${descuentoTotal.toFixed(2)}`;
        if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;
    }
    
    setupModalCancelButtons() {
        const modal = document.getElementById('modalVentaMultiple');
        if (modal) {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }
        }
    }
    
    setupUIComponents() {
        this.setupRealTimeClock();
    }
    
    setupRealTimeClock() {
        setInterval(() => {
            this.updateDateTimeDisplays();
        }, 60000);
        
        this.updateDateTimeDisplays();
    }
    
    updateDateTimeDisplays() {
        const fechaHoyElement = document.getElementById('fecha-hoy');
        
        if (fechaHoyElement) {
            import('./modules/utils.js').then(({ DateTimeUtils }) => {
                fechaHoyElement.textContent = DateTimeUtils.getCurrentChileDate();
            });
        }
    }
    
    handleOnlineStatus() {
        notificationManager.success('🌐 Conexión a internet restablecida');
        
        setTimeout(() => {
            import('./modules/offline.js').then(({ syncPendingSales }) => {
                syncPendingSales();
            });
        }, 3000);
    }
    
    handleOfflineStatus() {
        notificationManager.warning('📴 Modo offline activado. Las ventas se guardarán localmente');
    }
}

new InventarioApp();
