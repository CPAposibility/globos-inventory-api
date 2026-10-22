-- =====================================================================
-- crear-secciones.sql
-- Crea TODO lo necesario para las secciones nuevas (Batukada, CD-5, ...)
-- en una sola corrida. Reemplaza los bloques SQL anteriores: aquí las
-- tablas ya nacen con el diseño final (movimientos en piezas, grupos).
--
-- Cómo correrlo (desde la carpeta donde guardes este archivo):
--   psql "host=mxglobotesting.postgres.database.azure.com port=5432 dbname=Globos_base user=Admin_super1 sslmode=require" -f crear-secciones.sql
--
-- Por qué con -f y no pegándolo en la consola: el archivo se ejecuta
-- completo en segundos. Pegado a mano, la conexión a Azure puede
-- cortarse con la transacción abierta y TODO se deshace sin avisar.
-- =====================================================================

-- Si algún comando falla, psql se detiene ahí y NO sigue ejecutando el
-- resto (así no se llena la pantalla de errores en cascada). Como todo
-- está dentro de una transacción, al fallar no queda nada a medias.
\set ON_ERROR_STOP on

BEGIN;

-- =====================================================================
-- PARTE 1: Secciones
-- Función: las 6 secciones del negocio. "clave" es el identificador
-- corto que usa la app (batukada, cd5...); "orden" define cómo se
-- listan; "activa" permite esconder una sección sin borrarla.
-- =====================================================================
CREATE TABLE seccion (
  id_seccion  SERIAL PRIMARY KEY,
  clave       VARCHAR(30)  NOT NULL UNIQUE,
  nombre      VARCHAR(60)  NOT NULL,
  orden       SMALLINT     NOT NULL DEFAULT 0,
  activa      BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO seccion (clave, nombre, orden) VALUES
  ('globos',     'Globos (clásicos)',    1),
  ('personajes', 'Globos de personajes', 2),
  ('arcos',      'Arcos de globo',       3),
  ('batukada',   'Batukada',             4),
  ('luz',        'Artículos de luz',     5),
  ('cd5',        'CD-5',                 6);

-- =====================================================================
-- PARTE 2: Grupos
-- Función: agrupan productos dentro de una sección. Ejemplo en CD-5:
-- el grupo "Eventos" contiene Bautizo, Comunión, Boda...
-- UNIQUE (id_seccion, nombre) evita repetir un grupo en la misma sección.
-- =====================================================================
CREATE TABLE grupo (
  id_grupo    SERIAL PRIMARY KEY,
  id_seccion  INTEGER      NOT NULL REFERENCES seccion(id_seccion),
  nombre      VARCHAR(60)  NOT NULL,
  orden       SMALLINT     NOT NULL DEFAULT 0,
  UNIQUE (id_seccion, nombre)
);

-- =====================================================================
-- PARTE 3: Productos
-- Función: el catálogo de las secciones nuevas (los globos clásicos
-- siguen en su propia tabla "globo"). "id_grupo" puede quedar vacío
-- (Batukada no usa grupos). "piezas_por_paquete" es 12 en Batukada y
-- 5 en CD-5; la app lo usa para convertir paquetes a piezas.
-- =====================================================================
CREATE TABLE producto (
  id_producto         SERIAL PRIMARY KEY,
  id_seccion          INTEGER      NOT NULL REFERENCES seccion(id_seccion),
  id_grupo            INTEGER      REFERENCES grupo(id_grupo),
  nombre              VARCHAR(100) NOT NULL,
  codigo_interno      VARCHAR(50)  UNIQUE,
  piezas_por_paquete  INTEGER      NOT NULL DEFAULT 12 CHECK (piezas_por_paquete > 0),
  foto_url            VARCHAR(500),
  activo              BOOLEAN      NOT NULL DEFAULT TRUE,
  UNIQUE (id_seccion, nombre)
);

-- =====================================================================
-- PARTE 4: Movimientos
-- Función: entradas y salidas de los productos. La cantidad se guarda
-- siempre en PIEZAS (entero positivo): así un paquete de CD-5 (5 piezas)
-- y una pieza suelta usan la misma unidad. "tipo" dice si suma
-- (entrada) o resta (salida). "id_usuario" guarda quién lo capturó.
-- =====================================================================
CREATE TABLE movimiento_producto (
  id_movimiento_producto SERIAL PRIMARY KEY,
  id_producto   INTEGER      NOT NULL REFERENCES producto(id_producto),
  id_ubicacion  INTEGER      NOT NULL REFERENCES ubicacion(id_ubicacion),
  tipo          VARCHAR(10)  NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  piezas        INTEGER      NOT NULL CHECK (piezas > 0),
  id_usuario    INTEGER      REFERENCES usuario(id_usuario),
  fecha         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- =====================================================================
-- PARTE 5: Índices
-- Función: aceleran las búsquedas por llave foránea, igual que en el
-- resto de la base.
-- =====================================================================
CREATE INDEX idx_grupo_id_seccion     ON grupo(id_seccion);
CREATE INDEX idx_producto_id_seccion  ON producto(id_seccion);
CREATE INDEX idx_producto_id_grupo    ON producto(id_grupo);
CREATE INDEX idx_movprod_id_producto  ON movimiento_producto(id_producto);
CREATE INDEX idx_movprod_id_ubicacion ON movimiento_producto(id_ubicacion);
CREATE INDEX idx_movprod_id_usuario   ON movimiento_producto(id_usuario);

-- =====================================================================
-- PARTE 6: Vista de inventario actual
-- Función: calcula el stock por producto y ubicación sumando entradas
-- y restando salidas. Devuelve las piezas totales, cuántos paquetes
-- completos son y cuántas piezas sueltas sobran (ej. 14 piezas de CD-5
-- = 2 paquetes y 4 sueltas). Incluye id_grupo para poder filtrar.
-- =====================================================================
CREATE VIEW inventario_producto_actual AS
SELECT
  t.id_producto,
  t.id_seccion,
  t.id_grupo,
  t.nombre,
  t.piezas_por_paquete,
  t.id_ubicacion,
  t.piezas,
  t.piezas / t.piezas_por_paquete AS paquetes_completos,
  t.piezas % t.piezas_por_paquete AS piezas_sueltas
FROM (
  SELECT
    p.id_producto, p.id_seccion, p.id_grupo, p.nombre, p.piezas_por_paquete, m.id_ubicacion,
    SUM(CASE WHEN m.tipo = 'entrada' THEN m.piezas ELSE -m.piezas END) AS piezas
  FROM producto p
  JOIN movimiento_producto m ON m.id_producto = p.id_producto
  GROUP BY p.id_producto, p.id_seccion, p.id_grupo, p.nombre, p.piezas_por_paquete, m.id_ubicacion
) t;

-- =====================================================================
-- PARTE 7: Productos de Batukada (todos en paquetes de 12)
-- Función: crea los 12 productos de la sección. Cada fila de VALUES es:
-- (nombre, código interno).
-- =====================================================================
INSERT INTO producto (id_seccion, nombre, codigo_interno, piezas_por_paquete)
SELECT s.id_seccion, v.nombre, v.codigo, 12
FROM seccion s
CROSS JOIN (VALUES
  ('Máscaras de neón',                         'BAT-MASNEO'),
  ('Collar hawaiano',                          'BAT-COLHAW'),
  ('Corbata',                                  'BAT-CORBAT'),
  ('Moño',                                     'BAT-MONO'),
  ('Antifaces de neón',                        'BAT-ANTNEO'),
  ('Antifaces de lente (con nariz y bigote)',  'BAT-ANTLEN'),
  ('Coronas',                                  'BAT-CORONA'),
  ('Bombines',                                 'BAT-BOMBIN'),
  ('Diadema de lluvia',                        'BAT-DIALLU'),
  ('Diadema de cabello',                       'BAT-DIACAB'),
  ('Mechudos',                                 'BAT-MECHUD'),
  ('Espanta suegras',                          'BAT-ESPSUE')
) AS v(nombre, codigo)
WHERE s.clave = 'batukada';

-- =====================================================================
-- PARTE 8: Grupos de CD-5
-- Función: crea los 3 grupos de la sección. "orden" define cómo salen
-- en el selector del formulario.
-- =====================================================================
INSERT INTO grupo (id_seccion, nombre, orden)
SELECT s.id_seccion, v.nombre, v.orden
FROM seccion s
CROSS JOIN (VALUES
  ('Personajes',       1),
  ('Eventos',          2),
  ('Equipo de fútbol', 3)
) AS v(nombre, orden)
WHERE s.clave = 'cd5';

-- =====================================================================
-- PARTE 9: Temas de CD-5 (paquetes de 5 piezas)
-- Función: crea cada tema como un producto ligado a su grupo. Cada
-- fila de VALUES es: (grupo, nombre del tema, código interno).
-- =====================================================================
INSERT INTO producto (id_seccion, id_grupo, nombre, codigo_interno, piezas_por_paquete)
SELECT g.id_seccion, g.id_grupo, v.nombre, v.codigo, 5
FROM (VALUES
  ('Personajes',       'Bob Esponja',       'CD5-BOBESP'),
  ('Personajes',       'Snoopy',            'CD5-SNOOPY'),
  ('Personajes',       'La Sirenita',       'CD5-SIRENITA'),
  ('Eventos',          'Bautizo',           'CD5-BAUTIZO'),
  ('Eventos',          'Feliz cumpleaños',  'CD5-CUMPLE'),
  ('Eventos',          'Comunión',          'CD5-COMUNION'),
  ('Eventos',          'Boda',              'CD5-BODA'),
  ('Equipo de fútbol', 'América',           'CD5-AMERICA'),
  ('Equipo de fútbol', 'Chivas',            'CD5-CHIVAS'),
  ('Equipo de fútbol', 'Pelota de fútbol',  'CD5-PELOTA')
) AS v(grupo, nombre, codigo)
JOIN grupo   g ON g.nombre = v.grupo
JOIN seccion s ON s.id_seccion = g.id_seccion AND s.clave = 'cd5';

-- =====================================================================
-- VERIFICACIÓN (se muestra al terminar)
--   1) 6 secciones.
--   2) Por sección: batukada = 12 productos sin grupo; cd5 = 10 con grupo.
--   3) Los 10 temas de CD-5 con su grupo.
-- =====================================================================
SELECT clave, nombre, orden FROM seccion ORDER BY orden;

SELECT s.clave, count(*) AS productos, count(p.id_grupo) AS con_grupo
FROM producto p JOIN seccion s USING (id_seccion)
GROUP BY s.clave ORDER BY s.clave;

SELECT g.nombre AS grupo, p.nombre AS tema, p.codigo_interno, p.piezas_por_paquete
FROM producto p JOIN grupo g ON g.id_grupo = p.id_grupo
ORDER BY g.orden, p.id_producto;

COMMIT;
