import { formatearFecha, gridJsLocale } from '../main.js';

let retencionActivaId = null, percepcionActivaId = null, saldoActivoId = null;

export function inicializarGridCreditos() {
    if (window.gridRetenciones) return;
    window.gridRetenciones = new gridjs.Grid({
        columns: ['Fecha', 'Jurisdicción', 'CUIT Agente', 'Nro Comp.', 'Monto', { name: 'Acciones', sort: false, width: '120px', formatter: (cell, row) => gridjs.html(`<button onclick="cargarRetencionParaEditar(${row.cells[6].data})">Editar</button><button class="btn-danger" onclick="eliminarRetencion(${row.cells[6].data})">Borrar</button>`) }, { name: 'ID', hidden: true }],
        data: [], search: true, sort: true, pagination: { limit: 5 }, language: gridJsLocale
    }).render(document.getElementById('grid-retenciones-wrapper'));

    if (window.gridPercepciones) return;
    window.gridPercepciones = new gridjs.Grid({
        columns: ['Fecha', 'Jurisdicción', 'CUIT Agente', 'Nro Factura', 'Monto', { name: 'Acciones', sort: false, width: '120px', formatter: (cell, row) => gridjs.html(`<button onclick="cargarPercepcionParaEditar(${row.cells[5].data})">Editar</button><button class="btn-danger" onclick="eliminarPercepcion(${row.cells[5].data})">Borrar</button>`) }, { name: 'ID', hidden: true }],
        data: [], search: true, sort: true, pagination: { limit: 5 }, language: gridJsLocale
    }).render(document.getElementById('grid-percepciones-wrapper'));

    if (window.gridSaldos) return;
    window.gridSaldos = new gridjs.Grid({
        columns: ['Período', 'Jurisdicción', 'Monto', { name: 'Acciones', sort: false, width: '120px', formatter: (cell, row) => gridjs.html(`<button onclick="cargarSaldoParaEditar(${row.cells[3].data})">Editar</button><button class="btn-danger" onclick="eliminarSaldoAFavor(${row.cells[3].data})">Borrar</button>`) }, { name: 'ID', hidden: true }],
        data: [], search: true, sort: true, pagination: { limit: 5 }, language: gridJsLocale
    }).render(document.getElementById('grid-saldos-wrapper'));
}

export function setupModuloCreditos() {
    const hoy = new Date();
    document.getElementById('ret-fecha').value = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    document.getElementById('per-fecha').value = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    document.getElementById('sal-periodo').value = `${mesAnterior.getFullYear()}-${(mesAnterior.getMonth() + 1).toString().padStart(2, '0')}`;

    ['ret-jur', 'per-jur', 'sal-jur'].forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = '';
        window.jurisdiccionesGlobal.forEach(j => select.innerHTML += `<option value="${j.id}">${j.nombre}</option>`);
    });
}

export function showTab(tabName) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.tab-link[onclick="showTab('${tabName}')"]`).classList.add('active');
}

export async function cargarTodosLosCreditos() {
    if (!window.clienteActivoId) {
        if(window.gridRetenciones) window.gridRetenciones.updateConfig({ data: [] }).forceRender();
        if(window.gridPercepciones) window.gridPercepciones.updateConfig({ data: [] }).forceRender();
        if(window.gridSaldos) window.gridSaldos.updateConfig({ data: [] }).forceRender();
        return;
    }
    await Promise.all([
        cargarRetenciones(),
        cargarPercepciones(),
        cargarSaldosAFavor()
    ]);
}

// --- Retenciones ---
export async function cargarRetenciones() {
    const retenciones = await window.go.main.App.GetRetenciones(window.clienteActivoId) || [];
    const data = retenciones.map(r => [formatearFecha(r.fecha), window.jurisdiccionesGlobal.find(j => j.id === r.id_jurisdiccion)?.nombre, r.cuit_agente_retencion, r.nro_comprobante_retencion, r.monto.toFixed(2), r.id]);
    if(window.gridRetenciones) window.gridRetenciones.updateConfig({ data: data }).forceRender();
}

export function limpiarFormularioRetencion() {
    retencionActivaId = null;
    document.getElementById('form-retencion').reset();
    document.getElementById('retencion-form-titulo').textContent = "Nueva Retención";
    document.getElementById('ret-fecha').value = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function guardarRetencion() {
    if (!window.clienteActivoId) { alert("Seleccione un cliente activo."); return; }
    const [dia, mes, anio] = document.getElementById('ret-fecha').value.split('/');
    const retencion = {
        id: retencionActivaId || 0,
        id_cliente: window.clienteActivoId,
        fecha: `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`,
        id_jurisdiccion: parseInt(document.getElementById('ret-jur').value),
        cuit_agente_retencion: document.getElementById('ret-cuit').value,
        nro_comprobante_retencion: document.getElementById('ret-nro').value,
        monto: parseFloat(document.getElementById('ret-monto').value.replace(',', '.'))
    };
    try {
        await window.go.main.App.GuardarRetencion(retencion);
        limpiarFormularioRetencion();
        await cargarRetenciones();
    } catch (err) { alert(`Error al guardar: ${err}`); }
}

export async function eliminarRetencion(id) {
    if (confirm("¿Seguro que desea eliminar esta retención?")) {
        try {
            await window.go.main.App.EliminarRetencion(id);
            await cargarRetenciones();
        } catch (err) { alert(`Error al eliminar: ${err}`); }
    }
}

export async function cargarRetencionParaEditar(id) {
    const retenciones = await window.go.main.App.GetRetenciones(window.clienteActivoId) || [];
    const retencion = retenciones.find(r => r.id === id);
    if (retencion) {
        retencionActivaId = id;
        document.getElementById('retencion-form-titulo').textContent = `Editando Retención #${id}`;
        document.getElementById('ret-fecha').value = formatearFecha(retencion.fecha);
        document.getElementById('ret-jur').value = retencion.id_jurisdiccion;
        document.getElementById('ret-cuit').value = retencion.cuit_agente_retencion;
        document.getElementById('ret-nro').value = retencion.nro_comprobante_retencion;
        document.getElementById('ret-monto').value = retencion.monto.toFixed(2);
    }
}

// --- Percepciones ---
export async function cargarPercepciones() {
    const percepciones = await window.go.main.App.GetPercepciones(window.clienteActivoId) || [];
    const data = percepciones.map(p => [formatearFecha(p.fecha), window.jurisdiccionesGlobal.find(j => j.id === p.id_jurisdiccion)?.nombre, p.cuit_agente_percepcion, p.nro_factura_compra, p.monto.toFixed(2), p.id]);
    if(window.gridPercepciones) window.gridPercepciones.updateConfig({ data: data }).forceRender();
}

export function limpiarFormularioPercepcion() {
    percepcionActivaId = null;
    document.getElementById('form-percepcion').reset();
    document.getElementById('percepcion-form-titulo').textContent = "Nueva Percepción";
    document.getElementById('per-fecha').value = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function guardarPercepcion() {
    if (!window.clienteActivoId) { alert("Seleccione un cliente activo."); return; }
    const [dia, mes, anio] = document.getElementById('per-fecha').value.split('/');
    const percepcion = {
        id: percepcionActivaId || 0,
        id_cliente: window.clienteActivoId,
        fecha: `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`,
        id_jurisdiccion: parseInt(document.getElementById('per-jur').value),
        cuit_agente_percepcion: document.getElementById('per-cuit').value,
        nro_factura_compra: document.getElementById('per-nro').value,
        monto: parseFloat(document.getElementById('per-monto').value.replace(',', '.'))
    };
    try {
        await window.go.main.App.GuardarPercepcion(percepcion);
        limpiarFormularioPercepcion();
        await cargarPercepciones();
    } catch (err) { alert(`Error al guardar: ${err}`); }
}

export async function eliminarPercepcion(id) {
    if (confirm("¿Seguro que desea eliminar esta percepción?")) {
        try {
            await window.go.main.App.EliminarPercepcion(id);
            await cargarPercepciones();
        } catch (err) { alert(`Error al eliminar: ${err}`); }
    }
}
export async function cargarPercepcionParaEditar(id) {
    const percepciones = await window.go.main.App.GetPercepciones(window.clienteActivoId) || [];
    const percepcion = percepciones.find(p => p.id === id);
    if(percepcion) {
        percepcionActivaId = id;
        document.getElementById('percepcion-form-titulo').textContent = `Editando Percepción #${id}`;
        document.getElementById('per-fecha').value = formatearFecha(percepcion.fecha);
        document.getElementById('per-jur').value = percepcion.id_jurisdiccion;
        document.getElementById('per-cuit').value = percepcion.cuit_agente_percepcion;
        document.getElementById('per-nro').value = percepcion.nro_factura_compra;
        document.getElementById('per-monto').value = percepcion.monto.toFixed(2);
    }
}


// --- Saldos a Favor ---
export async function cargarSaldosAFavor() {
    const saldos = await window.go.main.App.GetSaldosAFavor(window.clienteActivoId) || [];
    const data = saldos.map(s => [s.periodo, window.jurisdiccionesGlobal.find(j => j.id === s.id_jurisdiccion)?.nombre, s.monto.toFixed(2), s.id]);
    if(window.gridSaldos) window.gridSaldos.updateConfig({ data: data }).forceRender();
}

export function limpiarFormularioSaldo() {
    saldoActivoId = null;
    document.getElementById('form-saldo').reset();
    document.getElementById('saldo-form-titulo').textContent = "Nuevo Saldo a Favor";
    const hoy = new Date();
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    document.getElementById('sal-periodo').value = `${mesAnterior.getFullYear()}-${(mesAnterior.getMonth() + 1).toString().padStart(2, '0')}`;
}

export async function guardarSaldoAFavor() {
    if (!window.clienteActivoId) { alert("Seleccione un cliente activo."); return; }
    const saldo = {
        id: saldoActivoId || 0,
        id_cliente: window.clienteActivoId,
        periodo: document.getElementById('sal-periodo').value,
        id_jurisdiccion: parseInt(document.getElementById('sal-jur').value),
        monto: parseFloat(document.getElementById('sal-monto').value.replace(',', '.'))
    };
    try {
        await window.go.main.App.GuardarSaldoAFavor(saldo);
        limpiarFormularioSaldo();
        await cargarSaldosAFavor();
    } catch (err) { alert(`Error al guardar: ${err}`); }
}

export async function eliminarSaldoAFavor(id) {
    if (confirm("¿Seguro que desea eliminar este saldo a favor?")) {
        try {
            await window.go.main.App.EliminarSaldoAFavor(id);
            await cargarSaldosAFavor();
        } catch (err) { alert(`Error al eliminar: ${err}`); }
    }
}
export async function cargarSaldoParaEditar(id) {
    const saldos = await window.go.main.App.GetSaldosAFavor(window.clienteActivoId) || [];
    const saldo = saldos.find(s => s.id === id);
    if(saldo) {
        saldoActivoId = id;
        document.getElementById('saldo-form-titulo').textContent = `Editando Saldo #${id}`;
        document.getElementById('sal-periodo').value = saldo.periodo;
        document.getElementById('sal-jur').value = saldo.id_jurisdiccion;
        document.getElementById('sal-monto').value = saldo.monto.toFixed(2);
    }
}