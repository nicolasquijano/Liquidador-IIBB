import { gridJsLocale } from '../main.js';

let coeficientesAnioActivo = new Date().getFullYear();
let coeficientesPeriodoActivo = null;

export function inicializarGridCoeficientes() {
    if (window.gridCoefResumen) return;
    window.gridCoefResumen = new gridjs.Grid({
        columns: [
            { name: 'Período', formatter: (cell, row) => `${row.cells[2].data} - ${row.cells[3].data}` },
            { name: 'Suma', formatter: cell => cell.toFixed(4) },
            { name: 'Acciones', sort: false, width: '250px', formatter: (cell, row) => gridjs.html(`<button onclick="cargarDetalleCoeficientes(${row.cells[2].data}, ${row.cells[3].data})">Editar</button><button onclick="modificarPeriodoCoeficientes(${row.cells[2].data}, ${row.cells[3].data})">Modificar</button><button class="btn-danger" onclick="eliminarPeriodoCoeficientes(${row.cells[2].data})">Borrar</button>`) },
            { name: 'mes_desde', hidden: true }, { name: 'mes_hasta', hidden: true }
        ],
        data: [], language: gridJsLocale
    }).render(document.getElementById('grid-coeficientes-resumen-wrapper'));

    if (window.gridCoefDetalle) return;
    window.gridCoefDetalle = new gridjs.Grid({
        columns: ['Jurisdicción', { name: 'Coeficiente', formatter: (cell, row) => gridjs.html(`<input type="number" class="coef-input" value="${cell}" data-jurid="${row.cells[2].data}" step="0.0001">`) }, { name: 'ID', hidden: true }],
        data: [], sort: true
    }).render(document.getElementById('grid-coeficientes-detalle-wrapper'));
}

document.getElementById('coef-anio-fiscal').addEventListener('change', (e) => {
    coeficientesAnioActivo = parseInt(e.target.value);
    cargarResumenCoeficientes();
});

export async function cargarResumenCoeficientes() {
    if(!window.gridCoefResumen) return;
    const anio = document.getElementById('coef-anio-fiscal').value || new Date().getFullYear();
    coeficientesAnioActivo = anio;
    const data = !window.clienteActivoId ? [] : (await window.go.main.App.GetCoeficientesResumen(window.clienteActivoId, anio)).map(r => [null, r.suma, r.mes_desde, r.mes_hasta]);
    window.gridCoefResumen.updateConfig({ data: data }).forceRender();
}

export async function cargarDetalleCoeficientes(mesDesde, mesHasta) {
    if(!window.gridCoefDetalle) return;
    coeficientesPeriodoActivo = { mes_desde: mesDesde, mes_hasta: mesHasta };
    document.getElementById('coef-detalle-titulo').textContent = `Detalle Período: ${mesDesde}-${mesHasta}/${coeficientesAnioActivo}`;
    try {
        const detalle = await window.go.main.App.GetCoeficientesDetalle(window.clienteActivoId, coeficientesAnioActivo, mesDesde);
        const data = window.jurisdiccionesGlobal.map(jur => [jur.nombre, detalle[jur.id] || 0.0, jur.id]);
        window.gridCoefDetalle.updateConfig({ data: data }).forceRender();
        document.getElementById('btn-guardar-coeficientes').style.display = 'inline-block';
    } catch (err) { console.error("Error cargando detalle de coeficientes:", err); }
}

export function nuevoPeriodoCoeficientes() {
    if (!window.clienteActivoId) { alert("Primero seleccione un cliente activo."); return; }
    const mesDesde = parseInt(prompt("Ingrese el mes de INICIO del nuevo período (1-12):"));
    if (isNaN(mesDesde) || mesDesde < 1 || mesDesde > 12) return;
    const mesHasta = parseInt(prompt(`Ingrese el mes de FIN del nuevo período (de ${mesDesde} a 12):`, 12));
    if (isNaN(mesHasta) || mesHasta < mesDesde || mesHasta > 12) return;
    cargarDetalleCoeficientes(mesDesde, mesHasta);
}

export async function eliminarPeriodoCoeficientes(mesDesde) {
    if (!window.clienteActivoId) { alert("Primero seleccione un cliente activo."); return; }
    if (confirm(`¿Está seguro que desea eliminar el período de coeficientes que comienza en el mes ${mesDesde} del año ${coeficientesAnioActivo}?`)) {
        try {
            await window.go.main.App.EliminarPeriodoCoeficientes(window.clienteActivoId, coeficientesAnioActivo, mesDesde);
            await cargarResumenCoeficientes();
            if(window.gridCoefDetalle) window.gridCoefDetalle.updateConfig({data:[]}).forceRender();
            document.getElementById('btn-guardar-coeficientes').style.display = 'none';
        } catch(err) { alert("Error al eliminar el período."); }
    }
}

export async function guardarCoeficientes() {
    if (!coeficientesPeriodoActivo || !window.clienteActivoId) { alert("No hay ningún período activo."); return; }
    const coeficientes = {};
    let suma = 0.0;
    document.querySelectorAll('#grid-coeficientes-detalle-wrapper .coef-input').forEach(input => {
        const valor = parseFloat(input.value.replace(',', '.')) || 0.0;
        coeficientes[input.dataset.jurid] = valor;
        suma += valor;
    });
    if (Math.abs(1.0 - suma) > 0.0001 && suma !== 0.0) {
        if (!confirm(`La suma de los coeficientes es ${suma.toFixed(4)}, pero debería ser 1.0000.\n\n¿Desea guardarlos de todas formas?`)) return;
    }
    try {
        await window.go.main.App.GuardarCoeficientes(window.clienteActivoId, coeficientesAnioActivo, coeficientesPeriodoActivo.mes_desde, coeficientesPeriodoActivo.mes_hasta, coeficientes);
        alert("Coeficientes guardados con éxito.");
        await cargarResumenCoeficientes();
    } catch(err) { alert("Error al guardar los coeficientes."); }
}

export async function modificarPeriodoCoeficientes(mesDesdeActual, mesHastaActual) {
    if (!window.clienteActivoId) { alert("Primero seleccione un cliente activo."); return; }
    const mesDesdeNuevoStr = prompt("NUEVO mes de INICIO:", mesDesdeActual);
    if (mesDesdeNuevoStr === null) return;
    const mesDesdeNuevo = parseInt(mesDesdeNuevoStr);
    if (isNaN(mesDesdeNuevo) || mesDesdeNuevo < 1 || mesDesdeNuevo > 12) { alert("Mes de inicio inválido."); return; }
    const mesHastaNuevoStr = prompt(`NUEVO mes de FIN (de ${mesDesdeNuevo} a 12):`, mesHastaActual);
    if (mesHastaNuevoStr === null) return;
    const mesHastaNuevo = parseInt(mesHastaNuevoStr);
    if (isNaN(mesHastaNuevo) || mesHastaNuevo < mesDesdeNuevo || mesHastaNuevo > 12) { alert("Mes de fin inválido."); return; }
    try {
        await window.go.main.App.ModificarPeriodoCoeficientes(window.clienteActivoId, coeficientesAnioActivo, mesDesdeActual, mesDesdeNuevo, mesHastaNuevo);
        await cargarResumenCoeficientes();
    } catch(err) { alert(`Error: ${err}`); }
}