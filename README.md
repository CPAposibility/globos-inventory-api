# API - Control de Inventario de Globos
on
## 1. Instalación

Desde la carpeta `server/`:

```bash
npm init -y
npm install express sequelize pg pg-hstore cors dotenv
npm install --save-dev nodemon
```

Copia `.env.example` a `.env` y llena tus datos reales de Azure:

```bash
cp .env.example .env
```

Agrega en tu `package.json`:

```json
"type": "module",
"scripts": {
  "start": "node app.js",
  "dev": "nodemon app.js"
}
```

## 2. Correr el servidor

```bash
npm run dev
```

Deberías ver en consola:
```
✅ Conectado a Azure PostgreSQL
🚀 Servidor corriendo en http://localhost:3000
```

## 3. Endpoints para probar en Postman

Base URL local: `http://localhost:3000/api`

### Catálogo (ya tienes datos sembrados de la migración)

| Método | Path | Descripción |
|---|---|---|
| GET | `/api/v1/marca` | Lista todas las marcas |
| GET | `/api/v1/estilo` | Lista todos los estilos |
| GET | `/api/v1/tamano` | Lista todos los tamaños |
| GET | `/api/v1/color?id_marca=1` | Colores de una marca (filtro opcional) |
| POST | `/api/v1/color` | Crear color → body: `{ "id_marca": 1, "color": "Rojo" }` |

### Globo (SKU)

| Método | Path | Descripción |
|---|---|---|
| GET | `/api/v1/globo` | Lista todos los globos con su marca/estilo/tamaño/color |
| GET | `/api/v1/globo?id_marca=1` | Filtra por marca |
| POST | `/api/v1/globo` | Crear un SKU nuevo |
| GET | `/api/v1/globo/:id` | Un globo específico |
| PUT | `/api/v1/globo/:id` | Editar costos |
| DELETE | `/api/v1/globo/:id` | Eliminar |

Body de ejemplo para `POST /api/v1/globo`:
```json
{
  "id_marca": 1,
  "id_estilo": 1,
  "id_tamano": 1,
  "id_color": 1,
  "costo_mayoreo": 3.5,
  "costo_menudeo": 5.0,
  "costo_caja": 120,
  "costo_media": 65
}
```

### Ubicación (almacén + 3 tiendas)

| Método | Path | Descripción |
|---|---|---|
| GET | `/api/v1/ubicacion` | Lista todas las ubicaciones |
| GET | `/api/v1/ubicacion?tipo=tienda` | Solo tiendas |

### Movimiento — el endpoint clave del MVP

| Método | Path | Descripción |
|---|---|---|
| GET | `/api/v1/movimiento` | Historial completo, más reciente primero |
| GET | `/api/v1/movimiento?id_globo=1` | Historial de un globo |
| POST | `/api/v1/movimiento` | Registrar entrada o salida |

Body de ejemplo para `POST /api/v1/movimiento` (entrada al almacén):
```json
{
  "id_globo": 1,
  "id_ubicacion": 1,
  "tipo_movimiento": "entrada",
  "cantidad": 50,
  "nota": "Compra a proveedor"
}
```

Traslado del almacén a una tienda = **dos** llamadas POST:
```json
// 1) salida del almacén
{ "id_globo": 1, "id_ubicacion": 1, "tipo_movimiento": "salida", "cantidad": 20, "nota": "Traslado a Tienda 1" }

// 2) entrada a la tienda
{ "id_globo": 1, "id_ubicacion": 2, "tipo_movimiento": "entrada", "cantidad": 20, "nota": "Traslado desde almacén" }
```

### Inventario actual (vista, solo lectura)

| Método | Path | Descripción |
|---|---|---|
| GET | `/api/v1/inventario` | Stock de todos los globos en todas las ubicaciones |
| GET | `/api/v1/inventario?id_ubicacion=1` | Stock solo del almacén |
| GET | `/api/v1/inventario?id_globo=1` | Stock de un globo en todas las ubicaciones |

## 4. Pendientes conocidos (no incluidos aquí)

- El módulo `task` que tenías antes no se incluyó — es una plantilla genérica sin relación con globos.
- Autenticación de usuarios (login, roles) — el `usuarios.html` que compartiste no tiene su API todavía.
- Conectar el front-end (`form-globos.js`) a estos endpoints reales, reemplazando el objeto `DATA` hardcodeado.
