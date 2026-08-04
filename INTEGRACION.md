# Guía de integración — dejar la app funcionando de punta a punta

## Orden de pasos

### 1. Base de datos
Corre en pgAdmin (conectado a Azure, base `Globos_base`):
```
server/migrations/agregar_codigo_interno.sql
```
Esto agrega la columna `codigo_interno` a la tabla `globo`.

También asegúrate de tener **al menos un color por marca** cargado (antes solo sembramos marcas, estilos, tamaños y ubicaciones, pero no colores). Ejemplo:
```sql
INSERT INTO color (id_marca, color) VALUES
  (1, 'Rojo'), (1, 'Azul'), (1, 'Blanco'),
  (2, 'Rojo'), (2, 'Dorado'),
  (3, 'Rosa'), (3, 'Verde');
```
(Ajusta los `id_marca` según lo que te devuelva `SELECT * FROM marca;`)

### 2. API (carpeta `server/`)
1. `npm install` (si no lo has hecho)
2. Confirma tu `.env` con los datos reales de Azure
3. `npm run dev`
4. Prueba en Postman: `GET http://localhost:3000/api/v1/color?id_marca=1` — debe regresar los colores que insertaste

### 3. Front-end (carpeta `frontend/`)
1. Abre `formulario2.html` directamente en el navegador (o sírvelo con una extensión tipo Live Server)
2. Al cargar, deberías ver el select de **Marca** lleno automáticamente (viene de la API, ya no está hardcodeado)
3. Completa el formulario: Marca → Estilo → Tamaño → Color → Ubicación → Tipo de movimiento → Cantidad
4. Presiona **Guardar**

Qué pasa internamente al guardar:
- El formulario busca si ya existe un globo con esa combinación exacta de marca+estilo+tamaño+color
- Si no existe, lo crea automáticamente
- Registra el movimiento (entrada o salida) en la ubicación elegida

### 4. Verificar en pgAdmin
```sql
SELECT * FROM globo;
SELECT * FROM movimiento ORDER BY fecha DESC;
SELECT * FROM inventario_actual;
```

## Nota sobre CORS
Si abres `formulario2.html` como archivo local (`file://`) y tu API corre en `localhost:3000`, el navegador debería permitirlo porque ya agregamos `cors()` sin restricciones en `app.js`. Si más adelante restringes CORS a un dominio específico, asegúrate de incluir el dominio donde subas el front-end.

## Archivos que quedaron obsoletos
- `data.js` (la lógica de generar código ya vive dentro de `form-globos.js`, con datos reales en vez de hardcodeados) — puedes borrarlo.
- Los `.pgerd` viejos — mejor generar uno nuevo desde pgAdmin conectado a Azure (clic derecho en la base → Generate ERD) para que refleje el esquema real.

## Lo que todavía falta (fuera de este paquete)
- Subir fotos de producto al servidor (por ahora solo se previsualizan)
- Conectar `usuarios.html` a un endpoint real de registro/login
- Desplegar la API a Azure App Service (ya vimos el paso a paso; falta ejecutarlo)
- Pantalla para *ver* el inventario actual y el historial de movimientos (por ahora solo existe el formulario de captura)
