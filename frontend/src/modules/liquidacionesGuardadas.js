import { gridJsLocale } from '../main.js';

export function inicializarGridLiquidacionesGuardadas() {
    if (window.gridLiquidacionesGuardadas) return;
    window.gridLiquidacionesGuardadas = new gridjs.Grid({
        columns: ['Período', 'Tipo', 'Fecha de Creación', { name: 'Acciones', sort: false, width: '120px',
            formatter: (cell, row) => gridjs.html(`<button>Ver</button><button class="btn-danger" onclick="eliminarLiquidacion(${row.cells[3].data})">Borrar</button>`)
        }, {name: 'ID', hidden: true}],
        data: [], pagination: { limit: 10 }, language: gridJsLocale
    }).render(document.getElementById('grid-liquidaciones-guardadas-wrapper'));
}

export async function cargarLiquidacionesGuardadas() {
    if (!window.clienteActivoId) {
        if(window.gridLiquidacionesGuardadas) window.gridLiquidacionesGuardadas.updateConfig({data:[]}).forceRender();
        return;
    }
    const liquidaciones = await window.go.main.App.GetLiquidacionesGuardadas(window.clienteActivoId) || [];
    const data = liquidaciones.map(l => [
        l.periodo,
        l.rectificativa_nro === 0 ? 'Original' : `Rect. N° ${l.rectificativa_nro}`,
        new Date(l.fecha).toLocaleString('es-AR'),
        l.id
    ]);
    if(window.gridLiquidacionesGuardadas) window.gridLiquidacionesGuardadas.updateConfig({data: data}).forceRender();
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