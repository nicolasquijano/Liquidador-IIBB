import { formatearFecha, dataTablesLocale } from '../main.js';

let asignacionDirectaData = []; // Mantenemos los datos de la asignación en memoria

export function inicializarGridVentas() {
    if (!$.fn.DataTable.isDataTable('#tabla-ventas')) {
        $('#tabla-ventas').DataTable({
            columns: [
                { data: 'fecha', render: data => formatearFecha(data) },
                { data: 'tipo_comprobante' },
                { data: null, title: 'Número', render: (d,t,r) => `${String(r.punto_venta).padStart(4, '0')}-${String(r.numero).padStart(8, '0')}` },
                { data: 'importe_total', render: data => data.toFixed(2) },
                {
                    data: 'id', title: 'Acciones', orderable: false, width: '180px', render: (id) =>
                        `<button class="btn btn-sm btn-secondary" onclick="cargarVentaParaEditar(${id})">Editar</button>
                         <button class="btn btn-sm btn-danger" onclick="eliminarVenta(${id})">Borrar</button>`
                }
            ],
            language: dataTablesLocale,
            order: [[0, 'desc']]
        });
    }
    // La grilla de asignación directa no necesita DataTables, la manejaremos manualmente
    renderAsignacionDirecta(); 
}

export function setupModuloVentas() {
    const mesSelect = document.getElementById('ventas-mes');
    mesSelect.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        mesSelect.innerHTML += `<option value="${i}">${i.toString().padStart(2, '0')}</option>`;
    }
    const hoy = new Date();
    document.getElementById('ventas-anio').value = hoy.getFullYear();
    mesSelect.value = hoy.getMonth() + 1;
    document.getElementById('venta-fecha').value = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const actSelect = document.getElementById('venta-actividad');
    actSelect.innerHTML = '';
    window.actividadesGlobal.forEach(act => actSelect.innerHTML += `<option value="${act.id}">${act.codigo_actividad} - ${act.descripcion}</option>`);
    document.getElementById('radio-general').onchange = toggleAsignacionDirecta;
    document.getElementById('radio-directa').onchange = toggleAsignacionDirecta;
    ['venta-gravado', 'venta-no-gravado'].forEach(id => document.getElementById(id).addEventListener('input', actualizarTotalesAsignacion));
}

export function toggleAsignacionDirecta() {
    const panel = document.getElementById('panel-asignacion-directa');
    panel.style.display = document.getElementById('radio-directa').checked ? 'block' : 'none';
    actualizarTotalesAsignacion();
}

export async function cargarVentas() {
    const table = $('#tabla-ventas').DataTable();
    if (!window.clienteActivoId) {
        table.clear().draw();
        return;
    }
    const anio = document.getElementById('ventas-anio').value;
    const mes = document.getElementById('ventas-mes').value;
    const ventas = await window.go.main.App.GetVentasPorPeriodo(window.clienteActivoId, anio, mes);
    table.clear().rows.add(ventas || []).draw();
}

export async function cargarVentaParaEditar(id) {
    limpiarFormularioVenta();
    try {
        const ventaFull = await window.go.main.App.GetVentaDetalle(id);
        const c = ventaFull.comprobante;
        window.ventaActivaId = c.id;
        document.getElementById('venta-form-titulo').textContent = `Editando Comprobante #${c.id}`;
        document.getElementById('venta-fecha').value = formatearFecha(c.fecha);
        document.getElementById('venta-tipo').value = c.tipo_comprobante;
        document.getElementById('venta-pv').value = c.punto_venta;
        document.getElementById('venta-numero').value = c.numero;
        document.getElementById('venta-cuit-cliente').value = c.cuit_cliente;
        document.getElementById('venta-rz-cliente').value = c.razon_social_cliente;
        document.getElementById('venta-actividad').value = c.id_actividad;
        document.getElementById('venta-gravado').value = c.monto_gravado.toFixed(2);
        document.getElementById('venta-no-gravado').value = c.monto_no_gravado.toFixed(2);
        document.getElementById('venta-total').value = c.importe_total.toFixed(2);
        if (c.tipo_asignacion === 'DIRECTA') {
            document.getElementById('radio-directa').checked = true;
            cargarAsignacionDirecta(ventaFull.asignaciones);
        } else {
            document.getElementById('radio-general').checked = true;
        }
        toggleAsignacionDirecta();
    } catch (err) { alert("Error al cargar el detalle de la venta."); }
}

export function limpiarFormularioVenta() {
    window.ventaActivaId = null;
    document.getElementById('form-venta').reset();
    document.getElementById('venta-form-titulo').textContent = "Nuevo Comprobante";
    asignacionDirectaData = [];
    renderAsignacionDirecta();
    document.getElementById('venta-fecha').value = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    toggleAsignacionDirecta();
}

export async function guardarVenta() {
    if (!window.clienteActivoId) { alert("Seleccione un cliente activo."); return; }
    
    if (document.getElementById('radio-directa').checked) {
        const gravado = parseFloat(document.getElementById('venta-gravado').value.replace(',', '.')) || 0;
        const noGravado = parseFloat(document.getElementById('venta-no-gravado').value.replace(',', '.')) || 0;
        const baseAsignar = gravado + noGravado;
        let totalAsignado = asignacionDirectaData.reduce((sum, item) => sum + (parseFloat(item.monto_asignado) || 0), 0);
        
        if (Math.abs(baseAsignar - totalAsignado) > 0.01) {
            alert("Error: La suma de las asignaciones directas no coincide con la base imponible del comprobante.");
            return;
        }
    }

    const [dia, mes, anio] = document.getElementById('venta-fecha').value.split('/');
    const ventaFull = {
        comprobante: {
            id: window.ventaActivaId || 0,
            id_cliente: window.clienteActivoId,
            fecha: `${anio}-${mes.padStart(2,'0')}-${dia.padStart(2,'0')}`,
            tipo_comprobante: document.getElementById('venta-tipo').value,
            punto_venta: parseInt(document.getElementById('venta-pv').value),
            numero: parseInt(document.getElementById('venta-numero').value),
            cuit_cliente: document.getElementById('venta-cuit-cliente').value,
            razon_social_cliente: document.getElementById('venta-rz-cliente').value,
            id_actividad: parseInt(document.getElementById('venta-actividad').value) || null,
            monto_gravado: parseFloat(document.getElementById('venta-gravado').value.replace(',', '.')),
            monto_no_gravado: parseFloat(document.getElementById('venta-no-gravado').value.replace(',', '.')),
            importe_total: parseFloat(document.getElementById('venta-total').value.replace(',', '.')),
            tipo_asignacion: document.querySelector('input[name="tipo-asignacion"]:checked').value,
        },
        asignaciones: asignacionDirectaData
    };

    try {
        await window.go.main.App.GuardarVenta(ventaFull);
        alert("Venta guardada con éxito.");
        limpiarFormularioVenta();
        await cargarVentas();
    } catch (err) { alert("Error al guardar la venta."); console.error(err); }
}

export async function eliminarVenta(id) {
    if (confirm("¿Está seguro que desea eliminar este comprobante?")) {
        try {
            await window.go.main.App.EliminarVenta(id);
            alert("Venta eliminada.");
            await cargarVentas();
        } catch (err) { alert("Error al eliminar la venta."); }
    }
}

// --- Lógica para la tabla de Asignación Directa ---

function renderAsignacionDirecta() {
    const container = document.getElementById('grid-asignacion-directa-wrapper');
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'table table-sm table-bordered';
    table.innerHTML = `
        <thead class="table-light">
            <tr>
                <th>Jurisdicción</th>
                <th>Monto</th>
                <th>Quitar</th>
            </tr>
        </thead>
        <tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    
    asignacionDirectaData.forEach((item, index) => {
        const row = document.createElement('tr');
        const selectHTML = `<select class="form-select form-select-sm asig-jur" data-index="${index}">${window.jurisdiccionesGlobal.map(j => `<option value="${j.id}" ${item.id_jurisdiccion == j.id ? 'selected' : ''}>${j.nombre}</option>`).join('')}</select>`;
        row.innerHTML = `
            <td>${selectHTML}</td>
            <td><input type="number" step="0.01" class="form-control form-control-sm asig-monto" data-index="${index}" value="${parseFloat(item.monto_asignado).toFixed(2)}"></td>
            <td><button type="button" class="btn btn-danger btn-sm" onclick="quitarFilaAsignacion(${index})">X</button></td>
        `;
        tbody.appendChild(row);
    });
    
    container.appendChild(table);
    
    // Añadir eventos a los nuevos inputs/selects
    document.querySelectorAll('.asig-jur').forEach(select => select.onchange = (e) => updateAsignacionData(e.target));
    document.querySelectorAll('.asig-monto').forEach(input => input.oninput = (e) => updateAsignacionData(e.target));

    actualizarTotalesAsignacion();
}

function updateAsignacionData(element) {
    const index = element.dataset.index;
    const rowContainer = element.closest('tr');
    const jurId = rowContainer.querySelector('.asig-jur').value;
    const monto = rowContainer.querySelector('.asig-monto').value;
    
    asignacionDirectaData[index] = {
        id_jurisdiccion: parseInt(jurId),
        monto_asignado: parseFloat(monto) || 0
    };
    actualizarTotalesAsignacion();
}

export function cargarAsignacionDirecta(asignaciones = []) {
    asignacionDirectaData = asignaciones.map(a => ({...a})); // Copia para evitar mutaciones
    renderAsignacionDirecta();
}

export function agregarFilaAsignacion() {
    asignacionDirectaData.push({
        id_jurisdiccion: window.jurisdiccionesGlobal[0].id,
        monto_asignado: 0.0
    });
    renderAsignacionDirecta();
}

export function quitarFilaAsignacion(index) {
    asignacionDirectaData.splice(index, 1);
    renderAsignacionDirecta();
}

export function actualizarTotalesAsignacion() {
    const gravado = parseFloat(document.getElementById('venta-gravado').value.replace(',', '.')) || 0;
    const noGravado = parseFloat(document.getElementById('venta-no-gravado').value.replace(',', '.')) || 0;
    const baseAsignar = gravado + noGravado;
    
    let totalAsignado = asignacionDirectaData.reduce((sum, item) => sum + (parseFloat(item.monto_asignado) || 0), 0);
    
    const diferencia = baseAsignar - totalAsignado;
    document.getElementById('label-base-a-asignar').textContent = baseAsignar.toFixed(2);
    document.getElementById('label-total-asignado').textContent = totalAsignado.toFixed(2);
    document.getElementById('label-diferencia').textContent = diferencia.toFixed(2);
    
    const divDiferencia = document.getElementById('div-diferencia');
    const btnGuardar = document.getElementById('btn-guardar-venta');
    
    if (document.getElementById('radio-directa').checked) {
        if (Math.abs(diferencia) < 0.01) {
            divDiferencia.style.color = 'lightgreen';
            btnGuardar.disabled = false;
        } else {
            divDiferencia.style.color = 'tomato';
            btnGuardar.disabled = true;
        }
    } else {
        btnGuardar.disabled = false;
    }
}