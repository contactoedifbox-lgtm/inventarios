import { StateManager, Constants } from '../config/supabase-config.js';
import { DateTimeUtils, StringUtils } from '../modules/utils.js';
import notificationManager from './notifications.js';
import { supabaseClient } from '../config/supabase-config.js';

export function agruparVentas(ventas) {
    const ventasAgrupadas = {};
    
    ventas.forEach(venta => {
        const idVenta = venta.id_venta_agrupada || `IND-${venta.id}`;
        
        if (!ventasAgrupadas[idVenta]) {
            ventasAgrupadas[idVenta] = {
                id_venta: idVenta,
                fecha: venta.fecha_venta,
                total: 0,
                items: [],
                expandida: false
            };
        }
        
        const subtotal = (venta.cantidad * venta.precio_unitario) - (venta.descuento || 0);
        ventasAgrupadas[idVenta].total += subtotal;
        ventasAgrupadas[idVenta].items.push(venta);
    });
    
    return Object.values(ventasAgrupadas).sort((a, b) => 
        new Date(b.fecha) - new Date(a.fecha)
    );
}

export function displayGroupedSales(ventasAgrupadas) {
    const tbody = document.getElementById('ventasBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (ventasAgrupadas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-inbox"></i> No hay ventas registradas
                </td>
            </tr>
        `;
        return;
    }
    
    const hoyChile = DateTimeUtils.getTodayChileDate();
    const totalHoy = ventasAgrupadas
        .filter(v => v.fecha && v.fecha.split('T')[0] === hoyChile)
        .reduce((sum, v) => sum + v.total, 0);
    
    const ventasHoyElement = document.getElementById('ventas-hoy');
    if (ventasHoyElement) {
        ventasHoyElement.textContent = `$${totalHoy.toFixed(2)}`;
    }
    
    ventasAgrupadas.forEach(grupo => {
        const fechaFormateada = DateTimeUtils.formatToChileTime(grupo.fecha);
        const icono = grupo.expandida ? '🔽' : '▶';
        
        const mainRow = `
            <tr class="venta-agrupada" data-venta-id="${StringUtils.escapeHTML(grupo.id_venta)}">
                <td colspan="2" style="font-weight: bold; color: #1e293b;">
                    ${icono} ${StringUtils.escapeHTML(grupo.id_venta)}
                </td>
                <td colspan="2" style="color: #64748b; font-size: 14px;">
                    ${fechaFormateada}
                </td>
                <td style="font-weight: bold; color: #10b981;">
                    $${grupo.total.toFixed(2)}
                </td>
                <td colspan="2" style="color: #64748b; font-size: 14px;">
                    ${grupo.items.length} producto(s)
                </td>
                <td>
                    <button class="action-btn btn-edit toggle-venta" data-venta="${StringUtils.escapeHTML(grupo.id_venta)}">
                        <i class="fas fa-${grupo.expandida ? 'minus' : 'plus'}"></i> ${grupo.expandida ? 'Contraer' : 'Expandir'}
                    </button>
                    <button class="action-btn btn-delete eliminar-venta-agrupada" data-venta="${StringUtils.escapeHTML(grupo.id_venta)}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `;
        
        tbody.innerHTML += mainRow;
        
        if (grupo.expandida) {
            grupo.items.forEach((item, index) => {
                const fechaItem = DateTimeUtils.formatToChileTime(item.fecha_venta);
                const descuento = parseFloat(item.descuento || 0);
                const subtotal = (item.cantidad * item.precio_unitario) - descuento;
                
                const detailRow = `
                    <tr class="venta-detalle" data-venta-id="${StringUtils.escapeHTML(grupo.id_venta)}" style="background-color: #f8fafc;">
                        <td style="padding-left: 40px; color: #64748b; font-size: 13px;">
                            ${index + 1}. ${StringUtils.escapeHTML(item.codigo_barras)}
                        </td>
                        <td style="color: #64748b; font-size: 13px;">${item.cantidad}</td>
                        <td style="color: #64748b; font-size: 13px;">$${parseFloat(item.precio_unitario || 0).toFixed(2)}</td>
                        <td style="color: #64748b; font-size: 13px;">${descuento > 0 ? `-$${descuento.toFixed(2)}` : '$0.00'}</td>
                        <td style="color: #64748b; font-size: 13px; font-weight: 500;">$${subtotal.toFixed(2)}</td>
                        <td style="color: #64748b; font-size: 13px;">${StringUtils.escapeHTML(item.descripcion || '')}</td>
                        <td style="color: #64748b; font-size: 13px;">${fechaItem}</td>
                        <td style="color: #64748b; font-size: 13px;">
                            <button class="action-btn btn-edit editar-item-venta" data-id="${item.id}">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="action-btn btn-delete eliminar-item-venta" data-id="${item.id}" data-cantidad="${item.cantidad}">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </td>
                    </tr>
                `;
                
                tbody.innerHTML += detailRow;
            });
        }
    });
    
    setupGroupedSalesEventListeners();
}

function setupGroupedSalesEventListeners() {
    document.querySelectorAll('.toggle-venta').forEach(button => {
        button.addEventListener('click', function() {
            const idVenta = this.getAttribute('data-venta');
            toggleVentaExpandida(idVenta);
        });
    });
    
    document.querySelectorAll('.eliminar-venta-agrupada').forEach(button => {
        button.addEventListener('click', function() {
            const idVenta = this.getAttribute('data-venta');
            eliminarVentaAgrupada(idVenta);
        });
    });
    
    document.querySelectorAll('.editar-item-venta').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            
            import('../modules/ventas.js').then(module => {
                module.editSale(id);
            });
        });
    });
    
    document.querySelectorAll('.eliminar-item-venta').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const cantidad = parseInt(this.getAttribute('data-cantidad'));
            
            import('../modules/ventas.js').then(module => {
                module.deleteSale(id, cantidad);
            });
        });
    });
}

function toggleVentaExpandida(idVenta) {
    const ventas = StateManager.ventas;
    const ventasAgrupadas = agruparVentas(ventas);
    
    const grupoIndex = ventasAgrupadas.findIndex(g => g.id_venta === idVenta);
    if (grupoIndex !== -1) {
        ventasAgrupadas[grupoIndex].expandida = !ventasAgrupadas[grupoIndex].expandida;
    }
    
    displayGroupedSales(ventasAgrupadas);
}

async function eliminarVentaAgrupada(idVenta) {
    if (!confirm(`¿Eliminar toda la venta ${idVenta}?\nEsta acción eliminará todos los productos de esta venta y restaurará el stock.`)) {
        return;
    }
    
    try {
        notificationManager.info('🔄 Eliminando venta agrupada...');
        
        const ventasAEliminar = StateManager.ventas.filter(v => 
            v.id_venta_agrupada === idVenta
        );
        
        if (ventasAEliminar.length === 0) {
            notificationManager.error('No se encontró la venta especificada');
            return;
        }
        
        let eliminacionesExitosas = 0;
        
        for (const venta of ventasAEliminar) {
            try {
                const { error } = await supabaseClient
                    .from(Constants.API_ENDPOINTS.SALES_TABLE)
                    .delete()
                    .eq('id', venta.id);
                
                if (!error) {
                    const producto = StateManager.getProducto(venta.codigo_barras);
                    if (producto) {
                        const nuevoStock = producto.cantidad + venta.cantidad;
                        
                        await supabaseClient
                            .from(Constants.API_ENDPOINTS.INVENTORY_TABLE)
                            .update({ 
                                cantidad: nuevoStock,
                                fecha_actualizacion: new Date().toISOString()
                            })
                            .eq('barcode', venta.codigo_barras);
                        
                        StateManager.updateInventoryItem(venta.codigo_barras, {
                            cantidad: nuevoStock,
                            fecha_actualizacion: new Date().toISOString()
                        });
                    }
                    
                    eliminacionesExitosas++;
                }
            } catch (error) {
                console.error(`Error eliminando item ${venta.codigo_barras}:`, error);
            }
        }
        
        if (eliminacionesExitosas > 0) {
            const { loadSalesData } = await import('../modules/inventario.js');
            await loadSalesData();
            
            notificationManager.success(`✅ Venta ${idVenta} eliminada. ${eliminacionesExitosas} productos restaurados.`);
        } else {
            notificationManager.error('❌ No se pudo eliminar la venta');
        }
        
    } catch (error) {
        console.error('Error eliminando venta agrupada:', error);
        notificationManager.error('❌ Error al eliminar la venta: ' + error.message);
    }
}

export function exportGroupedSalesToCSV() {
    const ventas = StateManager.ventas;
    
    if (ventas.length === 0) {
        notificationManager.warning('No hay datos para exportar');
        return;
    }
    
    let csv = Constants.EXPORT_COLUMNS.VENTAS.join(',') + '\n';
    
    ventas.forEach(venta => {
        const row = Constants.EXPORT_COLUMNS.VENTAS.map(columna => {
            let valor = venta[columna];
            
            if (columna === 'fecha_venta') {
                valor = DateTimeUtils.formatToChileTime(valor);
            } else if (typeof valor === 'string' && valor.includes(',')) {
                valor = `"${valor}"`;
            } else if (valor === null || valor === undefined) {
                valor = '';
            }
            
            return valor;
        });
        
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `ventas_agrupadas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    window.URL.revokeObjectURL(url);
    
    notificationManager.success('Archivo CSV exportado correctamente');
}

export function updateSalesTableView(modoAgrupado = true) {
    const ventas = StateManager.ventas;
    
    if (modoAgrupado) {
        const ventasAgrupadas = agruparVentas(ventas);
        displayGroupedSales(ventasAgrupadas);
    } else {
        import('../modules/inventario.js').then(module => {
            module.displaySales(ventas);
        });
    }
}
