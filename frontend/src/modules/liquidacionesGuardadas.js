import { dataTablesLocale } from '../main.js';

export function inicializarGridLiquidacionesGuardadas() {
    if ($.fn.DataTable.isDataTable('#tabla-liquidaciones-guardadas')) {
        return;
    }
    $('#tabla-liquidaciones-guardadas').DataTable({
        columns: [
            { data: 'periodo', title: 'Período' },
            { 
                data: 'rectificativa_nro',
                title: 'Tipo',
                render: (data) => data === 0 ? 'Original' : `Rect. N° ${data}`
            },
            { 
                data: 'fecha',
                title: 'Fecha de Creación',
                render: (data) => new Date(data).toLocaleString('es-AR')
            },
            {
                data: 'id',
                title: 'Acciones',
                orderable: false,
                width: '120px',
                render: (id) => {
                    return `<button class="btn btn-secondary btn-sm">Ver</button>
                            <button class="btn btn-danger btn-sm" onclick="eliminarLiquidacion(${id})">Borrar</button>`;
                }
            }
        ],
        order: [[0, 'desc'], [1, 'desc']],
        language: dataTablesLocale
    });
}

export async function cargarLiquidacionesGuardadas() {
    if (!window.clienteActivoId) {
        $('#tabla-liquidaciones-guardadas').DataTable().clear().draw();
        return;
    }
    const liquidaciones = await window.go.main.App.GetLiquidacionesGuardadas(window.clienteActivoId) || [];
    $('#tabla-liquidaciones-guardadas').DataTable().clear().rows.add(liquidaciones).draw();
}

export async function eliminarLiquidacion(id) {
    if (confirm("¿Está seguro que desea eliminar esta liquidación guardada? Esta acción es permanente.")) {
        try {
            await window.go.main.App.EliminarLiquidacion(id);
            await cargarLiquidacionesGuardadas();
        } catch(err) {
            alert("Error al eliminar la liquidación.");
        }
    }
}