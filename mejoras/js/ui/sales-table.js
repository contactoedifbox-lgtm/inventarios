import { StateManager, Constants } from '../config/supabase-config.js';
import { DateTimeUtils, StringUtils } from '../modules/utils.js';

class SalesTableManager {
    constructor() {
        this.expandedGroups = new Set();
    }
    
    groupSalesForDisplay(ventas) {
        const groups = {};
        
        ventas.forEach(venta => {
            const groupId = venta.id_venta_agrupada || `IND-${venta.id}`;
            
            if (!groups[groupId]) {
                groups[groupId] = {
                    id: groupId,
                    fecha: venta.fecha_venta,
                    total: 0,
                    items: [],
                    expandida: false
                };
            }
            
            const subtotal = (venta.cantidad * venta.precio_unitario) - (venta.descuento || 0);
            groups[groupId].total += subtotal;
            groups[groupId].items.push(venta);
        });
        
        return Object.values(groups);
    }
    
    displayGroupedSales(groups) {
        const tbody = document.getElementById('ventasBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (groups.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
                        <i class="fas fa-inbox"></i> No hay ventas registradas
                    </td>
                </tr>
            `;
            return;
        }
        
        groups.forEach(group => {
            const isExpanded = this.expandedGroups.has(group.id);
            const fechaFormateada = DateTimeUtils.formatToChileTime(group.fecha);
            
            const groupRow = `
                <tr class="sale-group-row" data-group-id="${StringUtils.escapeHTML(group.id)}">
                    <td colspan="2" style="font-weight: bold; color: var(--dark);">
                        <button class="expand-group-btn" style="background: none; border: none; cursor: pointer; margin-right: 10px; color: var(--primary);">
                            <i class="fas fa-${isExpanded ? 'chevron-down' : 'chevron-right'}"></i>
                        </button>
                        ${StringUtils.escapeHTML(group.id)}
                    </td>
                    <td colspan="4" style="color: var(--gray-600);">
                        ${fechaFormateada}
                        <span style="margin-left: 20px; font-weight: bold; color: var(--success);">
                            TOTAL: $${group.total.toFixed(2)}
                        </span>
                    </td>
                    <td colspan="2">
                        <span style="color: var(--gray-500); font-size: 12px;">
                            ${group.items.length} ${group.items.length === 1 ? 'producto' : 'productos'}
                        </span>
                        <button class="action-btn btn-edit edit-group-btn" data-group-id="${StringUtils.escapeHTML(group.id)}" style="margin-left: 10px;">
                            <i class="fas fa-edit"></i> Ver/Editar
                        </button>
                    </td>
                </tr>
            `;
            
            tbody.innerHTML += groupRow;
            
            if (isExpanded) {
                this.displayGroupItems(group, tbody);
            }
        });
        
        this.setupGroupEventListeners();
    }
    
    displayGroupItems(group, tbody) {
        group.items.forEach((item, index) => {
            const fechaFormateada = DateTimeUtils.formatToChileTime(item.fecha_venta);
            const descuento = parseFloat(item.descuento || 0);
            const subtotal = (item.cantidad * item.precio_unitario) - descuento;
            
            const itemRow = `
                <tr class="sale-item-row" data-group-id="${StringUtils.escapeHTML(group.id)}" style="background: var(--gray-100);">
                    <td style="padding-left: 50px;">
                        <span style="color: var(--gray-500); margin-right: 10px;">${index + 1}.</span>
                        ${StringUtils.escapeHTML(item.codigo_barras)}
                    </td>
                    <td>${item.cantidad}</td>
                    <td>$${parseFloat(item.precio_unitario || 0).toFixed(2)}</td>
                    <td>${descuento > 0 ? `-$${descuento.toFixed(2)}` : '$0.00'}</td>
                    <td><strong>$${subtotal.toFixed(2)}</strong></td>
                    <td>${StringUtils.escapeHTML(item.descripcion || '')}</td>
                    <td>${fechaFormateada}</td>
                    <td>
                        <button class="action-btn btn-edit" 
                                data-codigo="${StringUtils.escapeHTML(item.codigo_barras)}" 
                                data-fecha="${StringUtils.escapeHTML(item.fecha_venta)}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="action-btn btn-delete" 
                                data-codigo="${StringUtils.escapeHTML(item.codigo_barras)}" 
                                data-fecha="${StringUtils.escapeHTML(item.fecha_venta)}" 
                                data-cantidad="${item.cantidad}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                </tr>
            `;
            
            tbody.innerHTML += itemRow;
        });
    }
    
    setupGroupEventListeners() {
        document.querySelectorAll('.expand-group-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupRow = e.target.closest('.sale-group-row');
                const groupId = groupRow.getAttribute('data-group-id');
                
                this.toggleGroup(groupId);
            });
        });
        
        document.querySelectorAll('.edit-group-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = e.target.closest('.edit-group-btn').getAttribute('data-group-id');
                
                this.editGroup(groupId);
            });
        });
        
        const itemEditButtons = document.querySelectorAll('.sale-item-row .btn-edit');
        const itemDeleteButtons = document.querySelectorAll('.sale-item-row .btn-delete');
        
        if (itemEditButtons.length > 0) {
            import('../modules/ventas.js').then(module => {
                itemEditButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const codigo = this.getAttribute('data-codigo');
                        const fecha = this.getAttribute('data-fecha');
                        module.editSale(codigo, fecha);
                    });
                });
            });
        }
        
        if (itemDeleteButtons.length > 0) {
            import('../modules/ventas.js').then(module => {
                itemDeleteButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const codigo = this.getAttribute('data-codigo');
                        const fecha = this.getAttribute('data-fecha');
                        const cantidad = parseInt(this.getAttribute('data-cantidad'));
                        module.deleteSale(codigo, fecha, cantidad);
                    });
                });
            });
        }
    }
    
    toggleGroup(groupId) {
        if (this.expandedGroups.has(groupId)) {
            this.expandedGroups.delete(groupId);
        } else {
            this.expandedGroups.add(groupId);
        }
        
        this.refreshSalesTable();
    }
    
    editGroup(groupId) {
        const ventas = StateManager.ventas;
        const groupItems = ventas.filter(v => v.id_venta_agrupada === groupId);
        
        if (groupItems.length === 0) {
            console.error('Grupo no encontrado:', groupId);
            return;
        }
        
        this.showGroupDetailsModal(groupId, groupItems);
    }
    
    showGroupDetailsModal(groupId, items) {
        const fecha = DateTimeUtils.formatToChileTime(items[0].fecha_venta);
        let total = 0;
        
        let itemsHTML = '';
        items.forEach((item, index) => {
            const subtotal = (item.cantidad * item.precio_unitario) - (item.descuento || 0);
            total += subtotal;
            
            itemsHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${StringUtils.escapeHTML(item.codigo_barras)}</strong></td>
                    <td>${StringUtils.escapeHTML(item.descripcion || '')}</td>
                    <td>${item.cantidad}</td>
                    <td>$${parseFloat(item.precio_unitario || 0).toFixed(2)}</td>
                    <td>$${parseFloat(item.descuento || 0).toFixed(2)}</td>
                    <td><strong>$${subtotal.toFixed(2)}</strong></td>
                </tr>
            `;
        });
        
        const modalHTML = `
            <div class="modal" id="modalDetalleGrupo" style="display: flex;">
                <div class="modal-content modal-wide">
                    <div class="modal-header">
                        <h2><i class="fas fa-receipt"></i> Detalle de Venta: ${StringUtils.escapeHTML(groupId)}</h2>
                        <button class="modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="modal-header-info">
                            <div>
                                <h3>Fecha: ${fecha}</h3>
                                <p>Total de la venta: <strong style="color: var(--success); font-size: 18px;">$${total.toFixed(2)}</strong></p>
                            </div>
                        </div>
                        
                        <div class="table-scroll">
                            <table class="encargos-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Código</th>
                                        <th>Descripción</th>
                                        <th>Cantidad</th>
                                        <th>Precio</th>
                                        <th>Descuento</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHTML}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="info-box">
                            <h4><i class="fas fa-info-circle"></i> Acciones disponibles:</h4>
                            <ul>
                                <li>Para editar o eliminar un producto específico, usa los botones en la tabla principal</li>
                                <li>Esta vista es solo informativa</li>
                                <li>Exporta a Excel para obtener todos los detalles</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="action-btn btn-cancel close-detail-modal">Cerrar</button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('modalDetalleGrupo');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        document.querySelector('#modalDetalleGrupo .modal-close').addEventListener('click', () => {
            document.getElementById('modalDetalleGrupo').remove();
        });
        
        document.querySelector('#modalDetalleGrupo .close-detail-modal').addEventListener('click', () => {
            document.getElementById('modalDetalleGrupo').remove();
        });
        
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('modalDetalleGrupo');
            if (modal && e.target === modal) {
                modal.remove();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('modalDetalleGrupo');
                if (modal) {
                    modal.remove();
                }
            }
        });
    }
    
    refreshSalesTable() {
        const groups = this.groupSalesForDisplay(StateManager.ventas);
        this.displayGroupedSales(groups);
    }
    
    exportGroupedToCSV() {
        const ventas = StateManager.ventas;
        let csv = 'id_venta_agrupada,numero_linea,barcode,descripcion,cantidad,precio_unitario,descuento,subtotal,fecha_venta\n';
        
        ventas.forEach(venta => {
            const subtotal = (venta.cantidad * venta.precio_unitario) - (venta.descuento || 0);
            
            const row = [
                venta.id_venta_agrupada || `IND-${venta.id}`,
                venta.numero_linea || 1,
                `"${venta.codigo_barras}"`,
                `"${(venta.descripcion || '').replace(/"/g, '""')}"`,
                venta.cantidad,
                parseFloat(venta.precio_unitario || 0).toFixed(2),
                parseFloat(venta.descuento || 0).toFixed(2),
                subtotal.toFixed(2),
                `"${venta.fecha_venta}"`
            ].join(',');
            
            csv += row + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `ventas_detalladas_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        window.URL.revokeObjectURL(url);
    }
}

const salesTableManager = new SalesTableManager();

export function refreshSalesTableView() {
    salesTableManager.refreshSalesTable();
}

export function exportGroupedSalesToCSV() {
    salesTableManager.exportGroupedToCSV();
}

export default salesTableManager;
