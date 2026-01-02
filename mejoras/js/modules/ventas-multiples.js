import Constants from '../config/constants.js';
import modalManager from '../ui/modals.js';

class MultipleSalesManager {
    constructor() {
        this.items = [];
    }
    
    initialize() {
        console.log('MultipleSalesManager inicializado');
        this.generateSaleId();
        this.updateSaleDate();
        this.setupBasicEventListeners();
        this.testFunctionality();
    }
    
    generateSaleId() {
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        
        let nextId = localStorage.getItem('next_venta_id_test') || '001';
        const saleId = `${Constants.MULTIPLE_SALE.PREFIX}${year}${month}${day}-${nextId}`;
        
        const idElement = document.getElementById('ventaMultipleId');
        if (idElement) {
            idElement.textContent = saleId;
            console.log('ID generado:', saleId);
        }
    }
    
    updateSaleDate() {
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
    
    setupBasicEventListeners() {
        console.log('Configurando event listeners básicos');
        
        const buscarInput = document.getElementById('buscarProductoMultiple');
        const saveButton = document.getElementById('save-multiple-sale');
        const cancelButton = document.getElementById('cancel-multiple-sale');
        
        if (buscarInput) {
            buscarInput.addEventListener('input', (e) => {
                console.log('Buscando producto:', e.target.value);
                this.simulateSearch();
            });
        } else {
            console.error('No se encontró buscarProductoMultiple');
        }
        
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                console.log('Guardar venta múltiple clickeado');
                alert('Funcionalidad de guardar venta múltiple - Prueba exitosa');
            });
        } else {
            console.error('No se encontró save-multiple-sale');
        }
        
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                console.log('Cancelar clickeado');
                modalManager.close('modalVentaMultiple');
            });
        } else {
            console.error('No se encontró cancel-multiple-sale');
        }
    }
    
    simulateSearch() {
        const resultadosDiv = document.getElementById('resultadosBusquedaMultiple');
        if (resultadosDiv) {
            resultadosDiv.innerHTML = `
                <div style="padding: 10px; border-bottom: 1px solid #e2e8f0; cursor: pointer;">
                    <div><strong>789012</strong></div>
                    <div style="color: #475569; font-size: 14px;">Vacuna Antirrábica Canina</div>
                    <div style="color: #64748b; font-size: 12px;">Stock: 15 | Precio: $25.00</div>
                </div>
                <div style="padding: 10px; border-bottom: 1px solid #e2e8f0; cursor: pointer;">
                    <div><strong>123456</strong></div>
                    <div style="color: #475569; font-size: 14px;">Arnés Mediano para Perro</div>
                    <div style="color: #64748b; font-size: 12px;">Stock: 8 | Precio: $12.50</div>
                </div>
                <div style="padding: 10px; cursor: pointer;">
                    <div><strong>345678</strong></div>
                    <div style="color: #475569; font-size: 14px;">Alimento Premium Gato Adulto</div>
                    <div style="color: #64748b; font-size: 12px;">Stock: 20 | Precio: $8.75</div>
                </div>
            `;
            resultadosDiv.style.display = 'block';
            
            document.querySelectorAll('#resultadosBusquedaMultiple div').forEach(div => {
                div.addEventListener('click', () => {
                    console.log('Producto seleccionado para prueba');
                    this.addTestProduct();
                });
            });
        }
    }
    
    addTestProduct() {
        const itemsList = document.getElementById('itemsListContainer');
        
        if (this.items.length === 0) {
            itemsList.innerHTML = '';
        }
        
        const testProducts = [
            { codigo: '789012', nombre: 'Vacuna Antirrábica Canina', stock: 15, precio: 25.00 },
            { codigo: '123456', nombre: 'Arnés Mediano para Perro', stock: 8, precio: 12.50 },
            { codigo: '345678', nombre: 'Alimento Premium Gato Adulto', stock: 20, precio: 8.75 }
        ];
        
        const randomProduct = testProducts[Math.floor(Math.random() * testProducts.length)];
        const itemCount = this.items.length + 1;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'multiple-item-row';
        itemElement.innerHTML = `
            <div class="item-number">${itemCount}</div>
            <div class="item-product-info">
                <div class="item-product-code">${randomProduct.codigo}</div>
                <div class="item-product-name">${randomProduct.nombre}</div>
                <div class="item-product-stock">Stock: ${randomProduct.stock}</div>
            </div>
            <div class="item-quantity">
                <input type="number" class="item-cantidad-input" value="1" min="1">
            </div>
            <div class="item-price">
                <input type="number" class="item-precio-input" value="${randomProduct.precio.toFixed(2)}" step="0.01" min="0">
            </div>
            <div class="item-discount">
                <input type="number" class="item-descuento-input" value="0.00" step="0.01" min="0">
            </div>
            <div class="item-subtotal">$${randomProduct.precio.toFixed(2)}</div>
            <div class="item-remove">
                <button class="remove-item-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        itemsList.appendChild(itemElement);
        this.items.push(randomProduct);
        
        this.updateTotals();
        
        const resultadosDiv = document.getElementById('resultadosBusquedaMultiple');
        if (resultadosDiv) {
            resultadosDiv.style.display = 'none';
        }
        
        document.getElementById('buscarProductoMultiple').value = '';
        document.getElementById('buscarProductoMultiple').focus();
    }
    
    updateTotals() {
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
        
        document.getElementById('multipleSubtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('multipleDescuentoTotal').textContent = `$${descuentoTotal.toFixed(2)}`;
        document.getElementById('multipleTotalVenta').textContent = `$${total.toFixed(2)}`;
    }
    
    testFunctionality() {
        console.log('Probando funcionalidades...');
        
        const elementsToTest = [
            'ventaMultipleId',
            'ventaMultipleFecha',
            'buscarProductoMultiple',
            'resultadosBusquedaMultiple',
            'itemsListContainer',
            'multipleSubtotal',
            'multipleDescuentoTotal',
            'multipleTotalVenta',
            'save-multiple-sale',
            'cancel-multiple-sale'
        ];
        
        elementsToTest.forEach(id => {
            const element = document.getElementById(id);
            console.log(`${id}:`, element ? '✅ Encontrado' : '❌ No encontrado');
        });
    }
    
    openModal() {
        console.log('=== ABRIENDO MODAL VENTA MÚLTIPLE ===');
        this.initialize();
        
        const modal = document.getElementById('modalVentaMultiple');
        if (modal) {
            modal.style.display = 'flex';
            console.log('Modal mostrado');
        } else {
            console.error('Modal modalVentaMultiple no encontrado');
        }
    }
}

const multipleSalesManager = new MultipleSalesManager();

export function openMultipleSaleModal() {
    multipleSalesManager.openModal();
}

export default multipleSalesManager;
