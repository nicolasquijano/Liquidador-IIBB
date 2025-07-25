package database

import (
	"database/sql"
	"liquidador-iibb/models"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB(filepath string) *sql.DB {
	var err error
	DB, err = sql.Open("sqlite3", filepath+"?_foreign_keys=on")
	if err != nil {
		log.Fatal(err)
	}

	createTablesSQL := `
    CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY, razon_social TEXT NOT NULL, cuit TEXT NOT NULL UNIQUE, fecha_alta TEXT);
    CREATE TABLE IF NOT EXISTS jurisdicciones (id INTEGER PRIMARY KEY, codigo_comarb TEXT NOT NULL UNIQUE, nombre TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS actividades (id INTEGER PRIMARY KEY, codigo_actividad TEXT NOT NULL UNIQUE, descripcion TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS alicuotas_por_jurisdiccion (id INTEGER PRIMARY KEY, id_cliente INTEGER NOT NULL, id_actividad INTEGER NOT NULL, id_jurisdiccion INTEGER NOT NULL, alicuota REAL NOT NULL, FOREIGN KEY(id_cliente) REFERENCES clientes(id) ON DELETE CASCADE, FOREIGN KEY (id_actividad) REFERENCES actividades (id) ON DELETE CASCADE, FOREIGN KEY (id_jurisdiccion) REFERENCES jurisdicciones (id) ON DELETE CASCADE, UNIQUE(id_cliente, id_actividad, id_jurisdiccion));
    CREATE TABLE IF NOT EXISTS coeficientes_anuales (id INTEGER PRIMARY KEY, id_cliente INTEGER NOT NULL, anio_fiscal INTEGER NOT NULL, mes_desde INTEGER NOT NULL, mes_hasta INTEGER NOT NULL, id_jurisdiccion INTEGER NOT NULL, coeficiente_unificado REAL NOT NULL, FOREIGN KEY(id_cliente) REFERENCES clientes(id) ON DELETE CASCADE, FOREIGN KEY (id_jurisdiccion) REFERENCES jurisdicciones (id) ON DELETE CASCADE, UNIQUE(id_cliente, anio_fiscal, mes_desde, id_jurisdiccion));
    CREATE TABLE IF NOT EXISTS comprobantes (id INTEGER PRIMARY KEY, id_cliente INTEGER NOT NULL, fecha TEXT NOT NULL, tipo_comprobante TEXT NOT NULL, punto_venta INTEGER NOT NULL, numero INTEGER NOT NULL, cuit_cliente TEXT, razon_social_cliente TEXT, monto_gravado REAL NOT NULL, monto_no_gravado REAL NOT NULL, importe_total REAL NOT NULL, id_actividad INTEGER, tipo_asignacion TEXT NOT NULL CHECK(tipo_asignacion IN ('GENERAL', 'DIRECTA')), FOREIGN KEY(id_cliente) REFERENCES clientes(id) ON DELETE CASCADE, FOREIGN KEY (id_actividad) REFERENCES actividades (id));
    CREATE TABLE IF NOT EXISTS asignaciones_directas (id INTEGER PRIMARY KEY, id_comprobante INTEGER NOT NULL, id_jurisdiccion INTEGER NOT NULL, monto_asignado REAL NOT NULL, FOREIGN KEY (id_comprobante) REFERENCES comprobantes(id) ON DELETE CASCADE, FOREIGN KEY (id_jurisdiccion) REFERENCES jurisdicciones(id) ON DELETE CASCADE, UNIQUE(id_comprobante, id_jurisdiccion));
    CREATE TABLE IF NOT EXISTS retenciones_sufridas (id INTEGER PRIMARY KEY, id_cliente INTEGER NOT NULL, fecha TEXT NOT NULL, id_jurisdiccion INTEGER NOT NULL, cuit_agente_retencion TEXT NOT NULL, nro_comprobante_retencion TEXT NOT NULL UNIQUE, monto REAL NOT NULL, FOREIGN KEY(id_cliente) REFERENCES clientes(id) ON DELETE CASCADE, FOREIGN KEY (id_jurisdiccion) REFERENCES jurisdicciones(id));
    CREATE TABLE IF NOT EXISTS percepciones_sufridas (id INTEGER PRIMARY KEY, id_cliente INTEGER NOT NULL, fecha TEXT NOT NULL, id_jurisdiccion INTEGER NOT NULL, cuit_agente_percepcion TEXT NOT NULL, nro_factura_compra TEXT NOT NULL, monto REAL NOT NULL, FOREIGN KEY(id_cliente) REFERENCES clientes(id) ON DELETE CASCADE, FOREIGN KEY (id_jurisdiccion) REFERENCES jurisdicciones (id));
    CREATE TABLE IF NOT EXISTS saldos_a_favor (id INTEGER PRIMARY KEY, id_cliente INTEGER NOT NULL, periodo TEXT NOT NULL, id_jurisdiccion INTEGER NOT NULL, monto REAL NOT NULL, FOREIGN KEY(id_cliente) REFERENCES clientes(id) ON DELETE CASCADE, FOREIGN KEY (id_jurisdiccion) REFERENCES jurisdicciones (id) ON DELETE CASCADE, UNIQUE(id_cliente, periodo, id_jurisdiccion));
    
    CREATE TABLE IF NOT EXISTS liquidaciones (id INTEGER PRIMARY KEY, id_cliente INTEGER NOT NULL, periodo TEXT NOT NULL, fecha TEXT NOT NULL, rectificativa_nro INTEGER NOT NULL DEFAULT 0, FOREIGN KEY(id_cliente) REFERENCES clientes(id) ON DELETE CASCADE, UNIQUE(id_cliente, periodo, rectificativa_nro));
    CREATE TABLE IF NOT EXISTS liquidaciones_detalle (id INTEGER PRIMARY KEY, id_liquidacion INTEGER NOT NULL, id_jurisdiccion INTEGER NOT NULL, id_actividad INTEGER, base_imponible REAL NOT NULL, alicuota_aplicada REAL NOT NULL, impuesto_determinado REAL NOT NULL, FOREIGN KEY(id_liquidacion) REFERENCES liquidaciones(id) ON DELETE CASCADE, FOREIGN KEY(id_jurisdiccion) REFERENCES jurisdicciones(id), FOREIGN KEY(id_actividad) REFERENCES actividades(id));
    `
	_, err = DB.Exec(createTablesSQL)
	if err != nil {
		log.Fatalf("Error creando tablas: %v", err)
	}

	var count int
	err = DB.QueryRow("SELECT COUNT(*) FROM jurisdicciones").Scan(&count)
	if err != nil {
		log.Fatalf("Error al contar jurisdicciones: %v", err)
	}

	if count == 0 {
		log.Println("Poblando tabla de jurisdicciones...")
		jurisdicciones := []models.Jurisdiccion{
			{ID: 901, Codigo: "901", Nombre: "CABA"}, {ID: 902, Codigo: "902", Nombre: "Buenos Aires"}, {ID: 903, Codigo: "903", Nombre: "Catamarca"}, {ID: 904, Codigo: "904", Nombre: "Córdoba"}, {ID: 905, Codigo: "905", Nombre: "Corrientes"}, {ID: 906, Codigo: "906", Nombre: "Chaco"}, {ID: 907, Codigo: "907", Nombre: "Chubut"}, {ID: 908, Codigo: "908", Nombre: "Entre Ríos"}, {ID: 909, Codigo: "909", Nombre: "Formosa"}, {ID: 910, Codigo: "910", Nombre: "Jujuy"}, {ID: 911, Codigo: "911", Nombre: "La Pampa"}, {ID: 912, Codigo: "912", Nombre: "La Rioja"}, {ID: 913, Codigo: "913", Nombre: "Mendoza"}, {ID: 914, Codigo: "914", Nombre: "Misiones"}, {ID: 915, Codigo: "915", Nombre: "Neuquén"}, {ID: 916, Codigo: "916", Nombre: "Río Negro"}, {ID: 917, Codigo: "917", Nombre: "Salta"}, {ID: 918, Codigo: "918", Nombre: "San Juan"}, {ID: 919, Codigo: "919", Nombre: "San Luis"}, {ID: 920, Codigo: "920", Nombre: "Santa Cruz"}, {ID: 921, Codigo: "921", Nombre: "Santa Fe"}, {ID: 922, Codigo: "922", Nombre: "Santiago del Estero"}, {ID: 923, Codigo: "923", Nombre: "Tucumán"}, {ID: 924, Codigo: "924", Nombre: "Tierra del Fuego"},
		}
		tx, err := DB.Begin()
		if err != nil {
			log.Fatal(err)
		}
		stmt, err := tx.Prepare("INSERT INTO jurisdicciones(id, codigo_comarb, nombre) VALUES(?, ?, ?)")
		if err != nil {
			log.Fatal(err)
		}
		defer stmt.Close()
		for _, j := range jurisdicciones {
			if _, err := stmt.Exec(j.ID, j.Codigo, j.Nombre); err != nil {
				log.Fatal(err)
			}
		}
		tx.Commit()
	}
	log.Println("Base de datos inicializada correctamente.")
	return DB
}
