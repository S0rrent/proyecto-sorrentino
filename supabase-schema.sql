-- =============================================================================
--  YATASTO — Esquema Supabase
--  Lacteos Yatasto SA · Sistema de Gestión Diaria
--
--  INSTRUCCIONES DE CONFIGURACIÓN COMPLETAS AL FINAL DEL ARCHIVO
-- =============================================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
--  TABLA PRINCIPAL DE ALMACENAMIENTO (clave-valor, compatible con window.storage)
-- =============================================================================
-- Esta tabla es la más simple y es la que usa db-adapter.js directamente.
-- El resto de tablas son OPCIONALES para un schema relacional más avanzado.

CREATE TABLE IF NOT EXISTS yatasto_storage (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsquedas por prefijo (para db.list())
CREATE INDEX IF NOT EXISTS idx_yatasto_storage_key_prefix
  ON yatasto_storage (key text_pattern_ops);

-- =============================================================================
--  TABLAS RELACIONALES (OPCIONAL — para análisis avanzado en el futuro)
-- =============================================================================

-- ── Usuarios / Perfiles ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario     TEXT        UNIQUE NOT NULL,         -- "Supervisor", "Jefe"
  rol         TEXT        NOT NULL DEFAULT 'operario',  -- supervisor | jefe | operario
  activo      BOOLEAN     NOT NULL DEFAULT true,
  ultimo_login TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tambos (proveedores) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tambos (
  id          SERIAL      PRIMARY KEY,
  num         TEXT        NOT NULL UNIQUE,         -- código del tambo
  nombre      TEXT        NOT NULL,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Ingresos diarios ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingresos (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha           DATE        NOT NULL,
  hora            TEXT,
  num             TEXT,                            -- número tambo
  tambo           TEXT,
  litros_fca      NUMERIC(10,2),
  litros_tbo      NUMERIC(10,2),
  destino         TEXT,                            -- silo destino
  producto        TEXT,
  -- Parámetros calidad Fábrica
  ph_fca          NUMERIC(5,3),
  acidez_fca      NUMERIC(5,2),
  gb_fca          NUMERIC(5,3),
  sng_fca         NUMERIC(5,3),
  dens_fca        NUMERIC(7,4),
  prot_fca        NUMERIC(5,3),
  t_c             NUMERIC(5,2),
  aguado_fca      NUMERIC(8,5),
  -- Parámetros calidad Tambo
  ph_tbo          NUMERIC(5,3),
  acidez_tbo      NUMERIC(5,2),
  gb_tbo          NUMERIC(5,3),
  sng_tbo         NUMERIC(5,3),
  dens_tbo        NUMERIC(7,4),
  prot_tbo        NUMERIC(5,3),
  aguado_tbo      NUMERIC(8,5),
  responsable     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos (fecha DESC);

-- ── Cargas despachadas ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cargas (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha           DATE        NOT NULL,
  hora            TEXT,
  label           TEXT,                            -- "CARGA 1", "CARGA 2", ...
  destino         TEXT,
  transportista   TEXT,
  silo_proveniente TEXT,
  litros          NUMERIC(10,2),
  ph              NUMERIC(5,3),
  g_c             NUMERIC(5,2),
  producto        TEXT,
  responsable     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cargas_fecha ON cargas (fecha DESC);

-- ── Movimientos entre silos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimientos (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha       DATE        NOT NULL,
  hora        TEXT,
  desde       TEXT        NOT NULL,
  hasta       TEXT        NOT NULL,
  litros      NUMERIC(10,2),
  motivo      TEXT,
  responsable TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos (fecha DESC);

-- ── CIP (Cleaning In Place) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cip_registros (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha       DATE        NOT NULL,
  tipo        TEXT        NOT NULL,               -- silo | camion | filtro
  nombre      TEXT        NOT NULL,               -- nombre del silo o camión
  hora_inicio TEXT,
  hora_fin    TEXT,
  responsable TEXT,
  observacion TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cip_fecha ON cip_registros (fecha DESC);

-- ── Stock por turno ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_turnos (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha       DATE        NOT NULL,
  turno       TEXT        NOT NULL,               -- "05:00" | "14:00" | "21:00"
  silo        TEXT        NOT NULL,
  litros      NUMERIC(10,2),
  producto    TEXT,
  responsable TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fecha, turno, silo)
);

CREATE INDEX IF NOT EXISTS idx_stock_fecha ON stock_turnos (fecha DESC);

-- ── Lotes Fortificados ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fortificados (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha       DATE        NOT NULL,
  hora        TEXT,
  lote        TEXT,
  producto    TEXT,
  litros      NUMERIC(10,2),
  tanque      TEXT,
  responsable TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adiciones del lote fortificado (lista variable)
CREATE TABLE IF NOT EXISTS fort_adiciones (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  fortificado_id UUID   NOT NULL REFERENCES fortificados(id) ON DELETE CASCADE,
  producto      TEXT,
  cantidad      NUMERIC(12,4),
  unidad        TEXT
);

-- ── Saldo/Balance de silos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saldo_silos (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha       DATE        NOT NULL,
  silo        TEXT        NOT NULL,
  litros      NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fecha, silo)
);

-- ── Historial de operaciones (audit log) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS historial (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha       DATE        NOT NULL,
  tipo        TEXT        NOT NULL,               -- ingreso | carga | movimiento | etc.
  descripcion TEXT,
  usuario     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial (fecha DESC);

-- ── Configuración global ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config (
  clave       TEXT        PRIMARY KEY,
  valor       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
--  ROW LEVEL SECURITY (RLS) — Seguridad básica
-- =============================================================================

-- Habilitar RLS en yatasto_storage (tabla principal)
ALTER TABLE yatasto_storage ENABLE ROW LEVEL SECURITY;

-- Política: solo usuarios autenticados con Supabase Auth pueden leer/escribir.
-- DROP + CREATE hace el script re-ejecutable (evita error 42710 "policy already exists")
DROP POLICY IF EXISTS "acceso_total_anon"   ON yatasto_storage;
DROP POLICY IF EXISTS "solo_usuarios_auth"  ON yatasto_storage;
CREATE POLICY "solo_usuarios_auth" ON yatasto_storage
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Habilitar RLS en tablas relacionales
ALTER TABLE ingresos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cip_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE fortificados ENABLE ROW LEVEL SECURITY;

-- Políticas: solo usuarios autenticados
DROP POLICY IF EXISTS "acceso_anon_ingresos"    ON ingresos;
DROP POLICY IF EXISTS "acceso_anon_cargas"      ON cargas;
DROP POLICY IF EXISTS "acceso_anon_movimientos" ON movimientos;
DROP POLICY IF EXISTS "acceso_anon_stock"       ON stock_turnos;
DROP POLICY IF EXISTS "acceso_anon_cip"         ON cip_registros;
DROP POLICY IF EXISTS "acceso_anon_fort"        ON fortificados;
DROP POLICY IF EXISTS "auth_ingresos"    ON ingresos;
DROP POLICY IF EXISTS "auth_cargas"      ON cargas;
DROP POLICY IF EXISTS "auth_movimientos" ON movimientos;
DROP POLICY IF EXISTS "auth_stock"       ON stock_turnos;
DROP POLICY IF EXISTS "auth_cip"         ON cip_registros;
DROP POLICY IF EXISTS "auth_fort"        ON fortificados;
CREATE POLICY "auth_ingresos"    ON ingresos    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_cargas"      ON cargas      FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_movimientos" ON movimientos FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_stock"       ON stock_turnos FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_cip"         ON cip_registros FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_fort"        ON fortificados FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
--  VISTAS ÚTILES PARA REPORTES
-- =============================================================================

-- Vista: resumen diario de litros
CREATE OR REPLACE VIEW v_resumen_diario AS
SELECT
  COALESCE(i.fecha, c.fecha)            AS fecha,
  COALESCE(SUM(i.litros_fca), 0)        AS total_ingresados,
  COALESCE(SUM(c.litros), 0)            AS total_cargados,
  COUNT(DISTINCT i.id)                  AS num_ingresos,
  COUNT(DISTINCT c.id)                  AS num_cargas
FROM
  (SELECT fecha, litros_fca, id FROM ingresos) i
  FULL OUTER JOIN
  (SELECT fecha, litros, id FROM cargas) c ON i.fecha = c.fecha
GROUP BY COALESCE(i.fecha, c.fecha)
ORDER BY fecha DESC;

-- Vista: promedio de calidad por día
CREATE OR REPLACE VIEW v_calidad_diaria AS
SELECT
  fecha,
  COUNT(*)             AS num_camiones,
  ROUND(AVG(ph_fca),3)     AS ph_avg,
  ROUND(AVG(acidez_fca),2) AS acidez_avg,
  ROUND(AVG(gb_fca),3)     AS gb_avg,
  ROUND(AVG(sng_fca),3)    AS sng_avg,
  ROUND(AVG(dens_fca),4)   AS dens_avg,
  ROUND(AVG(prot_fca),3)   AS prot_avg,
  ROUND(AVG(t_c),2)        AS temp_avg,
  SUM(CASE WHEN aguado_fca > 0 THEN 1 ELSE 0 END) AS casos_aguado
FROM ingresos
WHERE ph_fca IS NOT NULL
GROUP BY fecha
ORDER BY fecha DESC;

-- Vista: estado actual de silos (último turno disponible)
CREATE OR REPLACE VIEW v_estado_silos AS
SELECT DISTINCT ON (silo)
  silo,
  fecha,
  turno,
  litros,
  producto
FROM stock_turnos
ORDER BY silo, fecha DESC, turno DESC;

-- =============================================================================
--  FUNCIÓN DE ACTUALIZACIÓN AUTOMÁTICA DE updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_yatasto_storage_updated ON yatasto_storage;
CREATE TRIGGER trig_yatasto_storage_updated
  BEFORE UPDATE ON yatasto_storage
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trig_saldo_silos_updated ON saldo_silos;
CREATE TRIGGER trig_saldo_silos_updated
  BEFORE UPDATE ON saldo_silos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trig_config_updated ON config;
CREATE TRIGGER trig_config_updated
  BEFORE UPDATE ON config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
--
--  ╔═══════════════════════════════════════════════════════════════════════╗
--  ║           GUÍA COMPLETA DE CONFIGURACIÓN SUPABASE                    ║
--  ╚═══════════════════════════════════════════════════════════════════════╝
--
--  PASO 1 — Crear proyecto en Supabase
--  ─────────────────────────────────────────────────────────────────────────
--  1. Ir a https://supabase.com y crear una cuenta (gratis)
--  2. Hacer clic en "New Project"
--  3. Completar:
--       Nombre del proyecto:  yatasto-produccion
--       Contraseña DB:        [generar una fuerte, guardarla]
--       Región:               South America (São Paulo) — más cercana a Argentina
--  4. Esperar ~2 minutos a que el proyecto se cree
--
--  PASO 2 — Ejecutar este schema SQL
--  ─────────────────────────────────────────────────────────────────────────
--  1. En el panel de Supabase ir a: SQL Editor (ícono de código en sidebar)
--  2. Hacer clic en "New Query"
--  3. Pegar TODO el contenido de este archivo (supabase-schema.sql)
--  4. Hacer clic en "Run" (o Ctrl+Enter)
--  5. Verificar que no hay errores en el panel inferior
--  6. Ir a Table Editor y confirmar que aparece la tabla "yatasto_storage"
--
--  PASO 3 — Obtener las credenciales
--  ─────────────────────────────────────────────────────────────────────────
--  1. En el panel de Supabase ir a: Settings → API
--  2. Copiar:
--
--       Project URL:    https://XXXXXXXXXX.supabase.co
--                       (en la sección "Project URL")
--
--       anon/public:    eyJhbGci...  (cadena larga)
--                       (en la sección "Project API Keys" → "anon public")
--
--  PASO 4 — Configurar db-adapter.js
--  ─────────────────────────────────────────────────────────────────────────
--  Abrir el archivo db-adapter.js y:
--
--  A) Pegar las credenciales:
--
--       const SUPABASE_URL      = "https://XXXXXXXXXX.supabase.co";
--       const SUPABASE_ANON_KEY = "eyJhbGci...";
--
--  B) Descomentar el import del cliente:
--
--       import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
--       const _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
--
--  C) En cada función (get, set, remove, list):
--       - Comentar la línea: return _ws.get(key);  etc.
--       - Descomentar el bloque Supabase correspondiente
--
--  D) Guardar el archivo
--
--  PASO 5 — Conectar la app al adapter
--  ─────────────────────────────────────────────────────────────────────────
--  En recibo_yatasto.jsx agregar al inicio del archivo (después de los imports
--  de React si los hay):
--
--       import { db } from "./db-adapter.js";
--
--  Luego reemplazar todas las llamadas a window.storage:
--       window.storage.get(key)        → db.get(key)
--       window.storage.set(key, value) → db.set(key, value)
--       window.storage.remove(key)     → db.remove(key)
--
--  PASO 6 — Migrar datos existentes
--  ─────────────────────────────────────────────────────────────────────────
--  Si ya hay datos en localStorage/window.storage:
--
--  1. Abrir la app en el navegador
--  2. Abrir las DevTools (F12) → pestaña Console
--  3. Ejecutar:
--
--       import { migrateToSupabase } from "./db-adapter.js";
--       await migrateToSupabase();
--
--  4. Esperar a que imprima "Migración completa."
--  5. Verificar en Supabase → Table Editor → yatasto_storage
--     que las filas aparecen correctamente
--
--  PASO 7 — Verificar que funciona
--  ─────────────────────────────────────────────────────────────────────────
--  1. En la app, ingresar un nuevo dato (por ejemplo un ingreso de leche)
--  2. En Supabase → Table Editor → yatasto_storage
--     verificar que la fila con key "yatasto:FECHA:ingresos" aparece
--  3. Si aparece: ¡Supabase está funcionando!
--
--  ─────────────────────────────────────────────────────────────────────────
--  VARIABLES DE ENTORNO (para producción futura con bundler)
--  ─────────────────────────────────────────────────────────────────────────
--  Si en el futuro se migra a Vite u otro bundler, crear archivo .env:
--
--       VITE_SUPABASE_URL=https://XXXXXXXXXX.supabase.co
--       VITE_SUPABASE_ANON_KEY=eyJhbGci...
--
--  Y en db-adapter.js usar:
--       const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
--       const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
--
--  NUNCA subir el archivo .env al repositorio (agregarlo a .gitignore)
--
--  ─────────────────────────────────────────────────────────────────────────
--  COSTOS Y LÍMITES (plan gratuito de Supabase)
--  ─────────────────────────────────────────────────────────────────────────
--  El plan Free incluye:
--    - 500 MB de base de datos
--    - 2 GB de transferencia por mes
--    - 50.000 requests por mes (API)
--    - 1 proyecto activo
--
--  Para uso típico de planta lechera (operación diaria, ~100 registros/día):
--  el plan gratuito es más que suficiente por años.
--
--  Si el uso crece, el plan Pro cuesta USD 25/mes e incluye:
--    - 8 GB de base de datos
--    - 250 GB de transferencia
--    - Backups automáticos diarios
--
--  ─────────────────────────────────────────────────────────────────────────
--  CREAR USUARIOS EN SUPABASE AUTH (obligatorio para que el login funcione)
--  ─────────────────────────────────────────────────────────────────────────
--  Las políticas RLS ahora requieren auth.uid() — solo usuarios autenticados
--  con Supabase Auth pueden leer y escribir datos.
--
--  Ejecutar este SQL en el SQL Editor de Supabase para crear los dos usuarios:
--
--    SELECT supabase_auth.create_user(
--      email      := 'supervisor@yatasto.internal',
--      password   := '<contraseña-segura-supervisor>',
--      user_metadata := '{"rol": "supervisor"}'::jsonb
--    );
--
--    SELECT supabase_auth.create_user(
--      email      := 'jefe@yatasto.internal',
--      password   := '<contraseña-segura-jefe>',
--      user_metadata := '{"rol": "jefe"}'::jsonb
--    );
--
--  NOTA: Elegir contraseñas fuertes (mínimo 12 caracteres, mayúsculas, números,
--  símbolos). Estas contraseñas reemplazan las que estaban hardcodeadas en el
--  código fuente — ahora se validan server-side vía Supabase Auth.
--
--  NOTA: Los emails son internos y no se usan para notificaciones. El usuario
--  de la app sigue ingresando solo "Supervisor" o "Jefe" como nombre de usuario.
--
--  SEGURIDAD
--  ─────────────────────────────────────────────────────────────────────────
--  - Las políticas RLS requieren auth.uid() IS NOT NULL — ningún acceso sin sesión.
--  - La anon key sola ya no alcanza para leer ni escribir datos.
--  - Nunca compartir la "service_role" key (acceso total sin RLS).
--  - Rotar la anon key periódicamente desde Settings → API.
--
-- =============================================================================
