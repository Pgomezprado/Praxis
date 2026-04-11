# Praxis — Contexto Técnico del Proyecto

## Stack
- **Framework:** Next.js (App Router) + TypeScript
- **UI:** React + Tailwind CSS + lucide-react
- **Auth + DB:** Supabase (RLS habilitado en todas las tablas)
- **IA:** Anthropic Claude (resumen de consultas)
- **Deploy:** praxisapp.cl

---

## Roles de usuario y flujos de trabajo

### Los 3 roles de una clínica

| Rol | Valor en DB | Acceso | Qué hace en el día a día |
|-----|------------|--------|--------------------------|
| Administrador | `admin_clinica` | `/admin/*` | Maneja el negocio: define precios de consultas/aranceles, gestiona equipo, ve finanzas y reportes, configura la clínica |
| Médico | `doctor` | `/medico/*` | Atiende pacientes, escribe historia clínica, genera recetas |
| Recepcionista | `recepcionista` | `/inicio`, `/pacientes`, `/agenda`, `/cobro/*` | Agenda citas, recibe pacientes, cobra consultas |

```typescript
// src/types/database.ts
type UserRole = 'admin_clinica' | 'doctor' | 'recepcionista'
```

### Caso especial: Admin + Doctor (`es_doctor = true`)

En clínicas pequeñas el administrador también atiende pacientes. Cuando `es_doctor = true`:
- Puede acceder a `/medico/*` además de `/admin/*`
- En el MedicoSidebar aparece un botón "Panel de administración" para volver a `/admin`
- **NO cobra desde el panel médico** — el cobro siempre es tarea de recepción/admin

### Flujo de trabajo diario en una clínica

```
RECEPCIONISTA                    MÉDICO                         ADMIN
─────────────                    ──────                         ─────
1. Abre agenda del día           1. Ve su agenda                1. Ve dashboard
2. Confirma citas pendientes     2. Llama al paciente           2. Revisa finanzas
3. Registra pacientes nuevos     3. Abre ficha clínica          3. Configura horarios
4. Agenda citas por teléfono     4. Escribe consulta/historia   4. Gestiona equipo
5. Cobra citas completadas ←──── 5. Marca cita como completada
6. Entrega boleta/comprobante    6. Genera receta si necesario
```

### Quién hace qué — reglas de negocio

| Acción | Recepcionista | Médico | Admin |
|--------|:---:|:---:|:---:|
| Agendar citas | Si | No | Si |
| Confirmar/cancelar citas | Si | Si (las suyas) | Si |
| Completar cita (marcar atendida) | No | Si | Si (si es_doctor) |
| **Cobrar consulta** | **Si** | **No** | **Si** |
| Crear/editar paciente | Si | No | Si |
| Escribir historia clínica | No | Si | Si (si es_doctor) |
| Generar receta | No | Si | Si (si es_doctor) |
| Eliminar cita | Si | No | Si |
| Definir precios/aranceles | No | No | Si |
| Ver reportes/finanzas | No | No | Si |
| Configurar horarios | No | No | Si |

### Regla de oro para el desarrollo

> **El médico atiende, la recepción cobra.** Nunca mostrar botones de cobro en el panel médico (`esDoctor=true`).
> El cobro vive en `/cobro/*` dentro del grupo `(dashboard)` — layout de recepcionista/admin.
> Los redirects de error en cobro apuntan a `/agenda/hoy` (ruta de recepcionista).

### Regla sobre `esDoctor` en UI

- `esDoctor=true` → mostrar accesos clínicos: historia clínica, receta, completar cita
- `esDoctor=false` → mostrar accesos operativos: cobrar, editar paciente, ficha administrativa
- **Nunca ocultar botones de navegación** por `esDoctor` (ej: sidebar, menús)

---

## Estructura de rutas

```
/                          → Landing page (pública)
/login                     → Acceso al sistema
/activar-cuenta            → Activación de cuenta con invite token
/agendar                   → Portal paciente — buscar médico (sin auth)
/agendar/[medicoId]        → Portal paciente — elegir hora
/agendar/confirmar         → Portal paciente — datos del paciente
/agendar/exito             → Portal paciente — confirmación

/inicio                    → Dashboard secretaria
/pacientes                 → Listado pacientes (secretaria)
/pacientes/[id]            → Ficha individual (secretaria)
/agenda                    → Resumen agenda (secretaria)
/agenda/hoy                → Agenda del día (secretaria)
/agenda/semana             → Agenda semanal (secretaria)

/medico/inicio             → Dashboard médico
/medico/agenda             → Resumen agenda (médico)
/medico/agenda/semana      → Agenda semanal (médico)
/medico/citas              → Gestión de citas (médico)
/medico/pacientes/[id]     → Ficha paciente (médico) — acepta ?cita=[id]

/admin                     → Dashboard administrador
/admin/medicos             → Gestión médicos
/admin/secretarias         → Gestión recepcionistas
/admin/pacientes           → Listado pacientes
/admin/pacientes/importar  → Importación CSV
/admin/especialidades      → Gestión especialidades
/admin/horarios            → Configuración horarios por médico
/admin/agenda              → Agenda completa
/admin/configuracion       → Configuración de la clínica

/superadmin                → Panel superadmin (público, sin sidebar)
```

---

## Grupos de rutas (App Router)

```
src/app/
  (public)/        → Sin auth: landing, agendar, activar-cuenta, superadmin
  (auth)/          → Login
  (dashboard)/     → Recepcionista — layout con sidebar
  (medico)/        → Médico — layout con MedicoSidebar
  (admin)/         → Admin clínica — layout con AdminSidebar
  api/             → API routes
    auth/          → Auth callback
    activar-cuenta/
    usuarios/
    pacientes/
    citas/
    consultas/
    horarios/
    clinica/
    onboarding/
    demo-request/
    ai/resumen/    → Resumen IA de consultas (Anthropic)
    public/        → Sin auth: medicos, disponibilidad, confirmar
```

---

## Estructura de componentes

```
src/components/
  ui/              → Design system: Button, Input, Card, Badge, Avatar
  layout/          → Header, Sidebar (secretaria), MedicoSidebar
  landing/         → Navbar, HeroSection, ComoFunciona, ParaQuienEs, CtaDemo, Footer
  agendamiento/    → BuscarMedicoClient, CalendarioDisponibilidad, ElegirHoraClient,
                     MedicoCard, ResumenCita, StepIndicator
  admin/           → AdminSidebar, MedicosClient, SecretariasClient, HorariosClient,
                     EspecialidadesClient, PacientesAdminClient, DrawerMedico,
                     DrawerPaciente, DrawerSecretaria, ImportarPacientesClient,
                     ConfiguracionClient, ModalEspecialidad
  medico/          → MedicoDashboard, PacienteConsultaClient
  secretaria/      → SecretariaDashboard, AgendaHoyClient, AgendaSemanaClient,
                     CitaCard, ListaDia, ModalNuevaCita, BuscadorPaciente, AgendaToolbar
  paciente/        → AlergiasBadges, HistorialCitas, HistorialConsultas, ResumenIA
  consulta/        → FormConsulta
```

---

## Archivos clave en src/lib/

```
lib/
  agendamiento.ts          → Lógica de slots y disponibilidad
  mock-data.ts             → Datos de prueba (HorarioSemanal type aquí)
  anthropic/client.ts      → Singleton Anthropic SDK
  email/confirmacion.ts    → Templates de email
  queries/agenda.ts        → Queries pre-buildadas para agenda
  supabase/client.ts       → Cliente browser
  supabase/server.ts       → Cliente servidor (cookies)
  supabase/admin.ts        → Cliente admin (service role)
  utils/formatters.ts      → RUT, fechas, edad
  utils/mapCita.ts         → Mapeo de datos de citas
```

---

## Middleware

```typescript
// middleware.ts — rutas protegidas y redirección por rol
// Rutas públicas: /, /agendar/*, /activar-cuenta, /auth/*, /superadmin, /api/*
// Sin sesión + ruta protegida → /login
// Con sesión + en /login:
//   doctor        → /medico/inicio
//   admin_clinica → /admin
//   recepcionista → /inicio
```

**Importante:** usa `getUser()` (no `getSession()`) — valida el JWT contra el servidor de auth, previniendo sesiones falsificadas.

---

## Supabase — reglas críticas

- **NUNCA DELETE** en tablas médicas — solo soft delete con `activo = false`
- **audit_log** es INSERT-only via trigger de PostgreSQL
- **RLS** habilitado en todas las tablas — cada usuario ve solo su clínica
- Clientes Supabase **sin** el generic `<Database>` — causa errores `never`
- Resultados de queries requieren type assertion explícita: `data as MiTipo[] | null`
- `clinica_id` del usuario viene siempre del JWT/sesión, nunca del request del cliente

---

## Migraciones (supabase/migrations/)

| Archivo | Contenido |
|---------|-----------|
| `001_initial.sql` | Esquema completo + RLS + triggers |
| `002_seed_piloto.sql` | Datos clínica demo (slug: `demo`) |
| `003_fix_rls.sql` | Ajustes RLS |
| `004_add_pacientes_fields.sql` | Campos adicionales pacientes |
| `005_add_usuarios_fields.sql` | Campos adicionales usuarios |
| `006_create_citas.sql` | Tabla citas |
| `007_create_horarios.sql` | Tabla horarios (JSONB por médico) |
| `008_clinica_config.sql` | Configuración de clínica |
| `009_es_doctor.sql` | Función helper is_doctor() |
| `seed_doctor_prueba.sql` | Usuario doctor de prueba |
| `seed_secretaria_prueba.sql` | Usuario secretaria de prueba |

---

## Identidad visual

```css
/* Paleta (globals.css) */
--color-primary:       #1D4ED8;
--color-primary-light: #3B82F6;
--color-accent:        #0EA5E9;
--color-bg:            #F8FAFC;
--color-surface:       #FFFFFF;
--color-text:          #0F172A;
--color-muted:         #64748B;
--color-success:       #10B981;
--color-warning:       #F59E0B;
--color-danger:        #EF4444;
```

- Fuente: **Inter** (Google Fonts)
- Bordes: `rounded-xl` como estándar
- Sombras: `shadow-sm`, `shadow-md`
- Fondo de página: `bg-slate-50`
- Estilo: limpio, profesional, minimalista médico (ref: Linear, Elation Health)

---

## Reglas de desarrollo

1. **Todo en español (Chile)** — labels, mensajes de error, comentarios de usuario
2. **Solo Tailwind CSS** — sin estilos inline ni CSS custom salvo variables en globals.css
3. **TypeScript estricto** — todos los componentes con props tipadas
4. **Mobile-first** — diseñar para móvil, expandir a desktop
5. **Íconos:** solo `lucide-react`
6. **Sin UC Christus** — producto genérico SaaS, clínica identificada por `CLINICA_SLUG` env var
7. **API keys nunca en cliente** — todo acceso a Supabase admin y Anthropic en Server Components o API routes
8. **Un commit por feature:** `feat:`, `fix:`, `refactor:` según corresponda

---

## Variables de entorno requeridas

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
CLINICA_SLUG=demo          # identifica la clínica activa
RESEND_API_KEY=            # emails transaccionales
```
