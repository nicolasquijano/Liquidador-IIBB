import { formatearFecha, cargarDatosGlobales, dataTablesLocale } from '../main.js';

export function inicializarGridClientes() {
    if ($.fn.DataTable.isDataTable('#tabla-clientes')) return;
    $('#tabla-clientes').DataTable({
        columns: [
            { data: 'razon_social', title: 'Razón Social' },
            { data: 'cuit', title: 'CUIT' },
            { data: 'fecha_alta', title: 'Fecha Alta', render: data => formatearFecha(data) },
            {
                data: 'id',
                title: 'Acciones',
                orderable: false,
                width: '100px',
                render: (data, type, row) => `<button class="btn btn-danger btn-sm" onclick="iniciarBorradoCliente(${row.id}, '${row.razon_social}')">Borrar</button>`
            }
        ],
        language: dataTablesLocale
    });
}

export function cargarClientes() {
    if ($.fn.DataTable.isDataTable('#tabla-clientes')) {
        const table = $('#tabla-clientes').DataTable();
        table.clear().rows.add(window.clientesGlobal || []).draw();
    }
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