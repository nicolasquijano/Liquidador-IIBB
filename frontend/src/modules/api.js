// Un único lugar para todas las llamadas al backend.
// Si en el futuro cambias cómo Go expone sus funciones, solo cambias este archivo.
export const api = {
    // Clientes
    getClientes: () => window.go.main.App.GetClientes(),
    guardarCliente: (razonSocial, cuit) => window.go.main.App.GuardarCliente(razonSocial, cuit),
    borrarCliente: (id) => window.go.main.App.BorrarCliente(id),

    // Actividades
    getActividades: () => window.go.main.App.GetActividades(),
    crearActividad: (codigo, desc) => window.go.main.App.CrearActividad(codigo, desc),
    modificarActividad: (id, codigo, desc) => window.go.main.App.ModificarActividad(id, codigo, desc),
    eliminarActividad: (id) => window.go.main.App.EliminarActividad(id),

    // ... y así sucesivamente para TODAS las demás llamadas al backend ...
    // getJurisdicciones, getAlicuotas, guardarAlicuotas, etc.
};