# Changelog — Praxis

Todos los cambios relevantes del proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [0.3.0] — 2025-03-15

### Módulo Admin (`/admin/*`)

Nueva sección de administración completa con layout propio (`AdminSidebar`) y rutas bajo el grupo `(admin)`.

**Páginas nuevas**
- `/admin` — Panel de inicio: KPIs (médicos activos, pacientes, citas hoy/mes), estado del equipo en tiempo real, accesos rápidos
- `/admin/medicos` — CRUD de médicos con drawer lateral (nombre, RUT, especialidad, estado)
- `/admin/secretarias` — CRUD de secretarias con drawer lateral
- `/admin/pacientes` — Listado completo de pacientes con búsqueda, filtros (previsión, estado) y drawer de creación/edición
- `/admin/horarios` — Configurador de horarios semanal por médico: turnos, buffers, colaciones, cálculo de slots automático
- `/admin/especialidades` — ABM de especialidades con modal
- `/admin/configuracion` — Ajustes de clínica: datos, notificaciones (email/SMS), recordatorios
- `/admin/pacientes/importar` — Importación de pacientes por CSV
- `/admin/agenda` — Vista de agenda del día dentro del contexto admin (reutiliza `AgendaHoyClient`)

**Componentes nuevos**
- `AdminSidebar` — Sidebar de navegación del módulo admin con badges de notificación
- `DrawerMedico`, `DrawerSecretaria`, `DrawerPaciente` — Drawers laterales para creación/edición
- `HorariosClient` — Grid semanal de 7 días con toggle activo/inactivo, cálculo de slots
- `ConfiguracionClient` — Formulario de configuración clínica con toggles de notificaciones
- `EspecialidadesClient`, `ModalEspecialidad` — Gestión de especialidades
- `ImportarPacientesClient` — Parseo de CSV con preview y validación
- `MedicosClient`, `SecretariasClient`, `PacientesAdminClient` — Tablas con acciones

**Fixes en Admin**
- Toggle de días en `HorariosClient`: días inactivos ahora colapsan completamente (antes mostraban campos con opacity-40); knob del toggle ya no desborda el borde del pill (overflow-hidden + left-0.5)
- Toggle de notificaciones en `ConfiguracionClient`: mismo fix de overflow-hidden + left-0.5
- Enlace "Ver agenda" del panel admin apunta a `/admin/agenda` (antes salía del layout admin)
- Enlace "Ver agenda" en `MedicosClient` (pendiente para próxima sesión)

---

### Módulo Médico (`/medico/*`)

Nueva sección exclusiva del médico con layout propio (`MedicoSidebar`).

**Páginas nuevas**
- `/medico/inicio` — Dashboard del médico: KPIs del día, próxima consulta con alergias/condiciones destacadas, lista de citas
- `/medico/agenda` — Vista de agenda del día filtrada solo al médico activo (sin selector de médico)
- `/medico/agenda/semana` — Vista semanal filtrada solo al médico activo
- `/medico/citas` — Redirect a `/medico/agenda`
- `/medico/pacientes/[id]` — Ficha clínica del paciente con historia, evoluciones e IA

**Componentes nuevos**
- `MedicoSidebar` — Sidebar del módulo médico con identidad del médico logueado
- `MedicoDashboard` — Dashboard principal del médico
- `PacienteConsultaClient` — Vista de consulta activa con resumen IA

**Fixes en Médico**
- "Ver agenda completa" en dashboard apuntaba a `/agenda/hoy?medico=...` (salía del layout). Ahora apunta a `/medico/agenda`
- Vista semana antes navegaba a `/agenda/semana` saliendo del contexto. Ahora permanece en `/medico/agenda/semana`
- El selector de médico está oculto en todo el módulo médico (`hideMedicoFilter=true`) — solo muestra citas del médico autenticado

---

### Módulo Secretaria (`/inicio`, `/agenda/*`)

**Páginas refactorizadas**
- `/inicio` → `SecretariaDashboard` con KPIs, próximas citas y estado del equipo
- `/agenda/hoy` y `/agenda/semana` movidos a rutas explícitas bajo `(dashboard)`

**Componentes**
- `AgendaHoyClient`, `AgendaSemanaClient`, `AgendaToolbar` — Ahora aceptan `listPath`, `semanaPath` y `hideMedicoFilter` para ser reutilizables en múltiples contextos (secretaria, admin, médico) sin romper la navegación

---

### Mock Data (`src/lib/mock-data.ts`)

- Tipo `Prevision` expandido: de genérico `'Isapre'` a 6 isapres reales chilenas (`Banmédica`, `Cruz Blanca`, `Consalud`, `Colmena`, `Vida Tres`, `Nueva Masvida`)
- `MockPacienteAdmin` ahora incluye `alergias: string[]` y `condiciones: string[]`
- 15 pacientes mock actualizados con datos clínicos realistas (alergias, condiciones crónicas, isapres específicas)
- Nuevas estructuras: `mockMedicosAdmin`, `mockEstadoEquipoHoy`, `mockHorarios`, `mockClinica`

---

### Landing Page (rediseño visual)

Redesign completo de las 5 secciones para mayor impacto visual. Referencia: Linear, Elation Health.

- **Navbar** — backdrop-blur, links de navegación central, más moderno
- **HeroSection** — Hero oscuro (slate-900 + gradiente azul), headline con texto degradado, dot-pattern de fondo, glows de luz, mockup dashboard en dark, 2 badges flotantes (IA activa, nueva cita). Franja de stats debajo: clínicas activas, consultas/mes, satisfacción, tiempo de setup
- **ComoFunciona** — Íconos con gradiente, numeración badge sobre el ícono, línea conectora entre pasos en desktop
- **ParaQuienEs** — Cards con barra de acento superior por color de segmento, `CheckCircle2` como bullets, subtítulo descriptivo por rol
- **CtaDemo** — Layout dos columnas: izquierda con lista de beneficios + link WhatsApp; derecha con formulario en card blanca sobre fondo oscuro
- **Footer** — Grid 4 columnas, iconos sociales como botones, "Hecho en Chile 🇨🇱", copyright 2025

---

## [0.2.0] — anterior

- Landing page inicial
- Portal de agendamiento público (`/agendar`)
- Design system base (Button, Input, Card, Badge, Avatar)
- Módulo de pacientes (`/pacientes`, `/pacientes/[id]`)

## [0.1.0] — inicial

- Setup Next.js 16 + TypeScript + Tailwind + Supabase
- Autenticación con Supabase Auth
- Middleware de protección de rutas
- Schema SQL inicial con RLS
