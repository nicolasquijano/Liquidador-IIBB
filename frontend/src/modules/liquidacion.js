import { gridJsLocale } from '../main.js';
import { cargarLiquidacionesGuardadas } from './liquidacionesGuardadas.js';

export function inicializarGridLiquidacion() {
    if (window.gridLiquidacion) return;
    window.gridLiquidacion = new gridjs.Grid({
        columns: [
            { name: 'Jurisdicción', width: '150px' },
            'Base Imponible', 'Alícuota Media (%)', 'Imp. Determinado', 'Saldo Ant.', 'Retenciones', 'Percepciones', 'Total Créditos',
            { name: 'SALDO A PAGAR / (FAVOR)', formatter: (cell) => {
                const valor = parseFloat(cell);
                const color = valor > 0 ? 'tomato' : 'lightgreen';
                const texto = valor < 0 ? `(${Math.abs(valor).toFixed(2)})` : valor.toFixed(2);
                return gridjs.html(`<strong style="color: ${color};">${texto}</strong>`);
            }},
            {
                name: 'Detalle por Actividad',
                sort: false,
                plugin: {
                    component: gridjs.plugins.nested.Nested,
                    props: {
                        columns: ['Actividad', 'Base Imponible'],
                    }
                }
            }
        ],
        data: [], language: gridJsLocale
    }).render(document.getElementById('grid-liquidacion-wrapper'));
}

export function setupModuloLiquidacion() {
    const mesSelect = document.getElementById('liq-mes');
    mesSelect.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        mesSelect.innerHTML += `<option value="${i}">${i.toString().padStart(2, '0')}</option>`;
    }
    const hoy = new Date();
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    document.getElementById('liq-anio').value = mesAnterior.getFullYear();
    mesSelect.value = mesAnterior.getMonth() + 1;
}

export async function generarLiquidacion() {
    if (!window.clienteActivoId) { alert("Seleccione un cliente activo."); return; }
    const anio = document.getElementById('liq-anio').value;
    const mes = document.getElementById('liq-mes').value;

    try {
        const resultados = await window.go.main.App.GenerarLiquidacion(window.clienteActivoId, anio, mes) || [];
        const data = resultados.map(r => [
            r.nombre_jurisdiccion,
            r.base_imponible_total.toFixed(2),
            r.alicuota_media.toFixed(2),
            r.impuesto_determinado.toFixed(2),
            r.saldo_anterior.toFixed(2),
            r.retenciones.toFixed(2),
            r.percepciones.toFixed(2),
            r.total_creditos.toFixed(2),
            r.saldo_final,
            Object.entries(r.detalle_por_actividad || {}).map(([actId, base]) => [
                window.actividadesGlobal.find(a => a.id == actId)?.descripcion || `Actividad ID: ${actId}`,
                base.toFixed(2)
            ])
        ]);
        window.gridLiquidacion.updateConfig({ data: data }).forceRender();

        let totalImpuesto = 0, totalCreditos = 0, totalAPagar = 0;
        resultados.forEach(r => {
            totalImpuesto += r.impuesto_determinado;
            totalCreditos += r.retenciones + r.percepciones;
            if (r.saldo_final > 0) {
                totalAPagar += r.saldo_final;
            }
        });
        document.getElementById('total-impuesto').textContent = totalImpuesto.toFixed(2);
        document.getElementById('total-creditos').textContent = totalCreditos.toFixed(2);
        document.getElementById('total-a-pagar').textContent = totalAPagar.toFixed(2);
        
        await cargarLiquidacionesGuardadas();

    } catch (err) {
        alert(`Error al generar y guardar la liquidación: ${err}`);
        console.error(err);
    }
}