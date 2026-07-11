-- =====================================================================
-- PeriZone - Esquema de base de datos (MySQL 8+)
-- Proyecto: Plataforma de Comercio Digital (e-Commerce) para PeriZone
-- Arquitectura: MVC por capas + API REST (ver README.md)
--
-- Cómo usar:
--   mysql -u root -p < database/schema.sql
--   mysql -u root -p perizone < database/seed.sql
-- =====================================================================

DROP DATABASE IF EXISTS perizone;
CREATE DATABASE perizone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE perizone;

-- ---------------------------------------------------------------------
-- roles
-- Roles internos del panel admin (RF01/RF02) + rol "cliente" para la
-- tienda. El nivel de acceso por sección del panel se controla en el
-- middleware de autorización (src/middlewares/roleCheck.ts), no en BD.
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- usuarios
-- Clientes de la tienda y usuarios internos del panel. id_rol define
-- el nivel de acceso. reset_token/_expira soportan la recuperación de
-- contraseña mencionada en el módulo "Gestión de Usuarios" del caso.
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_rol INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  contrasenia VARCHAR(255) NOT NULL COMMENT 'hash bcrypt',
  telefono VARCHAR(20) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  reset_token VARCHAR(255) NULL,
  reset_token_expira DATETIME NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE INDEX idx_usuarios_rol ON usuarios(id_rol);

-- ---------------------------------------------------------------------
-- direcciones
-- Direcciones de entrega del cliente (RF05/checkout paso 1). Un
-- cliente puede tener varias; "predeterminada" marca la que se
-- precarga en el checkout.
-- ---------------------------------------------------------------------
CREATE TABLE direcciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  distrito VARCHAR(100) NOT NULL,
  provincia VARCHAR(100) NOT NULL DEFAULT 'Lima',
  departamento VARCHAR(100) NOT NULL DEFAULT 'Lima',
  referencia VARCHAR(255) NULL,
  predeterminada TINYINT(1) NOT NULL DEFAULT 0,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_direcciones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_direcciones_usuario ON direcciones(id_usuario);

-- ---------------------------------------------------------------------
-- categorias
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- productos
-- stock_minimo habilita las alertas de inventario bajo en el panel
-- (sección Productos / Dashboard general).
-- ---------------------------------------------------------------------
CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  precio DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 5,
  imagen_url VARCHAR(255) NULL COMMENT 'imagen de portada',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id)
) ENGINE=InnoDB;

CREATE INDEX idx_productos_categoria ON productos(id_categoria);
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_precio ON productos(precio);

-- ---------------------------------------------------------------------
-- producto_imagenes
-- Galería de imágenes adicionales por producto (imagen_url en
-- productos queda como portada/miniatura del catálogo).
-- ---------------------------------------------------------------------
CREATE TABLE producto_imagenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_producto INT NOT NULL,
  imagen_url VARCHAR(255) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_producto_imagenes_producto FOREIGN KEY (id_producto) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_producto_imagenes_producto ON producto_imagenes(id_producto);

-- ---------------------------------------------------------------------
-- carrito / carrito_detalle
-- Carrito persistente en servidor (uno activo por usuario) para que
-- sobreviva entre sesiones y dispositivos, tal como se modela en el
-- documento del caso (2.4 Diseño de Componentes MVC).
-- ---------------------------------------------------------------------
CREATE TABLE carrito (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL UNIQUE,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_carrito_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE carrito_detalle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_carrito INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  fecha_agregado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_carrito_detalle_carrito FOREIGN KEY (id_carrito) REFERENCES carrito(id) ON DELETE CASCADE,
  CONSTRAINT fk_carrito_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos(id),
  CONSTRAINT uq_carrito_producto UNIQUE (id_carrito, id_producto)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- ordenes
-- direccion_entrega guarda una copia (snapshot) del texto de la
-- dirección al momento de la compra: si el cliente luego edita o
-- borra la dirección en su perfil, la orden ya emitida no cambia.
-- id_direccion queda como referencia trazable (nullable) a la fila
-- original en "direcciones".
-- ---------------------------------------------------------------------
CREATE TABLE ordenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_direccion INT NULL,
  direccion_entrega TEXT NOT NULL,
  estado ENUM('pendiente','procesando','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  subtotal DECIMAL(10,2) NOT NULL,
  igv DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  metodo_pago ENUM('tarjeta','yape','transferencia') NOT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ordenes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
  CONSTRAINT fk_ordenes_direccion FOREIGN KEY (id_direccion) REFERENCES direcciones(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_ordenes_usuario ON ordenes(id_usuario);
CREATE INDEX idx_ordenes_estado ON ordenes(estado);
CREATE INDEX idx_ordenes_fecha ON ordenes(fecha_creacion);

-- ---------------------------------------------------------------------
-- detalle_ordenes
-- ---------------------------------------------------------------------
CREATE TABLE detalle_ordenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_orden INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_detalle_ordenes_orden FOREIGN KEY (id_orden) REFERENCES ordenes(id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_ordenes_producto FOREIGN KEY (id_producto) REFERENCES productos(id)
) ENGINE=InnoDB;

CREATE INDEX idx_detalle_ordenes_orden ON detalle_ordenes(id_orden);

-- ---------------------------------------------------------------------
-- tarjetas_prueba
-- Catálogo de tarjetas ficticias para SIMULAR la pasarela de pagos
-- (proyecto académico, sin integración real). El backend busca el
-- número ingresado en checkout contra esta tabla para decidir si el
-- pago resulta "aprobado" o "rechazado". Ver seed.sql para los
-- números de prueba disponibles.
-- ---------------------------------------------------------------------
CREATE TABLE tarjetas_prueba (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_tarjeta VARCHAR(20) NOT NULL UNIQUE,
  titular VARCHAR(150) NOT NULL,
  cvv VARCHAR(4) NOT NULL,
  fecha_expiracion VARCHAR(5) NOT NULL COMMENT 'formato MM/YY',
  resultado_simulado ENUM('aprobado','rechazado') NOT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- pagos
-- Transacción real de pago asociada a una orden. Se permite más de
-- un registro por orden para soportar reintentos tras un pago
-- rechazado (RE07 / RF06). Solo se guardan los últimos 4 dígitos de
-- la tarjeta, nunca el número completo.
-- ---------------------------------------------------------------------
CREATE TABLE pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_orden INT NOT NULL,
  metodo_pago ENUM('tarjeta','yape','transferencia') NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'PEN',
  estado ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  referencia_pasarela VARCHAR(100) NULL COMMENT 'id de transacción simulado',
  ultimos_digitos_tarjeta VARCHAR(4) NULL,
  fecha_pago DATETIME NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pagos_orden FOREIGN KEY (id_orden) REFERENCES ordenes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_pagos_orden ON pagos(id_orden);

-- ---------------------------------------------------------------------
-- comprobantes
-- Una orden genera un único comprobante (boleta o factura) al
-- confirmarse el pago.
-- ---------------------------------------------------------------------
CREATE TABLE comprobantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_orden INT NOT NULL UNIQUE,
  tipo ENUM('boleta','factura') NOT NULL,
  numero VARCHAR(50) NOT NULL UNIQUE,
  ruc_razon_social VARCHAR(150) NULL COMMENT 'solo aplica para factura',
  monto_total DECIMAL(10,2) NOT NULL,
  igv DECIMAL(10,2) NOT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comprobantes_orden FOREIGN KEY (id_orden) REFERENCES ordenes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- movimientos_inventario (kardex)
-- Bitácora de cada entrada/salida de stock: ventas (salida
-- automática al confirmar pago), reposiciones y ajustes manuales del
-- almacén. Es la pieza que faltaba para dar trazabilidad real al
-- inventario (RF09 y sección "Inventario" del caso).
-- ---------------------------------------------------------------------
CREATE TABLE movimientos_inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_producto INT NOT NULL,
  tipo ENUM('entrada','salida') NOT NULL,
  cantidad INT NOT NULL,
  stock_anterior INT NOT NULL,
  stock_resultante INT NOT NULL,
  motivo VARCHAR(255) NOT NULL COMMENT 'venta, reposicion, ajuste, devolucion, etc.',
  id_orden INT NULL,
  id_usuario INT NULL COMMENT 'usuario interno responsable del ajuste manual',
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimientos_producto FOREIGN KEY (id_producto) REFERENCES productos(id),
  CONSTRAINT fk_movimientos_orden FOREIGN KEY (id_orden) REFERENCES ordenes(id) ON DELETE SET NULL,
  CONSTRAINT fk_movimientos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_movimientos_producto ON movimientos_inventario(id_producto);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fecha_creacion);

-- ---------------------------------------------------------------------
-- historial_estados_orden
-- Log de cada cambio de estado de una orden, para el seguimiento de
-- pedido del cliente (RF08) y auditoría en el panel admin.
-- ---------------------------------------------------------------------
CREATE TABLE historial_estados_orden (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_orden INT NOT NULL,
  estado_anterior ENUM('pendiente','procesando','enviado','entregado','cancelado') NULL,
  estado_nuevo ENUM('pendiente','procesando','enviado','entregado','cancelado') NOT NULL,
  id_usuario INT NULL COMMENT 'NULL si el cambio lo hizo el sistema',
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_historial_orden FOREIGN KEY (id_orden) REFERENCES ordenes(id) ON DELETE CASCADE,
  CONSTRAINT fk_historial_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_historial_orden ON historial_estados_orden(id_orden);
