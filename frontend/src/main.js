// ================================= //
//      IMPORTACIONES DE MÓDulos
// ================================= //
import { 
    inicializarGridClientes, cargarClientes, guardarCliente, iniciarBorradoCliente 
} from './modules/clientes.js';
import { 
    inicializarGridAlicuotas, poblarListaActividades, crearActividad, modificarActividad, 
    eliminarActividad, seleccionarActividad, cargarAlicuotas, guardarAlicuotas 
} from './modules/actividades.js';
import { 
    inicializarGridCoeficientes, cargarResumenCoeficientes, cargarDetalleCoeficientes, 
    nuevoPeriodoCoeficientes, eliminarPeriodoCoeficientes, guardarCoeficientes, modificarPeriodoCoeficientes 
} from './modules/coeficientes.js';
import { 
    inicializarGridVentas, setupModuloVentas, toggleAsignacionDirecta, cargarVentas, 
    cargarVentaParaEditar, limpiarFormularioVenta, guardarVenta, eliminarVenta, 
    cargarAsignacionDirecta, agregarFilaAsignacion, quitarFilaAsignacion, actualizarTotalesAsignacion 
} from './modules/ventas.js';
import { 
    inicializarGridCreditos, setupModuloCreditos, showTab, cargarTodosLosCreditos, 
    cargarRetenciones, limpiarFormularioRetencion, guardarRetencion, eliminarRetencion, 
    cargarPercepcionParaEditar, limpiarFormularioPercepcion, guardarPercepcion, eliminarPercepcion, 
    cargarSaldosAFavor, limpiarFormularioSaldo, guardarSaldoAFavor, eliminarSaldoAFavor, 
    cargarRetencionParaEditar, cargarSaldoParaEditar 
} from './modules/creditos.js';
import { 
    inicializarGridLiquidacion, setupModuloLiquidacion, generarLiquidacion 
} from './modules/liquidacion.js';
import { 
    inicializarGridLiquidacionesGuardadas, cargarLiquidacionesGuardadas, eliminarLiquidacion 
} from './modules/liquidacionesGuardadas.js';

// ================================= //
//      EXPOSICIÓN GLOBAL
// Hacemos las funciones accesibles desde el HTML (onclick)
// ================================= //
Object.assign(window, {
    showModule, toggleTheme, showTab,
    guardarCliente, iniciarBorradoCliente,
    crearActividad, modificarActividad, eliminarActividad, seleccionarActividad, guardarAlicuotas,
    cargarResumenCoeficientes, cargarDetalleCoeficientes, nuevoPeriodoCoeficientes, eliminarPeriodoCoeficientes, guardarCoeficientes, modificarPeriodoCoeficientes,
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
    } catch (e) { console.error("No se pudo acceder a localStorage para aplicar el tema:", e); }
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
}

// ================================= //
//    LÓGICA DE DATOS GLOBALES
// ================================= //
export let clientesGlobal = [], actividadesGlobal = [], jurisdiccionesGlobal = [];
export let clienteActivoId = null;

export const dataTablesLocale = {
    search: "Buscar:", lengthMenu: "Mostrar _MENU_ registros",
    info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
    infoEmpty: "Mostrando 0 a 0 de 0 registros",
    infoFiltered: "(filtrado de _MAX_ registros totales)",
    paginate: { first: "Primero", last: "Último", next: "Siguiente", previous: "Anterior" },
    zeroRecords: "No se encontraron registros coincidentes",
    loadingRecords: "Cargando...",
};

// **CORRECCIÓN: Se vuelve a añadir 'export' a esta función**
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
        setupModuloVentas();
        setupModuloCreditos();
        setupModuloLiquidacion();
        
        // Cargar datos en las tablas después de la configuración
        cargarClientes();

    } catch (err) { 
        console.error("Error fatal cargando datos globales:", err);
        throw new Error("No se pudieron cargar los datos iniciales. Revisa la conexión con el backend.");
    }
}

function poblarSelectClienteActivo() {
    const select = document.getElementById('cliente-activo-select');
    const valorPrevio = select.value;
    select.innerHTML = '<option value="">Seleccione un cliente...</option>';
    window.clientesGlobal.forEach(c => select.innerHTML += `<option value="${c.id}">${c.razon_social}</option>`);
    select.value = valorPrevio;
    select.onchange = () => {
        window.clienteActivoId = select.value ? parseInt(select.value) : null;
        
        // Recargar datos de todas las tablas al cambiar de cliente
        cargarClientes();
        cargarAlicuotas();
        cargarResumenCoeficientes();
        cargarVentas();
        cargarTodosLosCreditos();
        cargarLiquidacionesGuardadas();
    };
}

function inicializarTodasLasTablas() {
    inicializarGridClientes();
    inicializarGridAlicuotas();
    inicializarGridCoeficientes();
    inicializarGridVentas();
    inicializarGridCreditos();
    inicializarGridLiquidacion();
    inicializarGridLiquidacionesGuardadas();
}

// ================================= //
//      INICIO DE LA APP
// ================================= //
window.onload = async () => {
    try {
        console.log("Iniciando aplicación...");
        applySavedTheme();
        
        inicializarTodasLasTablas();
        await cargarDatosGlobales();
        
        showModule('module-liquidacion');

    } catch (err) {
        console.error("Error al iniciar la aplicación:", err);
        document.body.innerHTML = `<div class="alert alert-danger m-4"><h4>Error Crítico al Iniciar</h4><p>La aplicación no pudo cargarse correctamente.</p><pre>${err.message}</pre></div>`;
    }
};

export function formatearFecha(fechaISO) {
    if (!fechaISO || !fechaISO.includes('-')) return "N/A";
    const [año, mes, dia] = fechaISO.split('T')[0].split('-');
    return `${dia}/${mes}/${año}`;
}