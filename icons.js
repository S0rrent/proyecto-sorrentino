// icons.js — Íconos SVG centralizados (Lucide)
// Importar siempre desde acá para tree-shaking consistente.
// strokeWidth estándar: 1.75 (más fino que el default 2 de Lucide).

export {
  // ── Navegación principal ──────────────────────────────────────
  Truck          as Ingresos,
  ArrowLeftRight as Movimientos,
  PackageCheck   as Carga,
  FlaskConical   as Fortificados,
  SprayCan       as CIP,
  BarChart3      as Stock,
  Boxes          as Produccion,

  // ── Perfiles ─────────────────────────────────────────────────
  UserCog   as Supervisor,
  Crown     as Jefe,
  Briefcase as Admin,

  // ── Header / acciones globales ────────────────────────────────
  Sun      as ThemeLight,
  Moon     as ThemeDark,
  Calendar as DatePicker,
  FileText as Informe,
  WifiOff  as Offline,

  // ── Secciones / formularios ───────────────────────────────────
  Package       as Destino,
  FlaskConical  as Concentrado,
  TestTube      as Calidad,
  Thermometer   as Temperatura,
  Search        as Buscar,
  Factory       as Instalacion,
  Wrench        as Mantenimiento,
  Microscope    as ControlSilo,
  Milk          as LecheIcon,
  Scale         as Balance,

  // ── Estado / alertas ─────────────────────────────────────────
  AlertCircle   as AlertaError,
  AlertTriangle as AlertaWarn,
  CheckCircle2  as AlertaOk,
  Check         as CheckMark,
  Trash2        as Eliminar,

  // ── Dashboard ────────────────────────────────────────────────
  BarChart3     as TabResumen,
  Warehouse     as TabSilos,
  TrendingUp    as TabCalidad,
  ScanSearch    as TabDifs,
  CalendarDays  as TabSemana,
  ClipboardList as TabHistorial,
  Upload        as TabExportar,

  // ── Misc ─────────────────────────────────────────────────────
  Truck         as CamionIcon,
  Users         as UsuariosOnline,
  Lock          as DiaCerrado,
  LockOpen      as DiaAbierto,
  CloudOff      as SyncError,
  RefreshCw     as Syncing,
} from "lucide-react";

// Stroke width estándar para toda la app
export const SW = 1.75;
