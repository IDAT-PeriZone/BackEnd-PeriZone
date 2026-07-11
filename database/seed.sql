-- =====================================================================
-- PeriZone - Datos de prueba
-- Ejecutar DESPUÉS de database/schema.sql:
--   mysql -u root -p perizone < database/seed.sql
--
-- Credenciales de todos los usuarios de prueba (login):
--   contraseña para TODOS: Perizone123!
--   (el hash de abajo es bcrypt de ese texto plano)
-- =====================================================================

USE perizone;

-- ---------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------
INSERT INTO roles (id, nombre) VALUES
  (1, 'administrador'),
  (2, 'finanzas'),
  (3, 'almacen'),
  (4, 'marketing'),
  (5, 'cliente');

-- ---------------------------------------------------------------------
-- usuarios (4 internos del panel + 2 clientes)
-- ---------------------------------------------------------------------
INSERT INTO usuarios (id, id_rol, nombre, apellido, correo, contrasenia, telefono, activo) VALUES
  (1, 1, 'Alexander', 'Navas',   'admin@perizone.com',     '$2b$10$o5SXjJ13mylPZFfpnX7DQe7qF/1Er7VwrahqwfsbiwuqXsKMJaHhW', '999111222', 1),
  (2, 2, 'Danny',     'Relaiza', 'finanzas@perizone.com',  '$2b$10$o5SXjJ13mylPZFfpnX7DQe7qF/1Er7VwrahqwfsbiwuqXsKMJaHhW', '999111333', 1),
  (3, 3, 'Jannett',   'Toledo',  'almacen@perizone.com',   '$2b$10$o5SXjJ13mylPZFfpnX7DQe7qF/1Er7VwrahqwfsbiwuqXsKMJaHhW', '999111444', 1),
  (4, 4, 'Alexander', 'Rivera',  'marketing@perizone.com', '$2b$10$o5SXjJ13mylPZFfpnX7DQe7qF/1Er7VwrahqwfsbiwuqXsKMJaHhW', '999111555', 1),
  (5, 5, 'Juan',       'Perez',  'juan.perez@example.com', '$2b$10$o5SXjJ13mylPZFfpnX7DQe7qF/1Er7VwrahqwfsbiwuqXsKMJaHhW', '988222111', 1),
  (6, 5, 'Maria',      'Lopez',  'maria.lopez@example.com','$2b$10$o5SXjJ13mylPZFfpnX7DQe7qF/1Er7VwrahqwfsbiwuqXsKMJaHhW', '988222222', 1);

-- ---------------------------------------------------------------------
-- direcciones
-- ---------------------------------------------------------------------
INSERT INTO direcciones (id, id_usuario, direccion, distrito, provincia, departamento, referencia, predeterminada) VALUES
  (1, 5, 'Av. Los Alamos 123', 'Surco', 'Lima', 'Lima', 'Frente al parque central', 1),
  (2, 6, 'Jr. Las Gaviotas 456', 'San Miguel', 'Lima', 'Lima', 'Edificio azul, dpto 302', 1);

-- ---------------------------------------------------------------------
-- categorias
-- ---------------------------------------------------------------------
INSERT INTO categorias (id, nombre, descripcion) VALUES
  (1, 'Teclados', 'Teclados mecánicos y de membrana para uso gamer y de oficina.'),
  (2, 'Mouses', 'Mouses alámbricos e inalámbricos para gaming y productividad.'),
  (3, 'Headsets', 'Audífonos y diademas con micrófono para gaming y llamadas.'),
  (4, 'Webcams', 'Cámaras web para streaming, videollamadas y contenido.'),
  (5, 'Monitores', 'Monitores gamer y de uso general en distintos tamaños.'),
  (6, 'Accesorios Gamer', 'Mousepads, soportes y complementos para setup gamer.');

-- ---------------------------------------------------------------------
-- productos
-- Nota: el stock ya refleja los movimientos de kardex simulados más
-- abajo (una venta y una reposición), por eso no coincide 1:1 con el
-- "stock inicial" narrado en los comentarios de movimientos_inventario.
-- ---------------------------------------------------------------------
INSERT INTO productos (id, id_categoria, nombre, descripcion, precio, stock, stock_minimo, imagen_url, activo) VALUES
  (1, 1, 'Teclado Mecánico RGB Redragon K552', 'Switches azules, retroiluminación RGB, formato TKL.', 149.90, 38, 10, 'https://picsum.photos/seed/perizone-teclado1/600/600', 1),
  (2, 1, 'Teclado Inalámbrico Logitech K380', 'Conexión Bluetooth multi-dispositivo, perfil bajo.', 129.90, 25, 10, 'https://picsum.photos/seed/perizone-teclado2/600/600', 1),
  (3, 2, 'Mouse Gamer Logitech G203', 'Sensor óptico 8000 DPI, iluminación RGB.', 79.90, 59, 15, 'https://picsum.photos/seed/perizone-mouse1/600/600', 1),
  (4, 2, 'Mouse Inalámbrico HP 235', 'Mouse silencioso con receptor USB nano.', 49.90, 3, 10, 'https://picsum.photos/seed/perizone-mouse2/600/600', 1),
  (5, 3, 'Headset HyperX Cloud Stinger', 'Diadema ligera con micrófono abatible.', 219.90, 20, 8, 'https://picsum.photos/seed/perizone-headset1/600/600', 1),
  (6, 3, 'Audífonos Gamer Redragon Zeus', 'Sonido envolvente 7.1 virtual, USB.', 189.90, 15, 8, 'https://picsum.photos/seed/perizone-headset2/600/600', 1),
  (7, 4, 'Webcam Logitech C920', 'Full HD 1080p con corrección automática de luz.', 259.90, 12, 5, 'https://picsum.photos/seed/perizone-webcam1/600/600', 1),
  (8, 4, 'Webcam Genérica HD 720p', 'Webcam básica con micrófono integrado.', 69.90, 30, 10, 'https://picsum.photos/seed/perizone-webcam2/600/600', 1),
  (9, 5, 'Monitor Gamer AOC 24" 165Hz', 'Panel VA, 1ms, FreeSync Premium.', 799.90, 10, 4, 'https://picsum.photos/seed/perizone-monitor1/600/600', 1),
  (10, 5, 'Monitor LG 22" Full HD', 'Panel IPS, bordes delgados.', 549.90, 18, 5, 'https://picsum.photos/seed/perizone-monitor2/600/600', 1),
  (11, 6, 'Mousepad Gamer XL', 'Superficie de tela, base antideslizante, 80x30cm.', 39.90, 50, 15, 'https://picsum.photos/seed/perizone-pad/600/600', 1),
  (12, 6, 'Soporte para Audífonos', 'Base de aluminio con diseño antideslizante.', 29.90, 45, 15, 'https://picsum.photos/seed/perizone-stand/600/600', 1);

-- ---------------------------------------------------------------------
-- producto_imagenes (galería adicional de algunos productos)
-- ---------------------------------------------------------------------
INSERT INTO producto_imagenes (id_producto, imagen_url, orden) VALUES
  (1, 'https://picsum.photos/seed/perizone-teclado1-b/600/600', 1),
  (1, 'https://picsum.photos/seed/perizone-teclado1-c/600/600', 2),
  (9, 'https://picsum.photos/seed/perizone-monitor1-b/600/600', 1);

-- ---------------------------------------------------------------------
-- tarjetas_prueba
-- Catálogo de tarjetas ficticias para simular la pasarela de pagos.
-- Úsalas en el body de POST /api/ordenes/:id/pagar para probar los
-- dos flujos (aprobado / rechazado) sin integrar un gateway real.
-- ---------------------------------------------------------------------
INSERT INTO tarjetas_prueba (numero_tarjeta, titular, cvv, fecha_expiracion, resultado_simulado) VALUES
  ('4111111111111111', 'APRO TEST', '123', '12/28', 'aprobado'),
  ('5500000000000004', 'APRO TEST MASTER', '456', '11/27', 'aprobado'),
  ('4000000000000002', 'FONDS TEST', '789', '10/26', 'rechazado'),
  ('4000000000000127', 'CALL TEST', '321', '09/26', 'rechazado');

-- ---------------------------------------------------------------------
-- Orden de ejemplo ya completada: Juan Perez compra 2 teclados y 1
-- mouse, paga con la tarjeta de prueba aprobada, y la orden avanza
-- hasta "entregado".
-- ---------------------------------------------------------------------
INSERT INTO ordenes (id, id_usuario, id_direccion, direccion_entrega, estado, subtotal, igv, total, metodo_pago) VALUES
  (1, 5, 1, 'Av. Los Alamos 123, Surco, Lima (Ref: Frente al parque central)', 'entregado', 379.70, 68.35, 448.05, 'tarjeta');

INSERT INTO detalle_ordenes (id_orden, id_producto, cantidad, precio_unitario, subtotal) VALUES
  (1, 1, 2, 149.90, 299.80),
  (1, 3, 1, 79.90, 79.90);

INSERT INTO pagos (id_orden, metodo_pago, monto, moneda, estado, referencia_pasarela, ultimos_digitos_tarjeta, fecha_pago) VALUES
  (1, 'tarjeta', 448.05, 'PEN', 'aprobado', 'SIM-0001', '1111', NOW());

INSERT INTO comprobantes (id_orden, tipo, numero, ruc_razon_social, monto_total, igv) VALUES
  (1, 'boleta', 'B001-00000001', NULL, 448.05, 68.35);

-- Historial de estados: pendiente -> procesando -> enviado -> entregado
INSERT INTO historial_estados_orden (id_orden, estado_anterior, estado_nuevo, id_usuario) VALUES
  (1, NULL, 'pendiente', NULL),
  (1, 'pendiente', 'procesando', 1),
  (1, 'procesando', 'enviado', 3),
  (1, 'enviado', 'entregado', 3);

-- Kardex: salida de stock por la venta anterior + una reposición
-- manual de almacén sobre la webcam genérica.
INSERT INTO movimientos_inventario (id_producto, tipo, cantidad, stock_anterior, stock_resultante, motivo, id_orden, id_usuario) VALUES
  (1, 'salida', 2, 40, 38, 'venta', 1, NULL),
  (3, 'salida', 1, 60, 59, 'venta', 1, NULL),
  (8, 'entrada', 10, 20, 30, 'reposicion', NULL, 3);

-- ---------------------------------------------------------------------
-- Carrito activo de ejemplo: Maria Lopez tiene 2 productos guardados
-- que todavía no ha llevado a checkout.
-- ---------------------------------------------------------------------
INSERT INTO carrito (id, id_usuario) VALUES (1, 6);

INSERT INTO carrito_detalle (id_carrito, id_producto, cantidad) VALUES
  (1, 5, 1),
  (1, 9, 1);
