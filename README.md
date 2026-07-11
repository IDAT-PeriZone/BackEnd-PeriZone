# PeriZone — Backend

API REST para la plataforma de comercio digital (e-commerce) de PeriZone: catálogo de periféricos, carrito, checkout con pago simulado, comprobantes, control de inventario (kardex) y panel administrativo por roles.

Proyecto académico — IDAT, Proyecto Integración de los Componentes de las Capas de Datos, Negocio y Vista.

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework HTTP | Express 5 |
| Base de datos | MySQL 8 (driver `mysql2`) |
| Autenticación | JWT (`jsonwebtoken`) + hash de contraseña (`bcryptjs`) |
| Arquitectura | MVC por capas + API REST |

## Estructura de carpetas

```
src/
  config/db.ts          # pool de conexión a MySQL
  types/                # interfaces TS compartidas (1:1 con las tablas)
  models/                # capa de acceso a datos (SQL crudo vía mysql2)
  controllers/           # lógica de negocio de cada módulo
  routes/                # definición de endpoints Express por módulo
  middlewares/           # auth (JWT), roleCheck, asyncHandler, errorHandler
  utils/                 # jwt, respuestas HTTP uniformes, CSV, cálculo de IGV
  index.ts               # bootstrap: monta todos los routers
database/
  schema.sql             # DDL completo (crea la BD y las tablas)
  seed.sql                # datos de prueba (usuarios, catálogo, tarjetas de prueba, una orden completa)
postman/
  PeriZone.postman_collection.json
  PeriZone.postman_environment.json
```

Cada módulo sigue el mismo patrón: `routes/<modulo>.routes.ts` → `controllers/<modulo>.controller.ts` → `models/<modulo>.model.ts`.

## 1. Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env` con tus credenciales de MySQL si no usas las de por defecto:

```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=perizone
JWT_SECRET=cambia_este_secreto_en_produccion
JWT_EXPIRES_IN=8h
```

## 2. Levantar la base de datos

```bash
mysql -u root -p < database/schema.sql   # crea la BD "perizone" y las 15 tablas
mysql -u root -p perizone < database/seed.sql   # datos de prueba (opcional pero recomendado)
```

`schema.sql` hace `DROP DATABASE IF EXISTS perizone` al inicio, así que puedes volver a correrlo cuantas veces necesites para resetear todo desde cero.

## 3. Correr el proyecto

```bash
npm run dev     # desarrollo, con recarga automática (nodemon + ts-node)
npm run build   # compila TS -> dist/
npm start       # corre la versión compilada (dist/index.js)
```

El servidor queda disponible en `http://localhost:3000`.

## 4. Modelo de datos: por qué estas tablas

El esquema **no sigue "una tabla por requerimiento funcional"** — modela las entidades del negocio (usuario, producto, orden, etc.), y varios requerimientos comparten la misma entidad. Sobre el diccionario de datos inicial del caso de estudio se agregaron las piezas que faltaban para cubrir todos los RF:

| Tabla agregada | Por qué |
|---|---|
| `movimientos_inventario` (kardex) | Trazabilidad de cada entrada/salida de stock (ventas, reposiciones, cancelaciones, ajustes manuales) — RF09. |
| `pagos` | Registro real de la transacción (estado, referencia, últimos 4 dígitos), separado del simple ENUM `metodo_pago` de `ordenes` — RF06. |
| `tarjetas_prueba` | Catálogo de tarjetas ficticias para **simular** la pasarela de pago sin integrar un gateway real (ver sección 6). |
| `historial_estados_orden` | Log de cada cambio de estado de una orden, para el seguimiento del pedido — RF08. |
| `direcciones` | Reemplaza el campo único `direccion` en `usuarios`: un cliente puede guardar varias direcciones. |
| `carrito` / `carrito_detalle` | Carrito persistente en servidor (uno por usuario) en vez de vivir solo en el cliente. |
| `producto_imagenes` | Galería de imágenes adicionales por producto (el catálogo mostraba "imágenes" en plural). |
| `usuarios.reset_token` / `reset_token_expira` | Soporta recuperación de contraseña. |

`ordenes.direccion_entrega` guarda una **copia (snapshot)** del texto de la dirección al momento de la compra — si el cliente después edita o borra esa dirección, la orden ya generada no cambia. `ordenes.id_direccion` queda como referencia trazable, nullable (`ON DELETE SET NULL`).

## 5. Autenticación y roles

Login devuelve un JWT con `{ id, correo, rol }`. Envíalo en cada request protegido:

```
Authorization: Bearer <token>
```

Roles: `administrador`, `finanzas`, `almacen`, `marketing` (panel interno) y `cliente` (tienda). El registro público (`POST /api/auth/registro`) siempre crea un `cliente`; los usuarios internos los crea un administrador desde `POST /api/usuarios`.

Matriz de acceso por sección del panel:

| Sección | administrador | finanzas | almacen | marketing |
|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Usuarios | ✓ | – | – | ✓ |
| Órdenes | ✓ | ✓ | ✓ | – |
| Productos | ✓ | – | ✓ | – |
| Reportes | ✓ | ✓ | – | ✓ |

## 6. Simulación de pasarela de pagos

Este proyecto **no integra ninguna pasarela real** (Mercado Pago, Culqi, etc.) — es un entorno académico. En su lugar, `POST /api/ordenes` compara el `numero_tarjeta` recibido contra la tabla `tarjetas_prueba` (ver `database/seed.sql`):

| Número de tarjeta | Resultado simulado |
|---|---|
| `4111111111111111` | aprobado |
| `5500000000000004` | aprobado |
| `4000000000000002` | rechazado |
| `4000000000000127` | rechazado |
| cualquier otro número | rechazado (tarjeta no reconocida) |

Para `yape` o `transferencia` el pago se aprueba automáticamente (confirmación instantánea simulada); para forzar un rechazo y probar ese flujo, envía `"simular_rechazo": true` en el body.

Si el pago es rechazado, **no se escribe nada en la base de datos** (ni orden, ni detalle, ni movimiento de stock): el carrito queda intacto y el cliente puede reintentar. Si es aprobado, en una sola transacción se crea la orden, se descuenta el stock (con su movimiento de kardex), se genera el comprobante (boleta o factura si envías `ruc_razon_social`) y se vacía el carrito.

## 7. Resumen de endpoints

Todas las respuestas siguen el formato `{ success: boolean, data | message }`.

### Auth — `/api/auth`
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/registro` | No | RF01 — registra un cliente |
| POST | `/login` | No | RF02 — login, devuelve JWT |
| GET | `/perfil` | Sí | Datos del usuario autenticado |
| POST | `/recuperar-contrasenia` | No | Genera un token de reseteo (se devuelve en la respuesta; no hay envío de correo real) |
| POST | `/restablecer-contrasenia` | No | Cambia la contraseña con el token |

### Usuarios — `/api/usuarios` (administrador / marketing)
`GET /` · `GET /:id` · `POST /` (crear interno, solo administrador) · `PUT /:id` · `DELETE /:id` (baja lógica, solo administrador)

### Direcciones — `/api/direcciones` (cliente autenticado)
`GET /` · `POST /` · `PUT /:id` · `DELETE /:id`

### Categorías — `/api/categorias`
`GET /` y `GET /:id` públicos. `POST` / `PUT /:id` / `DELETE /:id` → administrador o almacén.

### Productos — `/api/productos`
- `GET /` — catálogo público (RF03/RF04), filtros `?categoria=&precioMin=&precioMax=&buscar=`
- `GET /admin` — incluye inactivos (administrador/almacén)
- `GET /:id` — detalle + galería de imágenes
- `POST /` · `PUT /:id` · `DELETE /:id` (baja lógica) · `POST /:id/imagenes` → administrador/almacén

### Carrito — `/api/carrito` (cliente autenticado)
`GET /` · `POST /items` · `PUT /items/:idProducto` · `DELETE /items/:idProducto` · `DELETE /`

### Órdenes — `/api/ordenes` (autenticado)
- `POST /` — checkout completo (RF06/RF07), body: `id_direccion, metodo_pago, numero_tarjeta?, cvv?, fecha_expiracion?, ruc_razon_social?`
- `GET /mias` — mis compras (RF08)
- `GET /` — todas (administrador/finanzas/almacen), filtro `?estado=`
- `GET /:id` — detalle + historial + pagos + comprobante
- `PATCH /:id/estado` — administrador/almacén, body `{ estado }`; transiciones válidas: `pendiente→procesando|cancelado`, `procesando→enviado|cancelado`, `enviado→entregado|cancelado`. Cancelar repone el stock.

### Comprobantes — `/api/comprobantes` (autenticado)
`GET /orden/:idOrden`

### Inventario / Kardex — `/api/inventario` (administrador/almacén)
`GET /` (filtro `?id_producto=`) · `POST /ajustes` body `{ id_producto, tipo: 'entrada'|'salida', cantidad, motivo }`

### Reportes — `/api/reportes` (autenticado, por rol)
`GET /dashboard` · `GET /ventas?desde=&hasta=` · `GET /productos-mas-vendidos?limite=` · `GET /stock-critico`

### Exportar CSV
Los listados de `usuarios`, `productos` (`/admin`), `inventario` y `reportes/ventas` aceptan `?formato=csv` para descargar el CSV en vez de JSON.

## 8. Credenciales de prueba (después de correr `seed.sql`)

Todas las cuentas usan la misma contraseña: **`Perizone123!`**

| Correo | Rol |
|---|---|
| admin@perizone.com | administrador |
| finanzas@perizone.com | finanzas |
| almacen@perizone.com | almacen |
| marketing@perizone.com | marketing |
| juan.perez@example.com | cliente (tiene una orden ya entregada) |
| maria.lopez@example.com | cliente (tiene un carrito activo con 2 productos) |

## 9. Postman

Importa `postman/PeriZone.postman_collection.json` y `postman/PeriZone.postman_environment.json` en Postman. El environment trae `base_url` (`http://localhost:3000`) y una variable `token` vacía: al correr las requests de **Login** o **Registro**, un script de test guarda el token automáticamente en esa variable, y el resto de la colección ya lo usa vía `Bearer {{token}}`.

## 10. Notas de diseño

- **Contraseñas**: se guardan como hash bcrypt (`SALT_ROUNDS = 10`), nunca en texto plano.
- **Tarjetas**: solo se guardan los últimos 4 dígitos en `pagos.ultimos_digitos_tarjeta`; el número completo nunca se persiste (ni siquiera en este entorno simulado).
- **Concurrencia de stock**: el descuento de stock usa `UPDATE ... WHERE stock >= cantidad` dentro de una transacción, evitando sobreventas si dos checkouts ocurren al mismo tiempo.
- **IGV**: 18% fijo (`src/utils/dinero.ts`), aplicado sobre el subtotal del carrito/orden.
