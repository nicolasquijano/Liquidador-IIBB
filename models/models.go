package models

// --- Módulos Clientes y Actividades ---

type Cliente struct {
	ID          int64  `json:"id"`
	RazonSocial string `json:"razon_social"`
	CUIT        string `json:"cuit"`
	FechaAlta   string `json:"fecha_alta"`
}

type Actividad struct {
	ID          int64  `json:"id"`
	Codigo      string `json:"codigo_actividad"`
	Descripcion string `json:"descripcion"`
}

type Jurisdiccion struct {
	ID     int64  `json:"id"`
	Codigo string `json:"codigo_comarb"`
	Nombre string `json:"nombre"`
}

// --- Módulo Coeficientes Anuales ---

type CoeficienteResumen struct {
	MesDesde int     `json:"mes_desde"`
	MesHasta int     `json:"mes_hasta"`
	Suma     float64 `json:"suma"`
}

// --- Módulo Carga de Ventas ---

type Comprobante struct {
	ID                 int64   `json:"id"`
	IDCliente          int64   `json:"id_cliente"`
	Fecha              string  `json:"fecha"` // YYYY-MM-DD
	TipoComprobante    string  `json:"tipo_comprobante"`
	PuntoVenta         int     `json:"punto_venta"`
	Numero             int64   `json:"numero"`
	CuitCliente        string  `json:"cuit_cliente"`
	RazonSocialCliente string  `json:"razon_social_cliente"`
	MontoGravado       float64 `json:"monto_gravado"`
	MontoNoGravado     float64 `json:"monto_no_gravado"`
	ImporteTotal       float64 `json:"importe_total"`
	IDActividad        *int64  `json:"id_actividad"`
	TipoAsignacion     string  `json:"tipo_asignacion"`
}

type AsignacionDirecta struct {
	IDComprobante  int64   `json:"id_comprobante"`
	IDJurisdiccion int64   `json:"id_jurisdiccion"`
	MontoAsignado  float64 `json:"monto_asignado"`
}

type ComprobanteFull struct {
	Comprobante  Comprobante         `json:"comprobante"`
	Asignaciones []AsignacionDirecta `json:"asignaciones"`
}

// --- Módulo Créditos Fiscales ---

type Retencion struct {
	ID                      int64   `json:"id"`
	IDCliente               int64   `json:"id_cliente"`
	Fecha                   string  `json:"fecha"`
	IDJurisdiccion          int64   `json:"id_jurisdiccion"`
	CuitAgenteRetencion     string  `json:"cuit_agente_retencion"`
	NroComprobanteRetencion string  `json:"nro_comprobante_retencion"`
	Monto                   float64 `json:"monto"`
}

type Percepcion struct {
	ID                   int64   `json:"id"`
	IDCliente            int64   `json:"id_cliente"`
	Fecha                string  `json:"fecha"`
	IDJurisdiccion       int64   `json:"id_jurisdiccion"`
	CuitAgentePercepcion string  `json:"cuit_agente_percepcion"`
	NroFacturaCompra     string  `json:"nro_factura_compra"`
	Monto                float64 `json:"monto"`
}

type SaldoAFavor struct {
	ID             int64   `json:"id"`
	IDCliente      int64   `json:"id_cliente"`
	Periodo        string  `json:"periodo"`
	IDJurisdiccion int64   `json:"id_jurisdiccion"`
	Monto          float64 `json:"monto"`
}

// --- Módulo Liquidación ---

type ResultadoLiquidacion struct {
	IDJurisdiccion      int64             `json:"id_jurisdiccion"`
	NombreJurisdiccion  string            `json:"nombre_jurisdiccion"`
	BaseImponibleTotal  float64           `json:"base_imponible_total"`
	DetallePorActividad map[int64]float64 `json:"detalle_por_actividad"` // map[id_actividad]base_imponible
	AlicuotaMedia       float64           `json:"alicuota_media"`
	ImpuestoDeterminado float64           `json:"impuesto_determinado"`
	SaldoAnterior       float64           `json:"saldo_anterior"`
	Retenciones         float64           `json:"retenciones"`
	Percepciones        float64           `json:"percepciones"`
	TotalCreditos       float64           `json:"total_creditos"`
	SaldoFinal          float64           `json:"saldo_final"`
}

type LiquidacionGuardada struct {
	ID               int64  `json:"id"`
	IDCliente        int64  `json:"id_cliente"`
	Periodo          string `json:"periodo"` // YYYY-MM
	Fecha            string `json:"fecha"`   // YYYY-MM-DD HH:MM:SS
	RectificativaNro int    `json:"rectificativa_nro"`
}
