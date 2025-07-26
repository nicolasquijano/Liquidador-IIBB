import { dataTablesLocale } from '../main.js';
import { cargarLiquidacionesGuardadas } from './liquidacionesGuardadas.js';

/**
 * Función auxiliar para formatear el detalle de actividades en una subtabla.
 * Esta función se llama cuando el usuario hace clic en el botón de expandir (+).
 * @param {object} d - El objeto de datos de la fila principal.
 * @returns {string} - El HTML de la tabla anidada.
 */
function format(d) {
    // Comprueba si hay datos de detalle para mostrar
    if (!d || !d.detalle_por_actividad || Object.keys(d.detalle_por_actividad).length === 0) {
        return '<div class="p-3 text-muted">No hay detalle de actividades para esta jurisdicción.</div>';
    }

    // Construye la tabla anidada
    let table = '<table class="table table-sm table-bordered w-75 ms-5">';
    table += '<thead class="table-light"><tr><th>Actividad</th><th>Base Imponible</th></tr></thead><tbody>';
    
    for (const [actId, base] of Object.entries(d.detalle_por_actividad)) {
        // Busca la descripción de la actividad en los datos globales
        const actividad = window.actividadesGlobal.find(a => a.id == actId);
        const desc = actividad ? `${actividad.codigo_actividad} - ${actividad.descripcion}` : `Actividad ID: ${actId}`;
        table += `<tr><td>${desc}</td><td>${base.toFixed(2)}</td></tr>`;
    }
    
    table += '</tbody></table>';
    return table;
}

/**
 * Inicializa la DataTable para mostrar los resultados de la liquidación.
 */
export function inicializarGridLiquidacion() {
    // Si la tabla ya está inicializada, no hace nada.
    if ($.fn.DataTable.isDataTable('#tabla-liquidacion')) {
        return;
    }

    const table = $('#tabla-liquidacion').DataTable({
        // Define las columnas y cómo se deben renderizar los datos
        columns: [
            {
                className: 'dt-control', // Clase para el botón de expandir/colapsar
                orderable: false,
                data: null,
                defaultContent: '', // El botón '+' se crea con CSS
            },
            { data: 'nombre_jurisdiccion' },
            { data: 'base_imponible_total', render: (d) => d.toFixed(2) },
            { data: 'alicuota_media', render: (d) => d.toFixed(2) + ' %' },
            { data: 'impuesto_determinado', render: (d) => d.toFixed(2) },
            { data: 'saldo_anterior', render: (d) => d.toFixed(2) },
            { data: 'retenciones', render: (d) => d.toFixed(2) },
            { data: 'percepciones', render: (d) => d.toFixed(2) },
            { data: 'total_creditos', render: (d) => d.toFixed(2) },
            { 
                data: 'saldo_final',
                // Usa createdCell para dar estilo a la celda según su valor
                createdCell: function(td, cellData) {
                    const valor = parseFloat(cellData);
                    $(td).css('font-weight', 'bold');
                    if (valor > 0) {
                        $(td).css('color', 'tomato');
                        $(td).text(valor.toFixed(2));
                    } else {
                        $(td).css('color', 'lightgreen');
                        $(td).text(`(${Math.abs(valor).toFixed(2)})`);
                    }
                }
            }
        ],
        order: [[1, 'asc']], // Ordena por jurisdicción por defecto
        language: dataTablesLocale, // Usa la configuración de idioma español
        paging: false, // Desactiva la paginación para esta tabla
        info: false,
        searching: false
    });

    // Añade el evento de clic para expandir y colapsar las filas
    table.on('click', 'td.dt-control', function (e) {
        let tr = e.target.closest('tr');
        let row = table.row(tr);
 
        if (row.child.isShown()) {
            // Si la fila ya está expandida, la colapsa
            row.child.hide();
        } else {
            // Si está colapsada, muestra el detalle llamando a la función format()
            row.child(format(row.data())).show();
        }
    });
}

/**
 * Configura los valores iniciales del formulario de liquidación.
 */
export function setupModuloLiquidacion() {
    const mesSelect = document.getElementById('liq-mes');
    mesSelect.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        mesSelect.innerHTML += `<option value="${i}">${i.toString().padStart(2, '0')}</option>`;
    }
    const hoy = new Date();
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    document.getElementById('liq-anio').value = mesAnterior.getFullYear();
    mesSelect.value = mesAnterior.getMonth() + 1;
}

/**
 * Llama al backend para generar la liquidación y actualiza la tabla con los resultados.
 */
export async function generarLiquidacion() {
    if (!window.clienteActivoId) { 
        alert("Seleccione un cliente activo."); 
        return; 
    }
    const anio = document.getElementById('liq-anio').value;
    const mes = document.getElementById('liq-mes').value;

    try {
        const resultados = await window.go.main.App.GenerarLiquidacion(window.clienteActivoId, parseInt(anio), parseInt(mes)) || [];
        
        // Actualiza la tabla con los nuevos datos
        const table = $('#tabla-liquidacion').DataTable();
        table.clear().rows.add(resultados).draw();

        // Calcula y muestra los totales
        let totalImpuesto = 0, totalCreditos = 0, totalAPagar = 0;
        resultados.forEach(r => {
            totalImpuesto += r.impuesto_determinado;
            totalCreditos += r.retenciones + r.percepciones + r.saldo_anterior;
            if (r.saldo_final > 0) {
                totalAPagar += r.saldo_final;
            }
        });
        document.getElementById('total-impuesto').textContent = totalImpuesto.toFixed(2);
        document.getElementById('total-creditos').textContent = totalCreditos.toFixed(2);
        document.getElementById('total-a-pagar').textContent = totalAPagar.toFixed(2);
        
        // Refresca la tabla de liquidaciones guardadas
        await cargarLiquidacionesGuardadas();

    } catch (err) {
        alert(`Error al generar y guardar la liquidación: ${err}`);
        console.error(err);
    }
}