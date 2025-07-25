export namespace models {
	
	export class Actividad {
	    id: number;
	    codigo_actividad: string;
	    descripcion: string;
	
	    static createFrom(source: any = {}) {
	        return new Actividad(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.codigo_actividad = source["codigo_actividad"];
	        this.descripcion = source["descripcion"];
	    }
	}
	export class AsignacionDirecta {
	    id_comprobante: number;
	    id_jurisdiccion: number;
	    monto_asignado: number;
	
	    static createFrom(source: any = {}) {
	        return new AsignacionDirecta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id_comprobante = source["id_comprobante"];
	        this.id_jurisdiccion = source["id_jurisdiccion"];
	        this.monto_asignado = source["monto_asignado"];
	    }
	}
	export class Cliente {
	    id: number;
	    razon_social: string;
	    cuit: string;
	    fecha_alta: string;
	
	    static createFrom(source: any = {}) {
	        return new Cliente(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.razon_social = source["razon_social"];
	        this.cuit = source["cuit"];
	        this.fecha_alta = source["fecha_alta"];
	    }
	}
	export class CoeficienteResumen {
	    mes_desde: number;
	    mes_hasta: number;
	    suma: number;
	
	    static createFrom(source: any = {}) {
	        return new CoeficienteResumen(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mes_desde = source["mes_desde"];
	        this.mes_hasta = source["mes_hasta"];
	        this.suma = source["suma"];
	    }
	}
	export class Comprobante {
	    id: number;
	    id_cliente: number;
	    fecha: string;
	    tipo_comprobante: string;
	    punto_venta: number;
	    numero: number;
	    cuit_cliente: string;
	    razon_social_cliente: string;
	    monto_gravado: number;
	    monto_no_gravado: number;
	    importe_total: number;
	    id_actividad?: number;
	    tipo_asignacion: string;
	
	    static createFrom(source: any = {}) {
	        return new Comprobante(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.id_cliente = source["id_cliente"];
	        this.fecha = source["fecha"];
	        this.tipo_comprobante = source["tipo_comprobante"];
	        this.punto_venta = source["punto_venta"];
	        this.numero = source["numero"];
	        this.cuit_cliente = source["cuit_cliente"];
	        this.razon_social_cliente = source["razon_social_cliente"];
	        this.monto_gravado = source["monto_gravado"];
	        this.monto_no_gravado = source["monto_no_gravado"];
	        this.importe_total = source["importe_total"];
	        this.id_actividad = source["id_actividad"];
	        this.tipo_asignacion = source["tipo_asignacion"];
	    }
	}
	export class ComprobanteFull {
	    comprobante: Comprobante;
	    asignaciones: AsignacionDirecta[];
	
	    static createFrom(source: any = {}) {
	        return new ComprobanteFull(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.comprobante = this.convertValues(source["comprobante"], Comprobante);
	        this.asignaciones = this.convertValues(source["asignaciones"], AsignacionDirecta);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Jurisdiccion {
	    id: number;
	    codigo_comarb: string;
	    nombre: string;
	
	    static createFrom(source: any = {}) {
	        return new Jurisdiccion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.codigo_comarb = source["codigo_comarb"];
	        this.nombre = source["nombre"];
	    }
	}
	export class LiquidacionGuardada {
	    id: number;
	    id_cliente: number;
	    periodo: string;
	    fecha: string;
	    rectificativa_nro: number;
	
	    static createFrom(source: any = {}) {
	        return new LiquidacionGuardada(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.id_cliente = source["id_cliente"];
	        this.periodo = source["periodo"];
	        this.fecha = source["fecha"];
	        this.rectificativa_nro = source["rectificativa_nro"];
	    }
	}
	export class Percepcion {
	    id: number;
	    id_cliente: number;
	    fecha: string;
	    id_jurisdiccion: number;
	    cuit_agente_percepcion: string;
	    nro_factura_compra: string;
	    monto: number;
	
	    static createFrom(source: any = {}) {
	        return new Percepcion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.id_cliente = source["id_cliente"];
	        this.fecha = source["fecha"];
	        this.id_jurisdiccion = source["id_jurisdiccion"];
	        this.cuit_agente_percepcion = source["cuit_agente_percepcion"];
	        this.nro_factura_compra = source["nro_factura_compra"];
	        this.monto = source["monto"];
	    }
	}
	export class ResultadoLiquidacion {
	    id_jurisdiccion: number;
	    nombre_jurisdiccion: string;
	    base_imponible_total: number;
	    detalle_por_actividad: Record<number, number>;
	    alicuota_media: number;
	    impuesto_determinado: number;
	    saldo_anterior: number;
	    retenciones: number;
	    percepciones: number;
	    total_creditos: number;
	    saldo_final: number;
	
	    static createFrom(source: any = {}) {
	        return new ResultadoLiquidacion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id_jurisdiccion = source["id_jurisdiccion"];
	        this.nombre_jurisdiccion = source["nombre_jurisdiccion"];
	        this.base_imponible_total = source["base_imponible_total"];
	        this.detalle_por_actividad = source["detalle_por_actividad"];
	        this.alicuota_media = source["alicuota_media"];
	        this.impuesto_determinado = source["impuesto_determinado"];
	        this.saldo_anterior = source["saldo_anterior"];
	        this.retenciones = source["retenciones"];
	        this.percepciones = source["percepciones"];
	        this.total_creditos = source["total_creditos"];
	        this.saldo_final = source["saldo_final"];
	    }
	}
	export class Retencion {
	    id: number;
	    id_cliente: number;
	    fecha: string;
	    id_jurisdiccion: number;
	    cuit_agente_retencion: string;
	    nro_comprobante_retencion: string;
	    monto: number;
	
	    static createFrom(source: any = {}) {
	        return new Retencion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.id_cliente = source["id_cliente"];
	        this.fecha = source["fecha"];
	        this.id_jurisdiccion = source["id_jurisdiccion"];
	        this.cuit_agente_retencion = source["cuit_agente_retencion"];
	        this.nro_comprobante_retencion = source["nro_comprobante_retencion"];
	        this.monto = source["monto"];
	    }
	}
	export class SaldoAFavor {
	    id: number;
	    id_cliente: number;
	    periodo: string;
	    id_jurisdiccion: number;
	    monto: number;
	
	    static createFrom(source: any = {}) {
	        return new SaldoAFavor(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.id_cliente = source["id_cliente"];
	        this.periodo = source["periodo"];
	        this.id_jurisdiccion = source["id_jurisdiccion"];
	        this.monto = source["monto"];
	    }
	}

}

