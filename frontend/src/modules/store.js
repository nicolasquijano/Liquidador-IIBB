// Este objeto contendrá todo el estado compartido de la aplicación.
export const state = {
    clientes: [],
    actividades: [],
    jurisdicciones: [],
    clienteActivoId: null
};

// Funciones para modificar el estado. Esto asegura que los cambios
// se realicen de manera controlada.
export function setClientes(nuevosClientes) {
    state.clientes = nuevosClientes || [];
}

export function setActividades(nuevasActividades) {
    state.actividades = nuevasActividades || [];
}

export function setJurisdicciones(nuevasJurisdicciones) {
    state.jurisdicciones = nuevasJurisdicciones || [];
}

export function setClienteActivoId(id) {
    state.clienteActivoId = id;
}