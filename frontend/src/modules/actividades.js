import { cargarDatosGlobales, dataTablesLocale } from '../main.js';

export function inicializarGridAlicuotas() {
    if ($.fn.DataTable.isDataTable('#tabla-alicuotas')) return;
    $('#tabla-alicuotas').DataTable({
        columns: [
            { data: 'nombre', title: 'Jurisdicción' },
            {
                data: 'alicuota', title: 'Alícuota (%)', orderable: false,
                render: (data, type, row) => `<input type="number" class="form-control form-control-sm alicuota-input" value="${data}" data-jurid="${row.id}" step="0.01">`
            }
        ],
        paging: false, info: false, searching: false, ordering: true,
        language: dataTablesLocale
    });
}

export function poblarListaActividades() {
    const lista = document.getElementById('lista-actividades');
    if(!lista) return;
    lista.innerHTML = '';
    if (!window.actividadesGlobal || !window.actividadesGlobal.forEach) { return; }
    window.actividadesGlobal.forEach(act => {
        const item = document.createElement('li');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';
        item.innerHTML = `<span class="item-text">${act.codigo_actividad} - ${act.descripcion}</span>
                          <div class="item-actions">
                              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); modificarActividad(${act.id}, '${act.codigo_actividad}', '${act.descripcion}')">Editar</button>
                              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); eliminarActividad(${act.id}, '${act.codigo_actividad}')">Borrar</button>
                          </div>`;
        item.dataset.id = act.id;
        item.onclick = () => seleccionarActividad(item);
        lista.appendChild(item);
    });
}

export async function crearActividad() {
    const codigo = document.getElementById('nueva-actividad-codigo').value;
    const desc = document.getElementById('nueva-actividad-desc').value;
    if (!codigo || !desc) { alert("El código y la descripción son obligatorios."); return; }
    if (!/^[0-9-]+$/.test(codigo)) {
        alert("El código de actividad solo puede contener números y guiones.");
        return;
    }
    if (desc.length < 5) {
        alert("La descripción debe tener al menos 5 caracteres.");
        return;
    }
    try {
        await window.go.main.App.CrearActividad(codigo, desc);
        document.getElementById('nueva-actividad-codigo').value = '';
        document.getElementById('nueva-actividad-desc').value = '';
        await cargarDatosGlobales();
    } catch (err) { alert("Error al crear la actividad. El código podría ya existir."); }
}

export async function modificarActividad(id, codigoActual, descActual) {
    const nuevoCodigo = prompt("Ingrese el nuevo código:", codigoActual);
    if (nuevoCodigo === null || nuevoCodigo.trim() === '') return;
    const nuevaDesc = prompt("Ingrese la nueva descripción:", descActual);
    if (nuevaDesc === null || nuevaDesc.trim() === '') return;
    try {
        await window.go.main.App.ModificarActividad(id, nuevoCodigo, nuevaDesc);
        await cargarDatosGlobales();
    } catch (err) { alert(`Error: ${err}`); }
}

export async function eliminarActividad(id, codigo) {
    if (confirm(`¿Seguro que desea eliminar la actividad ${codigo}?`)) {
        try {
            await window.go.main.App.EliminarActividad(id);
            await cargarDatosGlobales();
            // Limpiar la selección y la tabla de alícuotas
            document.getElementById('actividad-seleccionada-nombre').textContent = '...';
            $('#tabla-alicuotas').DataTable().clear().draw();
        } catch (err) { alert(`Error: ${err}`); }
    }
}

export function seleccionarActividad(listItem) {
    document.querySelectorAll('#lista-actividades li').forEach(li => li.classList.remove('active'));
    listItem.classList.add('active');
    window.actividadActivaId = parseInt(listItem.dataset.id);
    document.getElementById('actividad-seleccionada-nombre').textContent = listItem.querySelector('.item-text').textContent;
    cargarAlicuotas();
}

export async function cargarAlicuotas() {
    const table = $('#tabla-alicuotas').DataTable();
    let data = [];
    if(window.clienteActivoId && window.actividadActivaId) {
        const alicuotasGuardadas = await window.go.main.App.GetAlicuotas(window.clienteActivoId, window.actividadActivaId);
        data = window.jurisdiccionesGlobal.map(jur => ({
            id: jur.id,
            nombre: jur.nombre,
            alicuota: alicuotasGuardadas[jur.id] || 0.0
        }));
    }
    table.clear().rows.add(data).draw();
}

export async function guardarAlicuotas() {
    if (!window.clienteActivoId || !window.actividadActivaId) { alert("Seleccione un cliente y una actividad."); return; }
    const alicuotasParaGuardar = {};
    $('#tabla-alicuotas .alicuota-input').each(function() {
        const jurid = $(this).data('jurid');
        const valor = parseFloat($(this).val().replace(',', '.')) || 0;
        alicuotasParaGuardar[jurid] = valor;
    });

    try {
        await window.go.main.App.GuardarAlicuotas(window.clienteActivoId, window.actividadActivaId, alicuotasParaGuardar);
        alert("Alícuotas guardadas con éxito.");
    } catch (err) { alert("Error al guardar las alícuotas."); }
}