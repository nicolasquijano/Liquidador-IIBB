import { dataTablesLocale } from '../main.js';

let coeficientesAnioActivo = new Date().getFullYear();
let coeficientesPeriodoActivo = null;

export function inicializarGridCoeficientes() {
    // Inicializa la tabla de resumen si no existe
    if (!$.fn.DataTable.isDataTable('#tabla-coeficientes-resumen')) {
        $('#tabla-coeficientes-resumen').DataTable({
            columns: [
                { 
                    data: null,
                    title: 'Período',
                    render: (data, type, row) => `${String(row.mes_desde).padStart(2, '0')} - ${String(row.mes_hasta).padStart(2, '0')}`
                },
                { data: 'suma', title: 'Suma Coeficientes', render: data => data.toFixed(4) },
                {
                    data: null,
                    title: 'Acciones',
                    orderable: false,
                    width: '250px',
                    render: (data, type, row) => {
                        return `<button class="btn btn-sm btn-info" onclick="cargarDetalleCoeficientes(${row.mes_desde}, ${row.mes_hasta})">Editar</button>
                                <button class="btn btn-sm btn-secondary" onclick="modificarPeriodoCoeficientes(${row.mes_desde}, ${row.mes_hasta})">Modificar</button>
                                <button class="btn btn-sm btn-danger" onclick="eliminarPeriodoCoeficientes(${row.mes_desde})">Borrar</button>`;
                    }
                }
            ],
            language: dataTablesLocale,
            paging: false,
            info: false,
            searching: false
        });
    }

    // Inicializa la tabla de detalle si no existe
    if (!$.fn.DataTable.isDataTable('#tabla-coeficientes-detalle')) {
        $('#tabla-coeficientes-detalle').DataTable({
            columns: [
                { data: 'nombre', title: 'Jurisdicción' },
                {
                    data: 'coeficiente',
                    title: 'Coeficiente',
                    orderable: false,
                    render: (data, type, row) => {
                        return `<input type="number" class="form-control form-control-sm coef-input" value="${data.toFixed(4)}" data-jurid="${row.id}" step="0.0001">`;
                    }
                }
            ],
            paging: false,
            info: false,
            searching: false,
            ordering: true,
            language: dataTablesLocale
        });
    }

    document.getElementById('coef-anio-fiscal').value = coeficientesAnioActivo;
    document.getElementById('coef-anio-fiscal').addEventListener('change', (e) => {
        coeficientesAnioActivo = parseInt(e.target.value);
        cargarResumenCoeficientes();
    });
}

export async function cargarResumenCoeficientes() {
    const table = $('#tabla-coeficientes-resumen').DataTable();
    const anio = document.getElementById('coef-anio-fiscal').value || new Date().getFullYear();
    coeficientesAnioActivo = anio;
    
    let data = [];
    if (window.clienteActivoId) {
        data = await window.go.main.App.GetCoeficientesResumen(window.clienteActivoId, anio) || [];
    }
    
    table.clear().rows.add(data).draw();
    // Limpia la tabla de detalle al cargar un nuevo resumen
    $('#tabla-coeficientes-detalle').DataTable().clear().draw();
    document.getElementById('btn-guardar-coeficientes').style.display = 'none';
    document.getElementById('coef-detalle-titulo').textContent = 'Detalle de Coeficientes';
}

export async function cargarDetalleCoeficientes(mesDesde, mesHasta) {
    if (!window.clienteActivoId) return;
    
    coeficientesPeriodoActivo = { mes_desde: mesDesde, mes_hasta: mesHasta };
    document.getElementById('coef-detalle-titulo').textContent = `Detalle Período: ${mesDesde}-${mesHasta}/${coeficientesAnioActivo}`;
    
    try {
        const detalle = await window.go.main.App.GetCoeficientesDetalle(window.clienteActivoId, coeficientesAnioActivo, mesDesde);
        const data = window.jurisdiccionesGlobal.map(jur => ({
            id: jur.id,
            nombre: jur.nombre,
            coeficiente: detalle[jur.id] || 0.0
        }));
        
        $('#tabla-coeficientes-detalle').DataTable().clear().rows.add(data).draw();
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
    if (confirm(`¿Está seguro que desea eliminar el período que comienza en el mes ${mesDesde} del año ${coeficientesAnioActivo}?`)) {
        try {
            await window.go.main.App.EliminarPeriodoCoeficientes(window.clienteActivoId, coeficientesAnioActivo, mesDesde);
            await cargarResumenCoeficientes(); // Esto recargará el resumen y limpiará el detalle
        } catch(err) { alert("Error al eliminar el período."); }
    }
}

export async function guardarCoeficientes() {
    if (!coeficientesPeriodoActivo || !window.clienteActivoId) { alert("No hay ningún período activo para guardar."); return; }
    const coeficientes = {};
    let suma = 0.0;
    
    $('#tabla-coeficientes-detalle .coef-input').each(function() {
        const valor = parseFloat($(this).val().replace(',', '.')) || 0.0;
        coeficientes[$(this).data('jurid')] = valor;
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