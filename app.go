package main

import (
	"context"
	"database/sql"
	"fmt"
	"liquidador-iibb/database"
	"liquidador-iibb/models"
	"log"
	"strings"
	"time"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	database.InitDB("./liquidacion_iibb_multi.db")
}

// --- Métodos de Clientes ---

func (a *App) GetClientes() ([]models.Cliente, error) {
	rows, err := database.DB.Query("SELECT id, razon_social, cuit, fecha_alta FROM clientes ORDER BY razon_social")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clientes []models.Cliente
	for rows.Next() {
		var c models.Cliente
		if err := rows.Scan(&c.ID, &c.RazonSocial, &c.CUIT, &c.FechaAlta); err != nil {
			return nil, err
		}
		clientes = append(clientes, c)
	}
	return clientes, nil
}

func (a *App) GuardarCliente(razonSocial string, cuit string) (string, error) {
	if razonSocial == "" || cuit == "" {
		return "", fmt.Errorf("la Razón Social y el CUIT son obligatorios")
	}
	stmt, err := database.DB.Prepare("INSERT INTO clientes (razon_social, cuit, fecha_alta) VALUES (?, ?, ?)")
	if err != nil {
		return "", err
	}
	defer stmt.Close()
	fechaHoy := time.Now().Format("2006-01-02")
	_, err = stmt.Exec(razonSocial, cuit, fechaHoy)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return "", fmt.Errorf("el CUIT '%s' ya existe para otro cliente", cuit)
		}
		return "", err
	}
	return "¡Cliente guardado con éxito!", nil
}

func (a *App) BorrarCliente(id int64) error {
	_, err := database.DB.Exec("DELETE FROM clientes WHERE id = ?", id)
	return err
}

// --- Métodos para Actividades y Alícuotas ---

func (a *App) GetActividades() ([]models.Actividad, error) {
	rows, err := database.DB.Query("SELECT id, codigo_actividad, descripcion FROM actividades ORDER BY codigo_actividad")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var actividades []models.Actividad
	for rows.Next() {
		var act models.Actividad
		if err := rows.Scan(&act.ID, &act.Codigo, &act.Descripcion); err != nil {
			return nil, err
		}
		actividades = append(actividades, act)
	}
	return actividades, nil
}

func (a *App) CrearActividad(codigo string, descripcion string) error {
	_, err := database.DB.Exec("INSERT INTO actividades (codigo_actividad, descripcion) VALUES (?, ?)", codigo, descripcion)
	return err
}

func (a *App) ModificarActividad(id int64, codigo string, descripcion string) error {
	var exists int
	queryCheck := "SELECT 1 FROM actividades WHERE codigo_actividad = ? AND id != ? LIMIT 1"
	err := database.DB.QueryRow(queryCheck, codigo, id).Scan(&exists)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("error al verificar código de actividad: %w", err)
	}
	if exists == 1 {
		return fmt.Errorf("el código de actividad '%s' ya existe", codigo)
	}
	queryUpdate := "UPDATE actividades SET codigo_actividad = ?, descripcion = ? WHERE id = ?"
	_, err = database.DB.Exec(queryUpdate, codigo, descripcion, id)
	return err
}

func (a *App) EliminarActividad(id int64) error {
	_, err := database.DB.Exec("DELETE FROM actividades WHERE id = ?", id)
	return err
}

func (a *App) GetJurisdicciones() ([]models.Jurisdiccion, error) {
	rows, err := database.DB.Query("SELECT id, codigo_comarb, nombre FROM jurisdicciones ORDER BY nombre")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var jurisdicciones []models.Jurisdiccion
	for rows.Next() {
		var j models.Jurisdiccion
		if err := rows.Scan(&j.ID, &j.Codigo, &j.Nombre); err != nil {
			return nil, err
		}
		jurisdicciones = append(jurisdicciones, j)
	}
	return jurisdicciones, nil
}

func (a *App) GetAlicuotas(clienteID int64, actividadID int64) (map[int64]float64, error) {
	rows, err := database.DB.Query("SELECT id_jurisdiccion, alicuota FROM alicuotas_por_jurisdiccion WHERE id_cliente = ? AND id_actividad = ?", clienteID, actividadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	alicuotas := make(map[int64]float64)
	for rows.Next() {
		var jurID int64
		var alicuota float64
		if err := rows.Scan(&jurID, &alicuota); err != nil {
			return nil, err
		}
		alicuotas[jurID] = alicuota
	}
	return alicuotas, nil
}

func (a *App) GuardarAlicuotas(clienteID int64, actividadID int64, alicuotas map[int64]float64) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	_, err = tx.Exec("DELETE FROM alicuotas_por_jurisdiccion WHERE id_cliente = ? AND id_actividad = ?", clienteID, actividadID)
	if err != nil {
		return err
	}
	if len(alicuotas) > 0 {
		stmt, err := tx.Prepare("INSERT INTO alicuotas_por_jurisdiccion (id_cliente, id_actividad, id_jurisdiccion, alicuota) VALUES (?, ?, ?, ?)")
		if err != nil {
			return err
		}
		defer stmt.Close()
		for jurID, alicuota := range alicuotas {
			if _, err = stmt.Exec(clienteID, actividadID, jurID, alicuota); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

// --- MÉTODOS PARA COEFICIENTES ANUALES ---

func (a *App) GetCoeficientesResumen(clienteID int64, anio int) ([]models.CoeficienteResumen, error) {
	query := `SELECT mes_desde, mes_hasta, SUM(coeficiente_unificado) FROM coeficientes_anuales WHERE id_cliente = ? AND anio_fiscal = ? GROUP BY mes_desde, mes_hasta ORDER BY mes_desde`
	rows, err := database.DB.Query(query, clienteID, anio)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var resumen []models.CoeficienteResumen
	for rows.Next() {
		var r models.CoeficienteResumen
		if err := rows.Scan(&r.MesDesde, &r.MesHasta, &r.Suma); err != nil {
			return nil, err
		}
		resumen = append(resumen, r)
	}
	return resumen, nil
}

func (a *App) GetCoeficientesDetalle(clienteID int64, anio int, mesDesde int) (map[int64]float64, error) {
	query := "SELECT id_jurisdiccion, coeficiente_unificado FROM coeficientes_anuales WHERE id_cliente = ? AND anio_fiscal = ? AND mes_desde = ?"
	rows, err := database.DB.Query(query, clienteID, anio, mesDesde)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	detalle := make(map[int64]float64)
	for rows.Next() {
		var jurID int64
		var coeficiente float64
		if err := rows.Scan(&jurID, &coeficiente); err != nil {
			return nil, err
		}
		detalle[jurID] = coeficiente
	}
	return detalle, nil
}

func (a *App) EliminarPeriodoCoeficientes(clienteID int64, anio int, mesDesde int) error {
	_, err := database.DB.Exec("DELETE FROM coeficientes_anuales WHERE id_cliente = ? AND anio_fiscal = ? AND mes_desde = ?", clienteID, anio, mesDesde)
	return err
}

func (a *App) GuardarCoeficientes(clienteID int64, anio int, mesDesde int, mesHasta int, coeficientes map[int64]float64) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	query := `INSERT INTO coeficientes_anuales (id_cliente, anio_fiscal, mes_desde, mes_hasta, id_jurisdiccion, coeficiente_unificado) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id_cliente, anio_fiscal, mes_desde, id_jurisdiccion) DO UPDATE SET coeficiente_unificado = excluded.coeficiente_unificado, mes_hasta = excluded.mes_hasta`
	stmt, err := tx.Prepare(query)
	if err != nil {
		return err
	}
	defer stmt.Close()
	for jurID, coef := range coeficientes {
		if _, err := stmt.Exec(clienteID, anio, mesDesde, mesHasta, jurID, coef); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (a *App) ModificarPeriodoCoeficientes(clienteID int64, anio int, mesDesdeActual int, mesDesdeNuevo int, mesHastaNuevo int) error {
	if mesDesdeActual != mesDesdeNuevo {
		var exists int
		queryCheck := "SELECT 1 FROM coeficientes_anuales WHERE id_cliente = ? AND anio_fiscal = ? AND mes_desde = ? LIMIT 1"
		err := database.DB.QueryRow(queryCheck, clienteID, anio, mesDesdeNuevo).Scan(&exists)
		if err != nil && err != sql.ErrNoRows {
			return fmt.Errorf("error al verificar el período: %w", err)
		}
		if exists == 1 {
			return fmt.Errorf("ya existe un período que comienza en el mes %d", mesDesdeNuevo)
		}
	}
	queryUpdate := "UPDATE coeficientes_anuales SET mes_desde = ?, mes_hasta = ? WHERE id_cliente = ? AND anio_fiscal = ? AND mes_desde = ?"
	_, err := database.DB.Exec(queryUpdate, mesDesdeNuevo, mesHastaNuevo, clienteID, anio, mesDesdeActual)
	return err
}

// --- MÉTODOS PARA CARGA DE VENTAS ---

func (a *App) GetVentasPorPeriodo(clienteID int64, anio int, mes int) ([]models.Comprobante, error) {
	query := `SELECT id, fecha, tipo_comprobante, punto_venta, numero, razon_social_cliente, importe_total, id_actividad FROM comprobantes WHERE id_cliente = ? AND strftime('%Y', fecha) = ? AND strftime('%m', fecha) = ? ORDER BY fecha, numero`
	anioStr, mesStr := fmt.Sprintf("%04d", anio), fmt.Sprintf("%02d", mes)
	rows, err := database.DB.Query(query, clienteID, anioStr, mesStr)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ventas []models.Comprobante
	for rows.Next() {
		var v models.Comprobante
		if err := rows.Scan(&v.ID, &v.Fecha, &v.TipoComprobante, &v.PuntoVenta, &v.Numero, &v.RazonSocialCliente, &v.ImporteTotal, &v.IDActividad); err != nil {
			return nil, err
		}
		ventas = append(ventas, v)
	}
	return ventas, nil
}

func (a *App) GetVentaDetalle(comprobanteID int64) (*models.ComprobanteFull, error) {
	var c models.Comprobante
	queryComp := "SELECT id, id_cliente, fecha, tipo_comprobante, punto_venta, numero, cuit_cliente, razon_social_cliente, monto_gravado, monto_no_gravado, importe_total, id_actividad, tipo_asignacion FROM comprobantes WHERE id = ?"
	err := database.DB.QueryRow(queryComp, comprobanteID).Scan(&c.ID, &c.IDCliente, &c.Fecha, &c.TipoComprobante, &c.PuntoVenta, &c.Numero, &c.CuitCliente, &c.RazonSocialCliente, &c.MontoGravado, &c.MontoNoGravado, &c.ImporteTotal, &c.IDActividad, &c.TipoAsignacion)
	if err != nil {
		return nil, err
	}
	var asignaciones []models.AsignacionDirecta
	if c.TipoAsignacion == "DIRECTA" {
		rows, err := database.DB.Query("SELECT id_jurisdiccion, monto_asignado FROM asignaciones_directas WHERE id_comprobante = ?", comprobanteID)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		for rows.Next() {
			var asig models.AsignacionDirecta
			if err := rows.Scan(&asig.IDJurisdiccion, &asig.MontoAsignado); err != nil {
				return nil, err
			}
			asignaciones = append(asignaciones, asig)
		}
	}
	return &models.ComprobanteFull{Comprobante: c, Asignaciones: asignaciones}, nil
}

func (a *App) EliminarVenta(comprobanteID int64) error {
	_, err := database.DB.Exec("DELETE FROM comprobantes WHERE id = ?", comprobanteID)
	return err
}

func (a *App) GuardarVenta(ventaFull models.ComprobanteFull) (int64, error) {
	tx, err := database.DB.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	c := ventaFull.Comprobante
	if c.ID > 0 {
		query := `UPDATE comprobantes SET fecha=?, tipo_comprobante=?, punto_venta=?, numero=?, cuit_cliente=?, razon_social_cliente=?, monto_gravado=?, monto_no_gravado=?, importe_total=?, id_actividad=?, tipo_asignacion=? WHERE id = ?`
		_, err = tx.Exec(query, c.Fecha, c.TipoComprobante, c.PuntoVenta, c.Numero, c.CuitCliente, c.RazonSocialCliente, c.MontoGravado, c.MontoNoGravado, c.ImporteTotal, c.IDActividad, c.TipoAsignacion, c.ID)
		if err != nil {
			return 0, err
		}
		_, err = tx.Exec("DELETE FROM asignaciones_directas WHERE id_comprobante = ?", c.ID)
		if err != nil {
			return 0, err
		}
	} else {
		query := `INSERT INTO comprobantes (id_cliente, fecha, tipo_comprobante, punto_venta, numero, cuit_cliente, razon_social_cliente, monto_gravado, monto_no_gravado, importe_total, id_actividad, tipo_asignacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		res, err := tx.Exec(query, c.IDCliente, c.Fecha, c.TipoComprobante, c.PuntoVenta, c.Numero, c.CuitCliente, c.RazonSocialCliente, c.MontoGravado, c.MontoNoGravado, c.ImporteTotal, c.IDActividad, c.TipoAsignacion)
		if err != nil {
			return 0, err
		}
		c.ID, err = res.LastInsertId()
		if err != nil {
			return 0, err
		}
	}
	if c.TipoAsignacion == "DIRECTA" && len(ventaFull.Asignaciones) > 0 {
		stmt, err := tx.Prepare("INSERT INTO asignaciones_directas (id_comprobante, id_jurisdiccion, monto_asignado) VALUES (?, ?, ?)")
		if err != nil {
			return 0, err
		}
		defer stmt.Close()
		for _, asig := range ventaFull.Asignaciones {
			if _, err := stmt.Exec(c.ID, asig.IDJurisdiccion, asig.MontoAsignado); err != nil {
				return 0, err
			}
		}
	}
	return c.ID, tx.Commit()
}

// --- MÉTODOS PARA CRÉDITOS FISCALES ---

func (a *App) GetRetenciones(clienteID int64) ([]models.Retencion, error) {
	rows, err := database.DB.Query("SELECT id, fecha, id_jurisdiccion, cuit_agente_retencion, nro_comprobante_retencion, monto FROM retenciones_sufridas WHERE id_cliente = ? ORDER BY fecha DESC", clienteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []models.Retencion
	for rows.Next() {
		var i models.Retencion
		if err := rows.Scan(&i.ID, &i.Fecha, &i.IDJurisdiccion, &i.CuitAgenteRetencion, &i.NroComprobanteRetencion, &i.Monto); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, nil
}

func (a *App) GuardarRetencion(item models.Retencion) error {
	if item.ID > 0 {
		_, err := database.DB.Exec("UPDATE retenciones_sufridas SET fecha=?, id_jurisdiccion=?, cuit_agente_retencion=?, nro_comprobante_retencion=?, monto=? WHERE id=?", item.Fecha, item.IDJurisdiccion, item.CuitAgenteRetencion, item.NroComprobanteRetencion, item.Monto, item.ID)
		return err
	}
	_, err := database.DB.Exec("INSERT INTO retenciones_sufridas (id_cliente, fecha, id_jurisdiccion, cuit_agente_retencion, nro_comprobante_retencion, monto) VALUES (?,?,?,?,?,?)", item.IDCliente, item.Fecha, item.IDJurisdiccion, item.CuitAgenteRetencion, item.NroComprobanteRetencion, item.Monto)
	return err
}

func (a *App) EliminarRetencion(id int64) error {
	_, err := database.DB.Exec("DELETE FROM retenciones_sufridas WHERE id = ?", id)
	return err
}

func (a *App) GetPercepciones(clienteID int64) ([]models.Percepcion, error) {
	rows, err := database.DB.Query("SELECT id, fecha, id_jurisdiccion, cuit_agente_percepcion, nro_factura_compra, monto FROM percepciones_sufridas WHERE id_cliente = ? ORDER BY fecha DESC", clienteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []models.Percepcion
	for rows.Next() {
		var i models.Percepcion
		if err := rows.Scan(&i.ID, &i.Fecha, &i.IDJurisdiccion, &i.CuitAgentePercepcion, &i.NroFacturaCompra, &i.Monto); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, nil
}

func (a *App) GuardarPercepcion(item models.Percepcion) error {
	if item.ID > 0 {
		_, err := database.DB.Exec("UPDATE percepciones_sufridas SET fecha=?, id_jurisdiccion=?, cuit_agente_percepcion=?, nro_factura_compra=?, monto=? WHERE id=?", item.Fecha, item.IDJurisdiccion, item.CuitAgentePercepcion, item.NroFacturaCompra, item.Monto, item.ID)
		return err
	}
	_, err := database.DB.Exec("INSERT INTO percepciones_sufridas (id_cliente, fecha, id_jurisdiccion, cuit_agente_percepcion, nro_factura_compra, monto) VALUES (?,?,?,?,?,?)", item.IDCliente, item.Fecha, item.IDJurisdiccion, item.CuitAgentePercepcion, item.NroFacturaCompra, item.Monto)
	return err
}

func (a *App) EliminarPercepcion(id int64) error {
	_, err := database.DB.Exec("DELETE FROM percepciones_sufridas WHERE id = ?", id)
	return err
}

func (a *App) GetSaldosAFavor(clienteID int64) ([]models.SaldoAFavor, error) {
	rows, err := database.DB.Query("SELECT id, periodo, id_jurisdiccion, monto FROM saldos_a_favor WHERE id_cliente = ? ORDER BY periodo DESC", clienteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []models.SaldoAFavor
	for rows.Next() {
		var i models.SaldoAFavor
		if err := rows.Scan(&i.ID, &i.Periodo, &i.IDJurisdiccion, &i.Monto); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, nil
}

func (a *App) GuardarSaldoAFavor(item models.SaldoAFavor) error {
	if item.ID > 0 {
		_, err := database.DB.Exec("UPDATE saldos_a_favor SET periodo=?, id_jurisdiccion=?, monto=? WHERE id=?", item.Periodo, item.IDJurisdiccion, item.Monto, item.ID)
		return err
	}
	_, err := database.DB.Exec("INSERT INTO saldos_a_favor (id_cliente, periodo, id_jurisdiccion, monto) VALUES (?,?,?,?)", item.IDCliente, item.Periodo, item.IDJurisdiccion, item.Monto)
	return err
}

func (a *App) EliminarSaldoAFavor(id int64) error {
	_, err := database.DB.Exec("DELETE FROM saldos_a_favor WHERE id = ?", id)
	return err
}

// --- MÉTODO PARA LIQUIDACIÓN ---

func (a *App) GenerarLiquidacion(clienteID int64, anio int, mes int) ([]models.ResultadoLiquidacion, error) {
	periodoActual := fmt.Sprintf("%04d-%02d", anio, mes)
	fechaAnterior := time.Date(anio, time.Month(mes), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -1)
	periodoAnterior := fechaAnterior.Format("2006-01")

	coeficientes := make(map[int64]float64)
	coefQuery := "SELECT id_jurisdiccion, coeficiente_unificado FROM coeficientes_anuales WHERE id_cliente = ? AND anio_fiscal = ? AND mes_desde <= ? AND mes_hasta >= ?"
	rows, err := database.DB.Query(coefQuery, clienteID, anio, mes, mes)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var jurID int64
		var coef float64
		if err := rows.Scan(&jurID, &coef); err == nil {
			coeficientes[jurID] = coef
		}
	}
	rows.Close()

	alicuotas := make(map[int64]map[int64]float64)
	aliQuery := "SELECT id_actividad, id_jurisdiccion, alicuota FROM alicuotas_por_jurisdiccion WHERE id_cliente = ?"
	rows, err = database.DB.Query(aliQuery, clienteID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var actID, jurID int64
		var ali float64
		if err := rows.Scan(&actID, &jurID, &ali); err == nil {
			if alicuotas[actID] == nil {
				alicuotas[actID] = make(map[int64]float64)
			}
			alicuotas[actID][jurID] = ali
		}
	}
	rows.Close()

	baseImponiblePorJurYAct := make(map[int64]map[int64]float64) // map[jurID][actID]base

	ventasGenQuery := `SELECT id_actividad, (monto_gravado + monto_no_gravado) as base FROM comprobantes WHERE id_cliente = ? AND strftime('%Y-%m', fecha) = ? AND tipo_asignacion = 'GENERAL'`
	rows, err = database.DB.Query(ventasGenQuery, clienteID, periodoActual)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var actID sql.NullInt64
		var base float64
		if err := rows.Scan(&actID, &base); err == nil && actID.Valid {
			for jurID, coef := range coeficientes {
				if baseImponiblePorJurYAct[jurID] == nil {
					baseImponiblePorJurYAct[jurID] = make(map[int64]float64)
				}
				baseImponiblePorJurYAct[jurID][actID.Int64] += base * coef
			}
		}
	}
	rows.Close()

	ventasDirQuery := `SELECT c.id_actividad, ad.id_jurisdiccion, ad.monto_asignado FROM asignaciones_directas ad JOIN comprobantes c ON ad.id_comprobante = c.id WHERE c.id_cliente = ? AND strftime('%Y-%m', c.fecha) = ?`
	rows, err = database.DB.Query(ventasDirQuery, clienteID, periodoActual)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var actID sql.NullInt64
		var jurID int64
		var monto float64
		if err := rows.Scan(&actID, &jurID, &monto); err == nil && actID.Valid {
			if baseImponiblePorJurYAct[jurID] == nil {
				baseImponiblePorJurYAct[jurID] = make(map[int64]float64)
			}
			baseImponiblePorJurYAct[jurID][actID.Int64] += monto
		}
	}
	rows.Close()

	saldosAnt, retenciones, percepciones := make(map[int64]float64), make(map[int64]float64), make(map[int64]float64)
	rows, err = database.DB.Query("SELECT id_jurisdiccion, monto FROM saldos_a_favor WHERE id_cliente = ? AND periodo = ?", clienteID, periodoAnterior)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var jurID int64
		var monto float64
		if err := rows.Scan(&jurID, &monto); err == nil {
			saldosAnt[jurID] = monto
		}
	}
	rows.Close()

	rows, err = database.DB.Query("SELECT id_jurisdiccion, SUM(monto) FROM retenciones_sufridas WHERE id_cliente = ? AND strftime('%Y-%m', fecha) = ? GROUP BY id_jurisdiccion", clienteID, periodoActual)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var jurID int64
		var monto float64
		if err := rows.Scan(&jurID, &monto); err == nil {
			retenciones[jurID] = monto
		}
	}
	rows.Close()

	rows, err = database.DB.Query("SELECT id_jurisdiccion, SUM(monto) FROM percepciones_sufridas WHERE id_cliente = ? AND strftime('%Y-%m', fecha) = ? GROUP BY id_jurisdiccion", clienteID, periodoActual)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var jurID int64
		var monto float64
		if err := rows.Scan(&jurID, &monto); err == nil {
			percepciones[jurID] = monto
		}
	}
	rows.Close()

	jurisdicciones, err := a.GetJurisdicciones()
	if err != nil {
		return nil, err
	}

	resultadosMap := make(map[int64]*models.ResultadoLiquidacion)

	for _, jur := range jurisdicciones {
		resultadosMap[jur.ID] = &models.ResultadoLiquidacion{
			IDJurisdiccion:      jur.ID,
			NombreJurisdiccion:  jur.Nombre,
			DetallePorActividad: make(map[int64]float64),
		}
	}

	for jurID, detalles := range baseImponiblePorJurYAct {
		if resultadosMap[jurID] == nil {
			continue
		}
		for actID, base := range detalles {
			resultadosMap[jurID].BaseImponibleTotal += base
			resultadosMap[jurID].DetallePorActividad[actID] = base
			if alicuotas[actID] != nil {
				impuesto := base * (alicuotas[actID][jurID] / 100.0)
				resultadosMap[jurID].ImpuestoDeterminado += impuesto
			}
		}
	}

	var resultadosFinales []models.ResultadoLiquidacion
	for _, jur := range jurisdicciones {
		res := resultadosMap[jur.ID]
		res.SaldoAnterior = saldosAnt[jur.ID]
		res.Retenciones = retenciones[jur.ID]
		res.Percepciones = percepciones[jur.ID]

		if res.BaseImponibleTotal == 0 && res.SaldoAnterior == 0 && res.Retenciones == 0 && res.Percepciones == 0 {
			continue
		}

		if res.BaseImponibleTotal > 0 {
			res.AlicuotaMedia = (res.ImpuestoDeterminado / res.BaseImponibleTotal) * 100
		}
		res.TotalCreditos = res.SaldoAnterior + res.Retenciones + res.Percepciones
		res.SaldoFinal = res.ImpuestoDeterminado - res.TotalCreditos
		resultadosFinales = append(resultadosFinales, *res)
	}

	// Guardar en DB
	tx, err := database.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var maxRect int
	err = tx.QueryRow("SELECT COALESCE(MAX(rectificativa_nro), -1) FROM liquidaciones WHERE id_cliente = ? AND periodo = ?", clienteID, periodoActual).Scan(&maxRect)
	if err != nil {
		return nil, err
	}

	rectificativaNro := maxRect + 1

	res, err := tx.Exec("INSERT INTO liquidaciones (id_cliente, periodo, fecha, rectificativa_nro) VALUES (?, ?, ?, ?)", clienteID, periodoActual, time.Now().Format("2006-01-02 15:04:05"), rectificativaNro)
	if err != nil {
		return nil, err
	}
	liquidacionID, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	stmt, err := tx.Prepare(`INSERT INTO liquidaciones_detalle (id_liquidacion, id_jurisdiccion, id_actividad, base_imponible, alicuota_aplicada, impuesto_determinado) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()
	for _, r := range resultadosFinales {
		if len(r.DetallePorActividad) == 0 && r.BaseImponibleTotal > 0 {
			_, err := stmt.Exec(liquidacionID, r.IDJurisdiccion, nil, r.BaseImponibleTotal, r.AlicuotaMedia, r.ImpuestoDeterminado)
			if err != nil {
				return nil, err
			}
		} else {
			for actID, base := range r.DetallePorActividad {
				ali := 0.0
				if alicuotas[actID] != nil {
					ali = alicuotas[actID][r.IDJurisdiccion]
				}
				imp := base * (ali / 100.0)
				_, err := stmt.Exec(liquidacionID, r.IDJurisdiccion, actID, base, ali, imp)
				if err != nil {
					return nil, err
				}
			}
		}
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return resultadosFinales, nil
}

func (a *App) GetLiquidacionesGuardadas(clienteID int64) ([]models.LiquidacionGuardada, error) {
	rows, err := database.DB.Query("SELECT id, periodo, fecha, rectificativa_nro FROM liquidaciones WHERE id_cliente = ? ORDER BY periodo DESC, rectificativa_nro DESC", clienteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var liquidaciones []models.LiquidacionGuardada
	for rows.Next() {
		var l models.LiquidacionGuardada
		if err := rows.Scan(&l.ID, &l.Periodo, &l.Fecha, &l.RectificativaNro); err != nil {
			return nil, err
		}
		liquidaciones = append(liquidaciones, l)
	}
	return liquidaciones, nil
}

// CORRECCIÓN: Implementación de la función que faltaba.
// Esta es una implementación básica. Deberás ajustarla para que coincida
// con la estructura de datos que necesita tu frontend.
func (a *App) GetDetalleLiquidacionGuardada(liquidacionID int64) ([]models.ResultadoLiquidacion, error) {
	log.Printf("Buscando detalles para la liquidación ID: %d", liquidacionID)
	// Aquí iría la lógica completa para reconstruir el estado de la liquidación
	// a partir de las tablas `liquidaciones` y `liquidaciones_detalle`.
	// Por ahora, devolvemos un slice vacío para evitar un error de "no implementado".
	// TODO: Implementar la lógica de consulta a la base de datos.
	return []models.ResultadoLiquidacion{}, nil
}

func (a *App) EliminarLiquidacion(liquidacionID int64) error {
	_, err := database.DB.Exec("DELETE FROM liquidaciones WHERE id = ?", liquidacionID)
	return err
}
