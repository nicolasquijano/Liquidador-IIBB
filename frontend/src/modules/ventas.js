import { formatearFecha, gridJsLocale } from '../main.js';

export function inicializarGridVentas() {
    if (window.gridVentas) return;
    window.gridVentas = new gridjs.Grid({
        columns: ['Fecha', 'Tipo', 'Número', 'Total', { name: 'Acciones', sort: false, width: '180px', formatter: (cell, row) => gridjs.html(`<button onclick="cargarVentaParaEditar(${row.cells[4].data})">Editar</button><button class="btn-danger" onclick="eliminarVenta(${row.cells[4].data})">Borrar</button>`) }, { name: 'ID', hidden: true }],
        data: [], search: true, sort: true, pagination: { limit: 10 }, language: gridJsLocale
    }).render(document.getElementById('grid-ventas-wrapper'));

    if (window.gridAsignacionDirecta) return;
    let selectHTML = '<select class="asig-jur">';
    window.jurisdiccionesGlobal.forEach(j => selectHTML += `<option value="${j.id}">${j.nombre}</option>`);
    selectHTML += '</select>';
    window.gridAsignacionDirecta = new gridjs.Grid({
        columns: [
            { name: 'Jurisdicción', width: '200px', formatter: (cell) => gridjs.html(selectHTML.replace(`value="${cell}"`, `value="${cell}" selected`)) },
            { name: 'Monto', formatter: (cell, row) => gridjs.html(`<input type="number" step="0.01" class="asig-monto" value="${parseFloat(cell).toFixed(2)}" oninput="actualizarTotalesAsignacion()">`) },
            { name: 'Quitar', sort: false, width: '80px', formatter: (cell, row) => gridjs.html(`<button type="button" class="btn-danger" onclick="quitarFilaAsignacion(${row.cells[2].data})">X</button>`) }
        ], data: []
    }).render(document.getElementById('grid-asignacion-directa-wrapper'));
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
    if(!window.gridVentas) return;
    let data = [];
    if (window.clienteActivoId) {
        const anio = document.getElementById('ventas-anio').value;
        const mes = document.getElementById('ventas-mes').value;
        const ventas = await window.go.main.App.GetVentasPorPeriodo(window.clienteActivoId, anio, mes);
        data = (ventas || []).map(v => [formatearFecha(v.fecha), v.tipo_comprobante, `${v.punto_venta.toString().padStart(4,'0')}-${v.numero.toString().padStart(8,'0')}`, v.importe_total.toFixed(2), v.id]);
    }
    window.gridVentas.updateConfig({ data: data }).forceRender();
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
    if (window.gridAsignacionDirecta) window.gridAsignacionDirecta.updateConfig({data:[]}).forceRender();
    document.getElementById('venta-fecha').value = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    toggleAsignacionDirecta();
}

export async function guardarVenta() {
    if (!window.clienteActivoId) { alert("Seleccione un cliente activo."); return; }
    
    if (document.getElementById('radio-directa').checked) {
        const gravado = parseFloat(document.getElementById('venta-gravado').value.replace(',', '.')) || 0;
        const noGravado = parseFloat(document.getElementById('venta-no-gravado').value.replace(',', '.')) || 0;
        const baseAsignar = gravado + noGravado;
        let totalAsignado = 0;
        document.querySelectorAll('#grid-asignacion-directa-wrapper input.asig-monto').forEach(input => {
            totalAsignado += parseFloat(input.value.replace(',', '.')) || 0;
        });
        if (Math.abs(baseAsignar - totalAsignado) > 0.01) {
            alert("Error: La suma de las asignaciones directas no coincide con la base imponible del comprobante. Por favor, corrija los montos.");
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
        asignaciones: []
    };
    if (ventaFull.comprobante.tipo_asignacion === 'DIRECTA') {
        const inputs = document.querySelectorAll('#grid-asignacion-directa-wrapper input.asig-monto');
        const selects = document.querySelectorAll('#grid-asignacion-directa-wrapper select.asig-jur');
        for(let i=0; i < inputs.length; i++) {
            ventaFull.asignaciones.push({
                id_jurisdiccion: parseInt(selects[i].value),
                monto_asignado: parseFloat(inputs[i].value.replace(',', '.'))
            });
        }
    }
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

export function cargarAsignacionDirecta(asignaciones = []) {
    if(!window.gridAsignacionDirecta) return;
    const data = asignaciones.map((asig, index) => [asig.id_jurisdiccion, asig.monto_asignado, index]);
    window.gridAsignacionDirecta.updateConfig({ data: data }).forceRender().then(() => {
        document.querySelectorAll('#grid-asignacion-directa-wrapper .asig-monto').forEach(input => input.addEventListener('input', actualizarTotalesAsignacion));
    });
    setTimeout(actualizarTotalesAsignacion, 100);
}

export function agregarFilaAsignacion() {
    const currentData = window.gridAsignacionDirecta.config.store.data.map(row => row.cells.map(cell => cell.data));
    currentData.push([window.jurisdiccionesGlobal[0].id, 0.0, Date.now()]);
    window.gridAsignacionDirecta.updateConfig({data: currentData}).forceRender().then(() => {
        document.querySelectorAll('#grid-asignacion-directa-wrapper .asig-monto').forEach(input => input.addEventListener('input', actualizarTotalesAsignacion));
    });
}

export function quitarFilaAsignacion(rowIndex) {
    const data = [];
    const inputs = document.querySelectorAll('#grid-asignacion-directa-wrapper input.asig-monto');
    const selects = document.querySelectorAll('#grid-asignacion-directa-wrapper select.asig-jur');
    for(let i=0; i < inputs.length; i++) {
        if (i !== rowIndex) {
             data.push([parseInt(selects[i].value), parseFloat(inputs[i].value), data.length]);
        }
    }
    window.gridAsignacionDirecta.updateConfig({data: data}).forceRender().then(() => {
        document.querySelectorAll('#grid-asignacion-directa-wrapper .asig-monto').forEach(input => input.addEventListener('input', actualizarTotalesAsignacion));
    });
    setTimeout(actualizarTotalesAsignacion, 100);
}

export function actualizarTotalesAsignacion() {
    const gravado = parseFloat(document.getElementById('venta-gravado').value.replace(',', '.')) || 0;
    const noGravado = parseFloat(document.getElementById('venta-no-gravado').value.replace(',', '.')) || 0;
    const baseAsignar = gravado + noGravado;
    let totalAsignado = 0;
    document.querySelectorAll('#grid-asignacion-directa-wrapper input.asig-monto').forEach(input => {
        totalAsignado += parseFloat(input.value.replace(',', '.')) || 0;
    });
    const diferencia = baseAsignar - totalAsignado;
    document.getElementById('label-base-a-asignar').textContent = baseAsignar.toFixed(2);
    document.getElementById('label-total-asignado').textContent = totalAsignado.toFixed(2);
    document.getElementById('label-diferencia').textContent = diferencia.toFixed(2);
    const divDiferencia = document.getElementById('div-diferencia');
    if (Math.abs(diferencia) < 0.01) {
        divDiferencia.style.color = 'lightgreen';
        document.getElementById('btn-guardar-venta').disabled = false;
    } else {
        divDiferencia.style.color = 'tomato';
        if (document.getElementById('radio-directa').checked) {
            document.getElementById('btn-guardar-venta').disabled = true;
        } else {
            document.getElementById('btn-guardar-venta').disabled = false;
        }
    }
}