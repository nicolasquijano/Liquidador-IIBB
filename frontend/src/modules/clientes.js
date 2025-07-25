import { formatearFecha, cargarDatosGlobales, gridJsLocale } from '../main.js';

export function inicializarGridClientes() {
    if (window.gridClientes) return;
    window.gridClientes = new gridjs.Grid({
        columns: [ 'Razón Social', 'CUIT', { name: 'Fecha Alta', formatter: (cell) => formatearFecha(cell) }, { name: 'Acciones', sort: false, width: '100px',
            formatter: (cell, row) => gridjs.html(`<button class="btn-danger" onclick="iniciarBorradoCliente(${row.cells[3].data}, '${row.cells[4].data}')">Borrar</button>`)
        }, { name: 'ID', hidden: true }, { name: 'RZ_raw', hidden: true }],
        data: [], search: true, sort: true, pagination: { limit: 10 }, language: gridJsLocale
    }).render(document.getElementById('grid-clientes-wrapper'));
}

export function cargarClientes() {
    if (!window.gridClientes) return;
    const data = window.clientesGlobal.map(c => [c.razon_social, c.cuit, c.fecha_alta, c.id, c.razon_social]);
    window.gridClientes.updateConfig({ data: data }).forceRender();
}

export async function guardarCliente() {
    const razonSocial = document.getElementById('razon-social').value;
    const cuit = document.getElementById('cuit').value;
    const resultadoDiv = document.getElementById('resultado-form');
    try {
        const resultado = await window.go.main.App.GuardarCliente(razonSocial, cuit);
        resultadoDiv.innerText = resultado;
        resultadoDiv.style.color = 'lightgreen';
        document.getElementById('razon-social').value = '';
        document.getElementById('cuit').value = '';
        await cargarDatosGlobales();
    } catch(err) {
        resultadoDiv.innerText = `Error: ${err}`;
        resultadoDiv.style.color = 'tomato';
    }
}

export async function iniciarBorradoCliente(clienteId, razonSocial) {
    if (confirm(`Está a punto de eliminar al cliente: "${razonSocial}".\n\n¿Desea continuar?`)) {
        if (confirm(`¡ADVERTENCIA FINAL!\n\nEsta acción es permanente y no se puede deshacer.\n\n¿Está absolutamente seguro?`)) {
            try {
                await window.go.main.App.BorrarCliente(clienteId);
                await cargarDatosGlobales();
            } catch (err) { alert(`Ocurrió un error: ${err}`); }
        }
    }
}