// ================================= //
//      IMPORTACIONES DE MÓDulos
// ================================= //
import { inicializarGridClientes, cargarClientes, guardarCliente, iniciarBorradoCliente } from './modules/clientes.js';
import { inicializarGridAlicuotas, poblarListaActividades, crearActividad, modificarActividad, eliminarActividad, seleccionarActividad, cargarAlicuotas, guardarAlicuotas } from './modules/actividades.js';
import { inicializarGridCoeficientes, cargarResumenCoeficientes, cargarDetalleCoeficientes, nuevoPeriodoCoeficientes, eliminarPeriodoCoeficientes, guardarCoeficientes, modificarPeriodoCoeficientes } from './modules/coeficientes.js';
import { inicializarGridVentas, setupModuloVentas, toggleAsignacionDirecta, cargarVentas, cargarVentaParaEditar, limpiarFormularioVenta, guardarVenta, eliminarVenta, cargarAsignacionDirecta, agregarFilaAsignacion, quitarFilaAsignacion, actualizarTotalesAsignacion } from './modules/ventas.js';
import { inicializarGridCreditos, setupModuloCreditos, showTab, cargarTodosLosCreditos, cargarRetenciones, limpiarFormularioRetencion, guardarRetencion, eliminarRetencion, cargarPercepcionParaEditar, limpiarFormularioPercepcion, guardarPercepcion, eliminarPercepcion, cargarSaldosAFavor, limpiarFormularioSaldo, guardarSaldoAFavor, eliminarSaldoAFavor, cargarRetencionParaEditar, cargarSaldoParaEditar } from './modules/creditos.js';
import { inicializarGridLiquidacion, setupModuloLiquidacion, generarLiquidacion } from './modules/liquidacion.js';
import { inicializarGridLiquidacionesGuardadas, cargarLiquidacionesGuardadas, eliminarLiquidacion } from './modules/liquidacionesGuardadas.js';

// ================================= //
//      EXPOSICIÓN GLOBAL
// Hacemos las funciones accesibles desde el HTML (onclick)
// ================================= //
Object.assign(window, {
    showModule, toggleTheme, showTab,
    guardarCliente, iniciarBorradoCliente,
    crearActividad, modificarActividad, eliminarActividad, seleccionarActividad, guardarAlicuotas,
    cargarResumenCoeficientes, nuevoPeriodoCoeficientes, guardarCoeficientes, modificarPeriodoCoeficientes, eliminarPeriodoCoeficientes, cargarDetalleCoeficientes,
    guardarVenta, limpiarFormularioVenta, cargarVentas, agregarFilaAsignacion, quitarFilaAsignacion, cargarVentaParaEditar, eliminarVenta,
    guardarRetencion, limpiarFormularioRetencion, eliminarRetencion, cargarRetencionParaEditar,
    guardarPercepcion, limpiarFormularioPercepcion, eliminarPercepcion, cargarPercepcionParaEditar,
    guardarSaldoAFavor, limpiarFormularioSaldo, eliminarSaldoAFavor, cargarSaldoParaEditar,
    generarLiquidacion, eliminarLiquidacion
});

// ================================= //
//      LÓGICA PARA EL TEMA
// ================================= //
function toggleTheme() {
    document.documentElement.classList.toggle('dark-theme');
    let currentTheme = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
}

function applySavedTheme() {
    try {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark-theme');
        } else {
            document.documentElement.classList.remove('dark-theme');
        }
    } catch (e) {
        console.error("No se pudo acceder a localStorage para aplicar el tema:", e);
    }
}

window.runtime.EventsOn("toggle-theme", toggleTheme);

// ================================= //
//      LÓGICA DE NAVEGACIÓN
// ================================= //
function showModule(moduleId) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.getElementById(moduleId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`a[onclick="showModule('${moduleId}')"]`).classList.add('active');

    switch (moduleId) {
        case 'module-clientes': if (!window.gridClientes) inicializarGridClientes(); break;
        case 'module-actividades': if (!window.gridAlicuotas) inicializarGridAlicuotas(); break;
        case 'module-coeficientes': if (!window.gridCoefResumen) inicializarGridCoeficientes(); break;
        case 'module-ventas': if (!window.gridVentas) inicializarGridVentas(); break;
        case 'module-creditos': if (!window.gridRetenciones) inicializarGridCreditos(); cargarTodosLosCreditos(); break;
        case 'module-liquidacion': if (!window.gridLiquidacion) inicializarGridLiquidacion(); break;
        case 'module-liquidaciones-guardadas': if (!window.gridLiquidacionesGuardadas) inicializarGridLiquidacionesGuardadas(); cargarLiquidacionesGuardadas(); break;
    }
}

// ================================= //
//    LÓGICA DE DATOS GLOBALES
// ================================= //
export let clientesGlobal = [], actividadesGlobal = [], jurisdiccionesGlobal = [];
export let clienteActivoId = null;
export const gridJsLocale = { search: { placeholder: '🔍 Buscar...' }, pagination: { previous: 'Anterior', next: 'Siguiente', showing: 'Mostrando', of: 'de', to: 'a', results: 'resultados' }, loading: 'Cargando...', noRecordsFound: 'No se encontraron registros', error: 'Ocurrió un error' };

export async function cargarDatosGlobales() {
    try {
        const [clientesRes, actividadesRes, jurisdiccionesRes] = await Promise.all([
            window.go.main.App.GetClientes(),
            window.go.main.App.GetActividades(),
            window.go.main.App.GetJurisdicciones()
        ]);
        
        window.clientesGlobal = clientesRes || [];
        window.actividadesGlobal = actividadesRes || [];
        window.jurisdiccionesGlobal = jurisdiccionesRes || [];

        poblarSelectClienteActivo();
        poblarListaActividades();
        cargarClientes();
        setupModuloVentas();
        setupModuloCreditos();
        setupModuloLiquidacion();
    } catch (err) { console.error("Error fatal cargando datos globales:", err); }
}

// ================================= //
//      LÓGICA DEL HEADER
// ================================= //
function poblarSelectClienteActivo() {
    const select = document.getElementById('cliente-activo-select');
    const valorPrevio = select.value;
    select.innerHTML = '<option value="">Seleccione un cliente...</option>';
    window.clientesGlobal.forEach(c => select.innerHTML += `<option value="${c.id}">${c.razon_social}</option>`);
    select.value = valorPrevio;
    select.onchange = () => {
        window.clienteActivoId = select.value ? parseInt(select.value) : null;
        if (document.getElementById('module-actividades').classList.contains('active')) cargarAlicuotas();
        if (document.getElementById('module-coeficientes').classList.contains('active')) cargarResumenCoeficientes();
        if (document.getElementById('module-ventas').classList.contains('active')) cargarVentas();
        if (document.getElementById('module-creditos').classList.contains('active')) cargarTodosLosCreditos();
        if (document.getElementById('module-liquidaciones-guardadas').classList.contains('active')) cargarLiquidacionesGuardadas();
    };
}

// ================================= //
//      INICIO DE LA APP
// ================================= //
window.onload = async () => {
    console.log("Página y todos los scripts cargados. Iniciando aplicación.");
    applySavedTheme();

    if (typeof gridjs === 'undefined' || !gridjs.plugins || !gridjs.plugins.nested) {
        console.error("FATAL: La librería Grid.js o su plugin 'nested' no se han cargado.");
        alert("Error crítico: No se pudo cargar un componente de las tablas. La aplicación no puede continuar.");
        return;
    }
    
    try {
        showModule('module-liquidacion');
        await cargarDatosGlobales();
    } catch (err) {
        console.error("Error al iniciar la aplicación:", err);
        alert("No se pudieron cargar los datos iniciales. Por favor, recarga la página.");
    }
};

export function formatearFecha(fechaISO) {
    if (!fechaISO || !fechaISO.includes('-')) return "N/A";
    const [año, mes, dia] = fechaISO.split('T')[0].split('-');
    return `${dia}/${mes}/${año}`;
}
