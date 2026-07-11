// Tipos compartidos entre modelos y controladores. Reflejan 1:1 las
// tablas definidas en database/schema.sql.

export type RolNombre = 'administrador' | 'finanzas' | 'almacen' | 'marketing' | 'cliente';

export type EstadoOrden = 'pendiente' | 'procesando' | 'enviado' | 'entregado' | 'cancelado';
export type MetodoPago = 'tarjeta' | 'yape' | 'transferencia';
export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado';
export type TipoComprobante = 'boleta' | 'factura';
export type TipoMovimiento = 'entrada' | 'salida';

export interface Rol {
  id: number;
  nombre: RolNombre;
  fecha_creacion: Date;
}

export interface Usuario {
  id: number;
  id_rol: number;
  nombre: string;
  apellido: string;
  correo: string;
  contrasenia: string;
  telefono: string | null;
  activo: number;
  reset_token: string | null;
  reset_token_expira: Date | null;
  fecha_creacion: Date;
}

/** Usuario sin campos sensibles, seguro para devolver en las respuestas de la API. */
export type UsuarioPublico = Omit<Usuario, 'contrasenia' | 'reset_token' | 'reset_token_expira'>;

export interface Direccion {
  id: number;
  id_usuario: number;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  referencia: string | null;
  predeterminada: number;
  fecha_creacion: Date;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  fecha_creacion: Date;
}

export interface Producto {
  id: number;
  id_categoria: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  stock_minimo: number;
  imagen_url: string | null;
  activo: number;
  fecha_creacion: Date;
}

export interface ProductoImagen {
  id: number;
  id_producto: number;
  imagen_url: string;
  orden: number;
}

export interface Carrito {
  id: number;
  id_usuario: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface CarritoDetalle {
  id: number;
  id_carrito: number;
  id_producto: number;
  cantidad: number;
  fecha_agregado: Date;
}

export interface Orden {
  id: number;
  id_usuario: number;
  id_direccion: number | null;
  direccion_entrega: string;
  estado: EstadoOrden;
  subtotal: number;
  igv: number;
  total: number;
  metodo_pago: MetodoPago;
  fecha_creacion: Date;
}

export interface DetalleOrden {
  id: number;
  id_orden: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  fecha_creacion: Date;
}

export interface TarjetaPrueba {
  id: number;
  numero_tarjeta: string;
  titular: string;
  cvv: string;
  fecha_expiracion: string;
  resultado_simulado: 'aprobado' | 'rechazado';
}

export interface Pago {
  id: number;
  id_orden: number;
  metodo_pago: MetodoPago;
  monto: number;
  moneda: string;
  estado: EstadoPago;
  referencia_pasarela: string | null;
  ultimos_digitos_tarjeta: string | null;
  fecha_pago: Date | null;
  fecha_creacion: Date;
}

export interface Comprobante {
  id: number;
  id_orden: number;
  tipo: TipoComprobante;
  numero: string;
  ruc_razon_social: string | null;
  monto_total: number;
  igv: number;
  fecha_creacion: Date;
}

export interface MovimientoInventario {
  id: number;
  id_producto: number;
  tipo: TipoMovimiento;
  cantidad: number;
  stock_anterior: number;
  stock_resultante: number;
  motivo: string;
  id_orden: number | null;
  id_usuario: number | null;
  fecha_creacion: Date;
}

export interface HistorialEstadoOrden {
  id: number;
  id_orden: number;
  estado_anterior: EstadoOrden | null;
  estado_nuevo: EstadoOrden;
  id_usuario: number | null;
  fecha_creacion: Date;
}

/** Payload que se firma dentro del JWT (ver src/utils/jwt.ts). */
export interface JwtPayload {
  id: number;
  correo: string;
  rol: RolNombre;
}
